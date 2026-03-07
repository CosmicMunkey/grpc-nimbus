package main

import (
	"context"
	"fmt"
	"sync"

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
		// Non-fatal: collections just won't persist.
		fmt.Printf("warning: could not initialise collection store: %v\n", err)
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

// ─── Protoset ─────────────────────────────────────────────────────────────────

// LoadProtosets parses the given protoset file paths and returns the service tree.
func (a *App) LoadProtosets(paths []string) ([]grpcinternal.ServiceInfo, error) {
	pd, err := grpcinternal.LoadProtosets(paths)
	if err != nil {
		return nil, err
	}
	a.mu.Lock()
	a.protoset = pd
	a.mu.Unlock()
	return pd.Services(), nil
}

// GetServices returns the service/method tree from the currently loaded protoset.
func (a *App) GetServices() ([]grpcinternal.ServiceInfo, error) {
	a.mu.Lock()
	pd := a.protoset
	a.mu.Unlock()
	if pd == nil {
		return nil, fmt.Errorf("no protoset loaded")
	}
	return pd.Services(), nil
}

// ─── Invocation ───────────────────────────────────────────────────────────────

// InvokeUnary executes a unary RPC and returns the response.
func (a *App) InvokeUnary(req grpcinternal.InvokeRequest) (*grpcinternal.InvokeResponse, error) {
	a.mu.Lock()
	conn := a.conn
	pd := a.protoset
	a.mu.Unlock()

	if conn == nil {
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	if pd == nil {
		return nil, fmt.Errorf("no protoset loaded — call LoadProtosets first")
	}
	return grpcinternal.InvokeUnary(a.ctx, conn, pd, req)
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

