package main

import (
"context"
"fmt"
"sync"

"grpc-nimbus/internal/rpc"
"grpc-nimbus/internal/storage"
)

// App is the main Wails application struct. All exported methods are callable
// from the frontend via generated TypeScript bindings.
type App struct {
ctx context.Context

mu        sync.Mutex
conn      *rpc.Connection
protoset  *rpc.ProtosetDescriptor
store     *storage.Store
envStore  *storage.EnvStore
histStore *storage.HistoryStore
settings  *storage.SettingsStore
activeEnv *storage.Environment

// loadedPaths and loadMode track the most recently loaded descriptor source
// so they can be persisted and restored across restarts.
loadedPaths     []string
loadMode        string   // "protoset", "proto", or "reflection"
loadImportPaths []string // only used when loadMode == "proto"

// streamCancel cancels the active streaming invocation, if any.
streamCancel context.CancelFunc

// unaryCancel cancels the currently in-flight unary invocation, if any.
unaryCancel context.CancelFunc
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
pd, err := rpc.LoadProtosets(saved.ProtosetPaths)
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
pd, err := rpc.LoadProtoFiles(saved.ProtoImportPaths, saved.ProtoFilePaths)
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

// Connect dials the gRPC server with the given configuration.
func (a *App) Connect(cfg rpc.ConnectionConfig) error {
a.mu.Lock()
defer a.mu.Unlock()

if a.conn != nil {
_ = a.conn.Close()
}
conn, err := rpc.NewConnection(a.ctx, cfg)
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
