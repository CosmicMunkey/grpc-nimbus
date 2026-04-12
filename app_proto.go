package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"grpc-nimbus/internal/rpc"
	"grpc-nimbus/internal/storage"
)

// LoadedState bundles the currently loaded descriptor info for frontend restoration.
type LoadedState struct {
	Services         []rpc.ServiceInfo `json:"services"`
	LoadedPaths      []string          `json:"loadedPaths"`
	LoadedProtosets  []string          `json:"loadedProtosets"`
	LoadedProtoFiles []string          `json:"loadedProtoFiles"`
	LoadMode         string            `json:"loadMode"`         // "protoset", "proto", "reflection", "mixed", or ""
	ProtoImportPaths []string          `json:"protoImportPaths"` // effective import paths for loaded .proto files
	LastTarget       string            `json:"lastTarget"`       // last-used connection target
	LastTLS          string            `json:"lastTLS"`
}

func dedupeStrings(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		if value != "" && !seen[value] {
			seen[value] = true
			out = append(out, value)
		}
	}
	return out
}

func commonDir(paths []string) string {
	if len(paths) == 0 {
		return ""
	}
	common := filepath.Dir(paths[0])
	for _, path := range paths[1:] {
		dir := filepath.Dir(path)
		for !strings.HasPrefix(dir, common+string(filepath.Separator)) && dir != common {
			parent := filepath.Dir(common)
			if parent == common {
				return common
			}
			common = parent
		}
	}
	return common
}

func importFromErrorLine(err error, protoFiles []string) (string, string, bool) {
	msg := err.Error()
	openIdx := strings.Index(msg, ": open ")
	if openIdx == -1 {
		return "", "", false
	}
	prefix := msg[:openIdx]
	parts := strings.Split(prefix, ":")
	if len(parts) < 3 {
		return "", "", false
	}
	lineNo, convErr := strconv.Atoi(parts[len(parts)-2])
	if convErr != nil {
		return "", "", false
	}
	sourceToken := strings.TrimSpace(parts[len(parts)-3])
	var sourcePath string
	for _, file := range protoFiles {
		if filepath.Base(file) == sourceToken || strings.HasSuffix(file, sourceToken) {
			sourcePath = file
			break
		}
	}
	if sourcePath == "" {
		return "", "", false
	}
	data, readErr := os.ReadFile(sourcePath)
	if readErr != nil {
		return "", "", false
	}
	lines := strings.Split(string(data), "\n")
	if lineNo < 1 || lineNo > len(lines) {
		return "", "", false
	}
	line := strings.TrimSpace(lines[lineNo-1])
	const prefixImport = `import "`
	if !strings.HasPrefix(line, prefixImport) {
		return "", "", false
	}
	rest := strings.TrimPrefix(line, prefixImport)
	endIdx := strings.Index(rest, `"`)
	if endIdx == -1 {
		return "", "", false
	}
	return sourcePath, rest[:endIdx], true
}

func importRefsForFile(path string) []string {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	lines := strings.Split(string(data), "\n")
	var refs []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		const prefixImport = `import "`
		if !strings.HasPrefix(line, prefixImport) {
			continue
		}
		rest := strings.TrimPrefix(line, prefixImport)
		endIdx := strings.Index(rest, `"`)
		if endIdx == -1 {
			continue
		}
		refs = append(refs, rest[:endIdx])
	}
	return refs
}

func matchingImportRoot(searchRoot, importRef string, known map[string]bool) (string, bool) {
	suffix := filepath.Clean(filepath.FromSlash(importRef))
	best := ""
	_ = filepath.Walk(searchRoot, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil || info == nil || info.IsDir() {
			return nil
		}
		cleanPath := filepath.Clean(path)
		if !strings.HasSuffix(cleanPath, suffix) {
			return nil
		}
		root := filepath.Clean(strings.TrimSuffix(cleanPath, suffix))
		root = strings.TrimSuffix(root, string(filepath.Separator))
		if root == "" || known[root] {
			return nil
		}
		if best == "" || len(root) < len(best) {
			best = root
		}
		return nil
	})
	if best == "" {
		return "", false
	}
	return best, true
}

func discoverImportPaths(protoFiles, importPaths []string) []string {
	searchRoot := commonDir(protoFiles)
	if searchRoot == "" {
		return nil
	}
	known := map[string]bool{}
	for _, path := range importPaths {
		known[path] = true
	}
	var discovered []string
	for _, file := range protoFiles {
		for _, importRef := range importRefsForFile(file) {
			root, ok := matchingImportRoot(searchRoot, importRef, known)
			if ok {
				known[root] = true
				discovered = append(discovered, root)
			}
		}
	}
	return dedupeStrings(discovered)
}

func inferImportPath(err error, protoFiles, importPaths []string) (string, bool) {
	_, importRef, ok := importFromErrorLine(err, protoFiles)
	if !ok {
		return "", false
	}
	suffix := filepath.Clean(filepath.FromSlash(importRef))
	searchRoot := commonDir(protoFiles)
	if searchRoot == "" {
		return "", false
	}
	known := map[string]bool{}
	for _, path := range importPaths {
		known[path] = true
	}

	best, ok := matchingImportRoot(searchRoot, suffix, known)
	if !ok {
		return "", false
	}
	return best, true
}

func (a *App) currentLoadModeLocked() string {
	count := 0
	if len(a.loadedProtosetPaths) > 0 {
		count++
	}
	if len(a.loadedProtoFiles) > 0 {
		count++
	}
	if a.loadReflection {
		count++
	}
	switch {
	case count == 0:
		return ""
	case count > 1:
		return "mixed"
	case a.loadReflection:
		return "reflection"
	case len(a.loadedProtoFiles) > 0:
		return "proto"
	default:
		return "protoset"
	}
}

func (a *App) combinedLoadedPathsLocked() []string {
	paths := append([]string(nil), a.loadedProtosetPaths...)
	paths = append(paths, a.loadedProtoFiles...)
	return dedupeStrings(paths)
}

func (a *App) rebuildDescriptor(protosets, importPaths, protoFiles []string, withReflection bool, connTarget *rpc.Connection) (*rpc.ProtosetDescriptor, error) {
	var parts []*rpc.ProtosetDescriptor
	if len(protosets) > 0 {
		pd, err := rpc.LoadProtosets(protosets)
		if err != nil {
			return nil, err
		}
		parts = append(parts, pd)
	}
	if len(protoFiles) > 0 {
		pd, err := rpc.LoadProtoFiles(importPaths, protoFiles)
		if err != nil {
			return nil, err
		}
		parts = append(parts, pd)
	}
	if withReflection {
		if connTarget == nil {
			return nil, fmt.Errorf("not connected — call Connect first")
		}
		pd, err := rpc.LoadViaReflection(a.ctx, connTarget.ClientConn())
		if err != nil {
			return nil, err
		}
		parts = append(parts, pd)
	}
	return rpc.MergeDescriptors(parts...), nil
}

func (a *App) storeDescriptorState(pd *rpc.ProtosetDescriptor, protosets, importPaths, protoFiles []string, withReflection bool) {
	a.mu.Lock()
	if a.protoset != nil {
		a.protoset.Close()
	}
	a.protoset = pd
	a.loadedProtosetPaths = append([]string(nil), protosets...)
	a.loadedProtoFiles = append([]string(nil), protoFiles...)
	a.loadImportPaths = append([]string(nil), importPaths...)
	a.loadReflection = withReflection
	a.mu.Unlock()
}

// LoadProtosets parses the given protoset file paths and returns the service tree.
func (a *App) LoadProtosets(paths []string) ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	currentProtosets := append([]string(nil), a.loadedProtosetPaths...)
	importPaths := append([]string(nil), a.loadImportPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	withReflection := a.loadReflection
	conn := a.conn
	a.mu.Unlock()

	allProtosets := dedupeStrings(append(currentProtosets, paths...))
	pd, err := a.rebuildDescriptor(allProtosets, importPaths, protoFiles, withReflection, conn)
	if err != nil {
		return nil, err
	}
	a.storeDescriptorState(pd, allProtosets, importPaths, protoFiles, withReflection)

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = a.currentLoadMode()
		s.ProtosetPaths = allProtosets
		s.ProtoFilePaths = protoFiles
		s.ProtoImportPaths = importPaths
	})
	return pd.Services(), nil
}

// LoadProtoFiles parses .proto source files with optional import paths.
// If importPaths is empty and the file paths are absolute, the parent directories
// of the proto files are used as import paths automatically.
func (a *App) LoadProtoFiles(importPaths, protoFiles []string) ([]rpc.ServiceInfo, error) {
	seen := map[string]bool{}
	mergedImportPaths := make([]string, 0, len(importPaths)+len(protoFiles))
	for _, dir := range importPaths {
		if dir != "" && !seen[dir] {
			seen[dir] = true
			mergedImportPaths = append(mergedImportPaths, dir)
		}
	}
	for _, f := range protoFiles {
		if filepath.IsAbs(f) {
			dir := filepath.Dir(f)
			if !seen[dir] {
				seen[dir] = true
				mergedImportPaths = append(mergedImportPaths, dir)
			}
		}
	}
	importPaths = mergedImportPaths
	importPaths = dedupeStrings(append(importPaths, discoverImportPaths(protoFiles, importPaths)...))
	a.mu.Lock()
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	currentProtoFiles := append([]string(nil), a.loadedProtoFiles...)
	currentImportPaths := append([]string(nil), a.loadImportPaths...)
	withReflection := a.loadReflection
	conn := a.conn
	a.mu.Unlock()

	allProtoFiles := dedupeStrings(append(currentProtoFiles, protoFiles...))
	allImportPaths := dedupeStrings(append(currentImportPaths, importPaths...))
	var (
		pd  *rpc.ProtosetDescriptor
		err error
	)
	for attempts := 0; attempts < 8; attempts++ {
		pd, err = a.rebuildDescriptor(protosets, allImportPaths, allProtoFiles, withReflection, conn)
		if err == nil {
			break
		}
		inferred, ok := inferImportPath(err, allProtoFiles, allImportPaths)
		if !ok {
			return nil, err
		}
		allImportPaths = dedupeStrings(append(allImportPaths, inferred))
	}
	if err != nil {
		return nil, err
	}
	a.storeDescriptorState(pd, protosets, allImportPaths, allProtoFiles, withReflection)

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = a.currentLoadMode()
		s.ProtoFilePaths = allProtoFiles
		s.ProtoImportPaths = allImportPaths
		s.ProtosetPaths = protosets
	})
	return pd.Services(), nil
}

// LoadViaReflection queries the connected server's reflection API.
// Note: reflection-loaded descriptors are NOT persisted since they require a
// live server connection which may not be available at next startup.
func (a *App) LoadViaReflection() ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	conn := a.conn
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	importPaths := append([]string(nil), a.loadImportPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	a.mu.Unlock()
	if conn == nil {
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	pd, err := a.rebuildDescriptor(protosets, importPaths, protoFiles, true, conn)
	if err != nil {
		return nil, err
	}
	a.storeDescriptorState(pd, protosets, importPaths, protoFiles, true)

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = a.currentLoadMode()
		s.ProtosetPaths = protosets
		s.ProtoFilePaths = protoFiles
		s.ProtoImportPaths = importPaths
	})
	return pd.Services(), nil
}

// GetLoadedState returns the currently loaded descriptor state plus saved connection
// settings so the frontend can restore UI state on startup.
func (a *App) GetLoadedState() (*LoadedState, error) {
	a.mu.Lock()
	pd := a.protoset
	paths := a.combinedLoadedPathsLocked()
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	mode := a.currentLoadModeLocked()
	importPaths := append([]string(nil), a.loadImportPaths...)
	a.mu.Unlock()

	state := &LoadedState{
		LoadMode:         mode,
		LoadedPaths:      paths,
		LoadedProtosets:  protosets,
		LoadedProtoFiles: protoFiles,
		ProtoImportPaths: importPaths,
	}

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
	a.loadedProtosetPaths = nil
	a.loadedProtoFiles = nil
	a.loadImportPaths = nil
	a.loadReflection = false
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
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	importPaths := append([]string(nil), a.loadImportPaths...)
	withReflection := a.loadReflection
	conn := a.conn
	a.mu.Unlock()

	if len(protosets) == 0 && len(protoFiles) == 0 && !withReflection {
		return nil, fmt.Errorf("nothing to reload")
	}
	pd, err := a.rebuildDescriptor(protosets, importPaths, protoFiles, withReflection, conn)
	if err != nil {
		return nil, err
	}
	a.storeDescriptorState(pd, protosets, importPaths, protoFiles, withReflection)
	return pd.Services(), nil
}

// RemoveProtoPath removes one path from the loaded set and reloads the rest.
// If the removed path was the only one, this is equivalent to ClearLoadedProtos.
func (a *App) RemoveProtoPath(path string) ([]rpc.ServiceInfo, error) {
	a.mu.Lock()
	protosets := append([]string(nil), a.loadedProtosetPaths...)
	protoFiles := append([]string(nil), a.loadedProtoFiles...)
	importPaths := append([]string(nil), a.loadImportPaths...)
	withReflection := a.loadReflection
	conn := a.conn
	a.mu.Unlock()

	var remainingProtosets []string
	for _, p := range protosets {
		if p != path {
			remainingProtosets = append(remainingProtosets, p)
		}
	}
	var remainingProtoFiles []string
	for _, p := range protoFiles {
		if p != path {
			remainingProtoFiles = append(remainingProtoFiles, p)
		}
	}

	if len(remainingProtosets) == 0 && len(remainingProtoFiles) == 0 && !withReflection {
		a.ClearLoadedProtos()
		return []rpc.ServiceInfo{}, nil
	}
	pd, err := a.rebuildDescriptor(remainingProtosets, importPaths, remainingProtoFiles, withReflection, conn)
	if err != nil {
		return nil, err
	}
	a.storeDescriptorState(pd, remainingProtosets, importPaths, remainingProtoFiles, withReflection)

	go a.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = a.currentLoadMode()
		s.ProtosetPaths = remainingProtosets
		s.ProtoFilePaths = remainingProtoFiles
		s.ProtoImportPaths = importPaths
	})
	return pd.Services(), nil
}

func (a *App) currentLoadMode() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.currentLoadModeLocked()
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
