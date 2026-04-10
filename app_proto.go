package main

import (
	"fmt"
	"path/filepath"

	"grpc-nimbus/internal/rpc"
	"grpc-nimbus/internal/storage"
)

// LoadedState bundles the currently loaded descriptor info for frontend restoration.
type LoadedState struct {
	Services    []rpc.ServiceInfo `json:"services"`
	LoadedPaths []string          `json:"loadedPaths"`
	LoadMode    string            `json:"loadMode"`   // "protoset", "proto", "reflection", or ""
	LastTarget  string            `json:"lastTarget"` // last-used connection target
	LastTLS     string            `json:"lastTLS"`
}

// LoadProtosets parses the given protoset file paths and returns the service tree.
func (a *App) LoadProtosets(paths []string) ([]rpc.ServiceInfo, error) {
	pd, err := rpc.LoadProtosets(paths)
	if err != nil {
		return nil, err
	}
	a.mu.Lock()
	if a.protoset != nil {
		a.protoset.Close()
	}
	a.protoset = pd
	a.loadedPaths = paths
	a.loadMode = "protoset"
	a.loadImportPaths = nil
	a.mu.Unlock()

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = "protoset"
		s.ProtosetPaths = paths
		s.ProtoFilePaths = nil
		s.ProtoImportPaths = nil
	})
	return pd.Services(), nil
}

// LoadProtoFiles parses .proto source files with optional import paths.
// If importPaths is empty and the file paths are absolute, the parent directories
// of the proto files are used as import paths automatically.
func (a *App) LoadProtoFiles(importPaths, protoFiles []string) ([]rpc.ServiceInfo, error) {
	if len(importPaths) == 0 {
		seen := map[string]bool{}
		for _, f := range protoFiles {
			if filepath.IsAbs(f) {
				dir := filepath.Dir(f)
				if !seen[dir] {
					seen[dir] = true
					importPaths = append(importPaths, dir)
				}
			}
		}
	}
	pd, err := rpc.LoadProtoFiles(importPaths, protoFiles)
	if err != nil {
		return nil, err
	}
	a.mu.Lock()
	if a.protoset != nil {
		a.protoset.Close()
	}
	a.protoset = pd
	a.loadedPaths = protoFiles
	a.loadImportPaths = importPaths
	a.loadMode = "proto"
	a.mu.Unlock()

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = "proto"
		s.ProtoFilePaths = protoFiles
		s.ProtoImportPaths = importPaths
		s.ProtosetPaths = nil
	})
	return pd.Services(), nil
}

// LoadViaReflection queries the connected server's reflection API.
// Note: reflection-loaded descriptors are NOT persisted since they require a
// live server connection which may not be available at next startup.
func (a *App) LoadViaReflection() ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	conn := a.conn
	a.mu.Unlock()
	if conn == nil {
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	pd, err := rpc.LoadViaReflection(a.ctx, conn.ClientConn())
	if err != nil {
		return nil, err
	}
	a.mu.Lock()
	if a.protoset != nil {
		a.protoset.Close()
	}
	a.protoset = pd
	a.loadedPaths = nil
	a.loadMode = "reflection"
	a.loadImportPaths = nil
	a.mu.Unlock()

	// Clear any previously saved proto paths since reflection doesn't persist.
	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = ""
		s.ProtosetPaths = nil
		s.ProtoFilePaths = nil
		s.ProtoImportPaths = nil
	})
	return pd.Services(), nil
}

// GetLoadedState returns the currently loaded descriptor state plus saved connection
// settings so the frontend can restore UI state on startup.
func (a *App) GetLoadedState() (*LoadedState, error) {
	a.mu.Lock()
	pd := a.protoset
	paths := a.loadedPaths
	mode := a.loadMode
	a.mu.Unlock()

	state := &LoadedState{LoadMode: mode, LoadedPaths: paths}

	if pd != nil {
		state.Services = pd.Services()
	}

	if a.settings != nil {
		if saved, err := a.settings.Load(); err == nil && saved != nil {
			state.LastTarget = saved.LastTarget
			state.LastTLS = saved.LastTLS
		}
	}
	return state, nil
}

// ClearLoadedProtos discards all loaded descriptors and removes saved paths,
// returning the app to a clean state as if it were freshly installed.
func (a *App) ClearLoadedProtos() {
	a.mu.Lock()
	if a.protoset != nil {
		a.protoset.Close()
	}
	a.protoset = nil
	a.loadedPaths = nil
	a.loadMode = ""
	a.loadImportPaths = nil
	a.mu.Unlock()

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = ""
		s.ProtosetPaths = nil
		s.ProtoFilePaths = nil
		s.ProtoImportPaths = nil
	})
}

// ReloadProtos re-reads all currently saved proto/protoset files from disk.
// Use this when a .protoset has been regenerated at the same path — the
// in-memory descriptor is rebuilt from the latest file content.
func (a *App) ReloadProtos() ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	paths := append([]string(nil), a.loadedPaths...)
	importPaths := append([]string(nil), a.loadImportPaths...)
	mode := a.loadMode
	a.mu.Unlock()

	switch mode {
	case "protoset":
		if len(paths) == 0 {
			return nil, fmt.Errorf("no protoset files to reload")
		}
		return a.LoadProtosets(paths)
	case "proto":
		if len(paths) == 0 {
			return nil, fmt.Errorf("no proto files to reload")
		}
		return a.LoadProtoFiles(importPaths, paths)
	default:
		return nil, fmt.Errorf("nothing to reload (mode: %q)", mode)
	}
}

// RemoveProtoPath removes one path from the loaded set and reloads the rest.
// If the removed path was the only one, this is equivalent to ClearLoadedProtos.
func (a *App) RemoveProtoPath(path string) ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	var remaining []string
	for _, p := range a.loadedPaths {
		if p != path {
			remaining = append(remaining, p)
		}
	}
	importPaths := append([]string(nil), a.loadImportPaths...)
	mode := a.loadMode
	a.mu.Unlock()

	if len(remaining) == 0 {
		a.ClearLoadedProtos()
		return []rpc.ServiceInfo{}, nil
	}

	switch mode {
	case "protoset":
		return a.LoadProtosets(remaining)
	case "proto":
		return a.LoadProtoFiles(importPaths, remaining)
	default:
		return nil, fmt.Errorf("cannot remove path in mode %q", mode)
	}
}

// GetServices returns the service/method tree from the loaded descriptor.
func (a *App) GetServices() ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	pd := a.protoset
	a.mu.Unlock()
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded")
	}
	return pd.Services(), nil
}

// GetRequestSchema returns the field schemas for the input message of a method.
func (a *App) GetRequestSchema(methodPath string) ([]rpc.FieldSchema, error) {
	a.mu.Lock()
	pd := a.protoset
	a.mu.Unlock()
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded")
	}
	return pd.GetRequestSchema(methodPath)
}
