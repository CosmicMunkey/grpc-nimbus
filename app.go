package main

import (
	"context"
	"fmt"
	"io"
	"os"
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
	activeEnv  *storage.Environment

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
	a.mu.Unlock()
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
	a.mu.Unlock()
	return pd.Services(), nil
}

// LoadViaReflection queries the connected server's reflection API.
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
	a.mu.Unlock()
	return pd.Services(), nil
}

// GetServices returns the service/method tree from the currently loaded descriptor.
func (a *App) GetServices() ([]grpcinternal.ServiceInfo, error) {
	a.mu.Lock()
	pd := a.protoset
	a.mu.Unlock()
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded")
	}
	return pd.Services(), nil
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

// ExportCollection writes a collection JSON file to the given destination path.
func (a *App) ExportCollection(id, destPath string) error {
	if a.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	if _, err := a.store.GetCollection(id); err != nil {
		return err
	}
	src := a.store.FilePath(id)
	return copyFile(src, destPath)
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

func interpolateRequest(req grpcinternal.InvokeRequest, env *storage.Environment) grpcinternal.InvokeRequest {
	if env == nil || len(env.Variables) == 0 {
		return req
	}
	req.RequestJSON = storage.Interpolate(req.RequestJSON, env.Variables)
	for i := range req.Metadata {
		req.Metadata[i].Key = storage.Interpolate(req.Metadata[i].Key, env.Variables)
		req.Metadata[i].Value = storage.Interpolate(req.Metadata[i].Value, env.Variables)
	}
	return req
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}


