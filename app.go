package main

import (
	"context"
	"fmt"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"grpc-nimbus/internal/rpc"
	"grpc-nimbus/internal/storage"
)

// App is the main Wails application struct. All exported methods are callable
// from the frontend via generated TypeScript bindings.
type App struct {
	ctx context.Context

	mu         sync.Mutex
	settingsMu sync.Mutex
	conn       *rpc.Connection
	protoset   *rpc.ProtosetDescriptor
	store      *storage.Store
	envStore   *storage.EnvStore
	histStore  *storage.HistoryStore
	settings   *storage.SettingsStore
	activeEnv  *storage.Environment

	// defaultMetadata holds the global default request headers from settings.
	// Protected by mu; updated synchronously when SaveUserSettings is called.
	defaultMetadata []rpc.MetadataEntry
	// allowShellCommands gates $(...) header interpolation at send time.
	// Protected by mu; updated synchronously when SaveUserSettings is called.
	allowShellCommands bool

	// Loaded descriptor state is tracked by source family so proto files,
	// protosets, and reflection can coexist.
	loadedProtosetPaths []string
	loadedProtoFiles    []string
	loadImportPaths     []string
	loadReflection      bool

	// streamCancel cancels the active streaming invocation, if any.
	streamCancel    context.CancelFunc
	streamCancelSeq uint64

	// unaryCancel cancels the currently in-flight unary invocation, if any.
	unaryCancel    context.CancelFunc
	unaryCancelSeq uint64

	// reflectionCancel cancels the currently in-flight reflection load, if any.
	reflectionCancel    context.CancelFunc
	reflectionCancelSeq uint64
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

	// Auto-restore last loaded proto/protoset descriptor sources.
	saved, err := a.settings.Load()
	if err != nil || saved == nil {
		return
	}
	var parts []*rpc.ProtosetDescriptor
	if len(saved.ProtosetPaths) > 0 {
		pd, err := rpc.LoadProtosets(saved.ProtosetPaths)
		if err != nil {
			fmt.Printf("warning: auto-restore protoset failed: %v\n", err)
		} else {
			parts = append(parts, pd)
			a.loadedProtosetPaths = append([]string(nil), saved.ProtosetPaths...)
		}
	}
	if len(saved.ProtoFilePaths) > 0 {
		pd, err := rpc.LoadProtoFiles(saved.ProtoImportPaths, saved.ProtoFilePaths)
		if err != nil {
			fmt.Printf("warning: auto-restore proto files failed: %v\n", err)
		} else {
			parts = append(parts, pd)
			a.loadedProtoFiles = append([]string(nil), saved.ProtoFilePaths...)
			a.loadImportPaths = append([]string(nil), saved.ProtoImportPaths...)
		}
	}
	if merged := rpc.MergeDescriptors(parts...); merged != nil {
		a.protoset = merged
	}

	// Apply persisted request/behaviour settings at startup.
	if a.histStore != nil && saved.HistoryLimit != nil {
		a.histStore.SetLimit(*saved.HistoryLimit)
	}
	a.mu.Lock()
	if len(saved.DefaultMetadata) > 0 {
		a.defaultMetadata = saved.DefaultMetadata
	}
	if saved.AllowShellCommands != nil {
		a.allowShellCommands = *saved.AllowShellCommands
	}
	a.mu.Unlock()
	if saved.AutoConnectOnStartup != nil && *saved.AutoConnectOnStartup && saved.LastTarget != "" {
		tls := rpc.TLSModeNone
		if saved.LastTLS != "" {
			tls = rpc.TLSMode(saved.LastTLS)
		}
		go func() {
			if err := a.Connect(rpc.ConnectionConfig{Target: saved.LastTarget, TLS: tls}); err != nil {
				fmt.Printf("warning: auto-connect failed: %v\n", err)
			}
		}()
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

// SaveWindowState captures the current window size and position and persists them.
// Called on application shutdown via the Wails BeforeClose hook.
func (a *App) SaveWindowState(ctx context.Context) {
	width, height := runtime.WindowGetSize(ctx)
	x, y := runtime.WindowGetPosition(ctx)

	a.saveSettings(func(s *storage.AppSettings) {
		s.WindowWidth = &width
		s.WindowHeight = &height
		s.WindowX = &x
		s.WindowY = &y
	})
}
