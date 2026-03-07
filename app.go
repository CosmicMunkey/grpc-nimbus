package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	grpcinternal "grpc-nimbus/internal/grpc"
	"grpc-nimbus/internal/storage"
)

// App is the main Wails application struct. All exported methods are callable
// from the frontend via generated TypeScript bindings.
type App struct {
	ctx context.Context

	mu         sync.Mutex
	conn       *grpcinternal.Connection
	protoset   *grpcinternal.ProtosetDescriptor
	store      *storage.Store
	envStore   *storage.EnvStore
	histStore  *storage.HistoryStore
	settings   *storage.SettingsStore
	activeEnv  *storage.Environment

	// loadedPaths and loadMode track the most recently loaded descriptor source
	// so they can be persisted and restored across restarts.
	loadedPaths     []string
	loadMode        string // "protoset", "proto", or "reflection"
	loadImportPaths []string // only used when loadMode == "proto"

	// streamCancel cancels the active streaming invocation, if any.
	streamCancel context.CancelFunc
}

// NewApp creates the App instance. Called once at startup.
func NewApp() *App {
	return &App{}
}

// startup is called by Wails when the application starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	var err error

	a.store, err = storage.NewStore()
	if err != nil {
		fmt.Printf("warning: collection store unavailable: %v\n", err)
	}
	a.envStore, err = storage.NewEnvStore()
	if err != nil {
		fmt.Printf("warning: environment store unavailable: %v\n", err)
	}
	a.histStore, err = storage.NewHistoryStore()
	if err != nil {
		fmt.Printf("warning: history store unavailable: %v\n", err)
	}
	a.settings, err = storage.NewSettingsStore()
	if err != nil {
		fmt.Printf("warning: settings store unavailable: %v\n", err)
		return
	}

	// Auto-restore last loaded proto descriptor source.
	saved, err := a.settings.Load()
	if err != nil || saved == nil {
		return
	}
	switch saved.ProtoLoadMode {
	case "protoset":
		if len(saved.ProtosetPaths) > 0 {
			pd, err := grpcinternal.LoadProtosets(saved.ProtosetPaths)
			if err == nil {
				a.mu.Lock()
				a.protoset = pd
				a.loadedPaths = saved.ProtosetPaths
				a.loadMode = "protoset"
				a.mu.Unlock()
			} else {
				fmt.Printf("warning: auto-restore protoset failed: %v\n", err)
			}
		}
	case "proto":
		if len(saved.ProtoFilePaths) > 0 {
			pd, err := grpcinternal.LoadProtoFiles(saved.ProtoImportPaths, saved.ProtoFilePaths)
			if err == nil {
				a.mu.Lock()
				a.protoset = pd
				a.loadedPaths = saved.ProtoFilePaths
				a.loadImportPaths = saved.ProtoImportPaths
				a.loadMode = "proto"
				a.mu.Unlock()
			} else {
				fmt.Printf("warning: auto-restore proto files failed: %v\n", err)
			}
		}
	}
}

// ─── Connection ──────────────────────────────────────────────────────────────

// Connect dials the gRPC server with the given configuration.
func (a *App) Connect(cfg grpcinternal.ConnectionConfig) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.conn != nil {
		_ = a.conn.Close()
	}
	conn, err := grpcinternal.NewConnection(a.ctx, cfg)
	if err != nil {
		return err
	}
	a.conn = conn

	// Persist the connection target for next launch.
	go a.saveSettings(func(s *storage.AppSettings) {
		s.LastTarget = cfg.Target
		s.LastTLS = string(cfg.TLS)
	})
	return nil
}

// Disconnect closes the current gRPC connection.
func (a *App) Disconnect() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.conn != nil {
		_ = a.conn.Close()
		a.conn = nil
	}
}

// GetConnectionState returns the live gRPC connectivity state.
// Returns "disconnected" when no connection has been established, otherwise
// one of: "idle", "connecting", "ready", "transient_failure", "shutdown".
func (a *App) GetConnectionState() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.conn == nil {
		return "disconnected"
	}
	return a.conn.GetState()
}

// ─── Descriptor Sources ───────────────────────────────────────────────────────

// LoadProtosets parses the given protoset file paths and returns the service tree.
func (a *App) LoadProtosets(paths []string) ([]grpcinternal.ServiceInfo, error) {
	pd, err := grpcinternal.LoadProtosets(paths)
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
func (a *App) LoadProtoFiles(importPaths, protoFiles []string) ([]grpcinternal.ServiceInfo, error) {
	pd, err := grpcinternal.LoadProtoFiles(importPaths, protoFiles)
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
func (a *App) LoadViaReflection() ([]grpcinternal.ServiceInfo, error) {
	a.mu.Lock()
	conn := a.conn
	a.mu.Unlock()
	if conn == nil {
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	pd, err := grpcinternal.LoadViaReflection(a.ctx, conn.ClientConn())
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

// LoadedState bundles the currently loaded descriptor info for frontend restoration.
type LoadedState struct {
	Services    []grpcinternal.ServiceInfo `json:"services"`
	LoadedPaths []string                   `json:"loadedPaths"`
	LoadMode    string                     `json:"loadMode"`   // "protoset", "proto", "reflection", or ""
	LastTarget  string                     `json:"lastTarget"` // last-used connection target
	LastTLS     string                     `json:"lastTLS"`
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

// ─── User settings ────────────────────────────────────────────────────────────

// UserSettings holds user-configurable preferences exposed to the frontend.
type UserSettings struct {
	ConfirmDeletes bool `json:"confirmDeletes"`
}

// GetUserSettings returns the current user preference settings.
func (a *App) GetUserSettings() UserSettings {
	defaults := UserSettings{ConfirmDeletes: true}
	if a.settings == nil {
		return defaults
	}
	saved, err := a.settings.Load()
	if err != nil || saved == nil {
		return defaults
	}
	if saved.ConfirmDeletes == nil {
		return defaults
	}
	return UserSettings{ConfirmDeletes: *saved.ConfirmDeletes}
}

// SaveUserSettings persists user preference settings.
func (a *App) SaveUserSettings(s UserSettings) {
	go a.saveSettings(func(settings *storage.AppSettings) {
		settings.ConfirmDeletes = &s.ConfirmDeletes
	})
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
func (a *App) ReloadProtos() ([]grpcinternal.ServiceInfo, error) {
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
func (a *App) RemoveProtoPath(path string) ([]grpcinternal.ServiceInfo, error) {
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
		return []grpcinternal.ServiceInfo{}, nil
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


func (a *App) GetServices() ([]grpcinternal.ServiceInfo, error) {
	a.mu.Lock()
	pd := a.protoset
	a.mu.Unlock()
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded")
	}
	return pd.Services(), nil
}

// GetRequestSchema returns the field schemas for the input message of a method.
func (a *App) GetRequestSchema(methodPath string) ([]grpcinternal.FieldSchema, error) {
	a.mu.Lock()
	pd := a.protoset
	a.mu.Unlock()
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded")
	}
	return pd.GetRequestSchema(methodPath)
}

// ─── Invocation ───────────────────────────────────────────────────────────────

// InvokeUnary executes a unary or server-streaming RPC synchronously.
// For streaming methods, all response messages are concatenated in ResponseJSON
// separated by newlines. Use InvokeStream for live events.
func (a *App) InvokeUnary(req grpcinternal.InvokeRequest) (*grpcinternal.InvokeResponse, error) {
	a.mu.Lock()
	conn := a.conn
	pd := a.protoset
	env := a.activeEnv
	a.mu.Unlock()

	if conn == nil {
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded — load a protoset or use reflection")
	}

	// Apply environment variable interpolation.
	req = interpolateRequest(req, env)

	resp, err := grpcinternal.InvokeUnary(a.ctx, conn, pd, req)
	if err != nil {
		return nil, err
	}

	// Record to history.
	if a.histStore != nil {
		_ = a.histStore.Add(storage.HistoryEntry{
			ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
			MethodPath:  req.MethodPath,
			RequestJSON: req.RequestJSON,
			Metadata:    req.Metadata,
			Response:    resp,
			InvokedAt:   time.Now(),
		})
	}
	return resp, nil
}

// InvokeStream starts a streaming RPC and emits Wails events for each message.
// Events are emitted on the channel "stream:event" with a StreamEvent payload.
// Call CancelStream to abort.
func (a *App) InvokeStream(req grpcinternal.InvokeRequest) error {
	a.mu.Lock()
	conn := a.conn
	pd := a.protoset
	env := a.activeEnv
	// Cancel any running stream first.
	if a.streamCancel != nil {
		a.streamCancel()
	}
	ctx, cancel := context.WithCancel(a.ctx)
	a.streamCancel = cancel
	a.mu.Unlock()

	if conn == nil {
		cancel()
		return fmt.Errorf("not connected")
	}
	if pd == nil {
		cancel()
		return fmt.Errorf("no descriptor loaded")
	}

	req = interpolateRequest(req, env)

	go func() {
		defer cancel()
		err := grpcinternal.InvokeStream(ctx, conn, pd, req, func(evt grpcinternal.StreamEvent) {
			runtime.EventsEmit(a.ctx, "stream:event", evt)
		})
		if err != nil {
			runtime.EventsEmit(a.ctx, "stream:event", grpcinternal.StreamEvent{
				Type:  "error",
				Error: err.Error(),
			})
		}
		runtime.EventsEmit(a.ctx, "stream:done", nil)
	}()
	return nil
}

// CancelStream aborts the currently running streaming RPC.
func (a *App) CancelStream() {
	a.mu.Lock()
	cancel := a.streamCancel
	a.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

// ─── Collections ─────────────────────────────────────────────────────────────

// ListCollections returns all saved request collections.
func (a *App) ListCollections() ([]storage.Collection, error) {
	if a.store == nil {
		return nil, nil
	}
	return a.store.ListCollections()
}

// SaveCollection creates or updates a collection on disk.
func (a *App) SaveCollection(col storage.Collection) error {
	if a.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	return a.store.SaveCollection(col)
}

// DeleteCollection removes a collection by ID.
func (a *App) DeleteCollection(id string) error {
	if a.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	return a.store.DeleteCollection(id)
}

// GetCollection returns a single collection by ID.
func (a *App) GetCollection(id string) (*storage.Collection, error) {
	if a.store == nil {
		return nil, fmt.Errorf("collection store unavailable")
	}
	return a.store.GetCollection(id)
}

// ExportCollection writes a portable, self-contained collection bundle to destPath.
// Protoset files referenced by the collection are embedded in the output so the
// export can be shared with colleagues on different machines.
func (a *App) ExportCollection(id, destPath string) error {
	if a.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	return a.store.ExportPortable(id, destPath)
}

// ImportCollection reads a collection JSON from srcPath and saves it with a new ID.
func (a *App) ImportCollection(srcPath string) (*storage.Collection, error) {
	if a.store == nil {
		return nil, fmt.Errorf("collection store unavailable")
	}
	return a.store.ImportCollection(srcPath)
}

// ─── Environments ─────────────────────────────────────────────────────────────

// ListEnvironments returns all stored environments.
func (a *App) ListEnvironments() ([]storage.Environment, error) {
	if a.envStore == nil {
		return nil, nil
	}
	return a.envStore.ListEnvironments()
}

// SaveEnvironment creates or updates an environment.
func (a *App) SaveEnvironment(env storage.Environment) error {
	if a.envStore == nil {
		return fmt.Errorf("environment store unavailable")
	}
	return a.envStore.SaveEnvironment(env)
}

// DeleteEnvironment removes an environment by ID.
func (a *App) DeleteEnvironment(id string) error {
	if a.envStore == nil {
		return fmt.Errorf("environment store unavailable")
	}
	return a.envStore.DeleteEnvironment(id)
}

// SetActiveEnvironment sets the active environment by ID (empty string = no env).
func (a *App) SetActiveEnvironment(id string) error {
	if id == "" {
		a.mu.Lock()
		a.activeEnv = nil
		a.mu.Unlock()
		return nil
	}
	if a.envStore == nil {
		return fmt.Errorf("environment store unavailable")
	}
	env, err := a.envStore.GetEnvironment(id)
	if err != nil {
		return err
	}
	a.mu.Lock()
	a.activeEnv = env
	a.mu.Unlock()
	return nil
}

// ─── History ─────────────────────────────────────────────────────────────────

// GetHistory returns the invocation history for a given method path.
func (a *App) GetHistory(methodPath string) ([]storage.HistoryEntry, error) {
	if a.histStore == nil {
		return nil, nil
	}
	return a.histStore.GetHistory(methodPath)
}

// ClearHistory removes all history for the given method path.
func (a *App) ClearHistory(methodPath string) error {
	if a.histStore == nil {
		return fmt.Errorf("history store unavailable")
	}
	return a.histStore.ClearHistory(methodPath)
}

// ─── Native File Dialogs ──────────────────────────────────────────────────────

// PickProtosetFiles opens a native multi-file dialog filtered for .protoset files.
// Returns selected file paths (empty slice if cancelled).
func (a *App) PickProtosetFiles() ([]string, error) {
	paths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Protoset Files",
		Filters: []runtime.FileFilter{
			{DisplayName: "Protoset Files (*.protoset;*.pb;*.bin)", Pattern: "*.protoset;*.pb;*.bin"},
			{DisplayName: "All Files", Pattern: "*"},
		},
	})
	if err != nil {
		return nil, err
	}
	return paths, nil
}

// PickProtoFiles opens a native multi-file dialog filtered for .proto files.
func (a *App) PickProtoFiles() ([]string, error) {
	paths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select Proto Files",
		Filters: []runtime.FileFilter{{DisplayName: "Proto Files (*.proto)", Pattern: "*.proto"}},
	})
	if err != nil {
		return nil, err
	}
	return paths, nil
}

// PickImportFile opens a native file dialog to select a collection JSON file for import.
func (a *App) PickImportFile() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Import Collection",
		Filters: []runtime.FileFilter{{DisplayName: "JSON Files (*.json)", Pattern: "*.json"}},
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// PickExportPath opens a native save dialog to choose a destination for exporting a collection.
func (a *App) PickExportPath(defaultName string) (string, error) {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Export Collection",
		DefaultFilename: defaultName,
		Filters:         []runtime.FileFilter{{DisplayName: "JSON Files (*.json)", Pattern: "*.json"}},
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// TriggerMenuImport emits an event that tells the frontend to start an import flow.
// Called from the native File menu.
func (a *App) TriggerMenuImport() {
	runtime.EventsEmit(a.ctx, "menu:importCollection")
}

// TriggerMenuExport emits an event that tells the frontend to open the export picker.
// Called from the native File menu.
func (a *App) TriggerMenuExport() {
	runtime.EventsEmit(a.ctx, "menu:exportCollection")
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// saveSettings merges a settings mutation into the persisted settings file.
// Safe to call from goroutines (goroutine-level serialization is acceptable
// since saves are infrequent and SettingsStore.Save is atomic via rename).
func (a *App) saveSettings(mutate func(*storage.AppSettings)) {
	if a.settings == nil {
		return
	}
	current, err := a.settings.Load()
	if err != nil || current == nil {
		current = &storage.AppSettings{}
	}
	mutate(current)
	if err := a.settings.Save(current); err != nil {
		fmt.Printf("warning: could not save settings: %v\n", err)
	}
}

func interpolateRequest(req grpcinternal.InvokeRequest, env *storage.Environment) grpcinternal.InvokeRequest {
	if env == nil {
		return req
	}
	vars := env.Variables

	// Apply variable substitution to request body and per-request metadata.
	if len(vars) > 0 {
		req.RequestJSON = storage.Interpolate(req.RequestJSON, vars)
		for i := range req.Metadata {
			req.Metadata[i].Key = storage.Interpolate(req.Metadata[i].Key, vars)
			req.Metadata[i].Value = storage.Interpolate(req.Metadata[i].Value, vars)
		}
	}

	// Prepend environment-level headers so per-request metadata can override.
	if len(env.Headers) > 0 {
		envMeta := make([]grpcinternal.MetadataEntry, 0, len(env.Headers))
		for _, h := range env.Headers {
			if h.Key == "" {
				continue
			}
			envMeta = append(envMeta, grpcinternal.MetadataEntry{
				Key:   storage.Interpolate(h.Key, vars),
				Value: storage.Interpolate(h.Value, vars),
			})
		}
		req.Metadata = append(envMeta, req.Metadata...)
	}

	return req
}


