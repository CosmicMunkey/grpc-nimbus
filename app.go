package main

import (
	"context"

	"github.com/CosmicMunkey/grpc-nimbus/internal/backend"
	"github.com/CosmicMunkey/grpc-nimbus/internal/logger"
	"github.com/CosmicMunkey/grpc-nimbus/internal/rpc"
	"github.com/CosmicMunkey/grpc-nimbus/internal/storage"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App is the monolithic delegate that Wails binds to the frontend.
// All logic has been migrated to internal/backend/Engine.
type App struct {
	ctx    context.Context
	engine *backend.Engine
}

func NewApp() *App {
	return &App{
		engine: backend.NewEngine(),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	logger.Default.OnEntry = func(entry logger.Entry) {
		runtime.EventsEmit(a.ctx, "log:entry", entry)
	}
	if err := a.engine.Startup(ctx); err != nil {
		logger.Default.Errorf("startup failed: %v", err)
	}
}

func (a *App) shutdown(ctx context.Context) {
	a.engine.Shutdown()
}

func (a *App) TriggerMenuImport() { runtime.EventsEmit(a.ctx, "menu:importCollection") }
func (a *App) TriggerMenuExport() { runtime.EventsEmit(a.ctx, "menu:exportCollection") }
func (a *App) TriggerMenuZoomIn() { runtime.EventsEmit(a.ctx, "menu:zoomIn") }
func (a *App) TriggerMenuZoomOut() { runtime.EventsEmit(a.ctx, "menu:zoomOut") }
func (a *App) TriggerMenuZoomReset() { runtime.EventsEmit(a.ctx, "menu:zoomReset") }
func (a *App) TriggerMenuNewTab() { runtime.EventsEmit(a.ctx, "menu:newTab") }
func (a *App) TriggerMenuCloseTab() { runtime.EventsEmit(a.ctx, "menu:closeTab") }
func (a *App) TriggerMenuCloseAllTabs() { runtime.EventsEmit(a.ctx, "menu:closeAllTabs") }
func (a *App) TriggerMenuNextTab() { runtime.EventsEmit(a.ctx, "menu:nextTab") }
func (a *App) TriggerMenuPrevTab() { runtime.EventsEmit(a.ctx, "menu:prevTab") }
func (a *App) TriggerMenuToggleDebugPane() { runtime.EventsEmit(a.ctx, "menu:toggleDebugPane") }
func (a *App) TriggerMenuHelp() { runtime.EventsEmit(a.ctx, "menu:help") }
func (a *App) TriggerMenuAbout() { runtime.EventsEmit(a.ctx, "menu:about") }

func (a *App) SaveWindowState(ctx context.Context) {
	width, height := runtime.WindowGetSize(ctx)
	x, y := runtime.WindowGetPosition(ctx)
	a.engine.SaveWindowState(width, height, x, y)
}

// PickProtosetFiles opens a native multi-file dialog filtered for .protoset files.
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

// LoadedState bundles the currently loaded descriptor info for frontend restoration.
type LoadedState struct {
	Services            []rpc.ServiceInfo `json:"services"`
	LoadedPaths         []string          `json:"loadedPaths"`
	LoadedProtosets     []string          `json:"loadedProtosets"`
	LoadedProtoFiles    []string          `json:"loadedProtoFiles"`
	LoadMode            string            `json:"loadMode"`         // "protoset", "proto", "reflection", "mixed", or ""
	ProtoImportPaths    []string          `json:"protoImportPaths"` // effective import paths for loaded .proto files
	LastTarget          string            `json:"lastTarget"`       // last-used connection target
	LastTLS             string            `json:"lastTLS"`
	ActiveEnvironmentID string            `json:"activeEnvironmentId"` // active environment ID (empty = none)
}

func (a *App) GetLoadedState() (*LoadedState, error) {
	saved, mode, paths, protosets, protoFiles, svcs, err := a.engine.GetLoadedState()
	if err != nil {
		return nil, err
	}
	state := &LoadedState{
		LoadMode:         mode,
		LoadedPaths:      paths,
		LoadedProtosets:  protosets,
		LoadedProtoFiles: protoFiles,
		Services:         svcs,
	}
	if saved != nil {
		state.ProtoImportPaths = saved.ProtoImportPaths
		state.LastTarget = saved.LastTarget
		state.LastTLS = saved.LastTLS
		state.ActiveEnvironmentID = saved.ActiveEnvironmentID
	}
	return state, nil
}

func (a *App) Connect(cfg rpc.ConnectionConfig) error {
	return a.engine.Connect(a.ctx, cfg)
}

func (a *App) Disconnect() {
	a.engine.Disconnect()
}

func (a *App) GetConnectionState() string {
	return a.engine.GetConnectionState()
}

func (a *App) ListCollections() ([]storage.Collection, error) {
	return a.engine.ListCollections()
}

func (a *App) SaveCollection(col storage.Collection) error {
	return a.engine.SaveCollection(col)
}

func (a *App) DeleteCollection(id string) error {
	return a.engine.DeleteCollection(id)
}

func (a *App) GetCollection(id string) (*storage.Collection, error) {
	return a.engine.GetCollection(id)
}

func (a *App) ExportCollection(id, destPath string) error {
	return a.engine.ExportCollection(id, destPath)
}

func (a *App) ImportCollection(srcPath string) (*storage.Collection, error) {
	return a.engine.ImportCollection(srcPath)
}

func (a *App) ListEnvironments() ([]storage.Environment, error) {
	return a.engine.ListEnvironments()
}

func (a *App) SaveEnvironment(env storage.Environment) error {
	return a.engine.SaveEnvironment(env)
}

func (a *App) DeleteEnvironment(id string) error {
	return a.engine.DeleteEnvironment(id)
}

func (a *App) SetActiveEnvironment(id string) error {
	return a.engine.SetActiveEnvironment(id)
}

func (a *App) GetHistory(methodPath string) ([]storage.HistoryEntry, error) {
	return a.engine.GetHistory(methodPath)
}

func (a *App) ClearHistory(methodPath string) error {
	return a.engine.ClearHistory(methodPath)
}

func (a *App) GetUserSettings() (*storage.AppSettings, error) {
	return a.engine.GetUserSettings()
}

func (a *App) SaveUserSettings(s storage.AppSettings) error {
	return a.engine.SaveUserSettings(s)
}

func (a *App) LoadProtosets(paths []string) ([]rpc.ServiceInfo, error) {
	return a.engine.LoadProtosets(a.ctx, paths)
}

func (a *App) LoadProtoFiles(importPaths, protoFiles []string) ([]rpc.ServiceInfo, error) {
	return a.engine.LoadProtoFiles(a.ctx, importPaths, protoFiles)
}

func (a *App) LoadViaReflection() ([]rpc.ServiceInfo, error) {
	return a.engine.LoadViaReflection(a.ctx)
}

func (a *App) CancelReflection() {
	a.engine.CancelReflection()
}

func (a *App) ClearLoadedProtos() {
	a.engine.ClearLoadedProtos()
}

func (a *App) ReloadProtos() ([]rpc.ServiceInfo, error) {
	return a.engine.ReloadProtos(a.ctx)
}

func (a *App) RemoveProtoPath(path string) ([]rpc.ServiceInfo, error) {
	return a.engine.RemoveProtoPath(a.ctx, path)
}

func (a *App) GetRequestSchema(methodPath string) ([]rpc.FieldSchema, error) {
	return a.engine.GetRequestSchema(methodPath)
}

func (a *App) InvokeUnary(req rpc.InvokeRequest) (*rpc.InvokeResponse, error) {
	return a.engine.InvokeUnary(a.ctx, req)
}

func (a *App) CancelUnary() {
	a.engine.CancelUnary()
}

func (a *App) CancelStream() {
	a.engine.CancelStream()
}

// ClearLogs clears the in-memory log ring buffer.
func (a *App) ClearLogs() {
	logger.Default.Clear()
}

// GetLogs returns all log entries, optionally filtered by severity.
func (a *App) GetLogs(severity string) []logger.Entry {
	return logger.Default.GetLogs(severity)
}

// GetServices returns the current list of loaded services.
func (a *App) GetServices() ([]rpc.ServiceInfo, error) {
	state, err := a.GetLoadedState()
	if err != nil {
		return nil, err
	}
	return state.Services, nil
}

// PickDirectory opens a native file dialog to select a directory.
func (a *App) PickDirectory() (string, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Directory",
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// InvokeStream executes a streaming RPC and emits messages asynchronously.
func (a *App) InvokeStream(req rpc.InvokeRequest) error {
	return a.engine.InvokeStream(a.ctx, req, func(evt rpc.StreamEvent) {
		runtime.EventsEmit(a.ctx, "stream:event", evt)
	}, func(err error) {
		if err != nil {
			runtime.EventsEmit(a.ctx, "stream:event", rpc.StreamEvent{
				Type:  "error",
				Error: err.Error(),
			})
		}
		runtime.EventsEmit(a.ctx, "stream:done", nil)
	})
}
