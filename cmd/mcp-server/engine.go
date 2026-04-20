package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"grpc-nimbus/internal/rpc"
	"grpc-nimbus/internal/storage"
)

// MCPEngine owns all gRPC and descriptor state for an MCP server session.
// It mirrors the App struct from the main Wails application but without any
// Wails or UI dependencies, and reads from the same OS config directory so
// environments and collections saved in the desktop app are immediately visible.
type MCPEngine struct {
	mu        sync.Mutex
	ctx       context.Context
	conn      *rpc.Connection
	protoset  *rpc.ProtosetDescriptor
	activeEnv *storage.Environment

	store     *storage.Store
	envStore  *storage.EnvStore
	histStore *storage.HistoryStore
	settings  *storage.SettingsStore

	loadedProtosetPaths []string
	loadedProtoFiles    []string
	loadImportPaths     []string
	loadReflection      bool
}

// NewMCPEngine creates and initialises an MCPEngine. It auto-restores the last
// saved descriptor sources and active environment from the shared config dir.
func NewMCPEngine(ctx context.Context) *MCPEngine {
	e := &MCPEngine{ctx: ctx}

	var err error
	e.store, err = storage.NewStore()
	if err != nil {
		fmt.Printf("warning: collection store unavailable: %v\n", err)
	}
	e.envStore, err = storage.NewEnvStore()
	if err != nil {
		fmt.Printf("warning: environment store unavailable: %v\n", err)
	}
	e.histStore, err = storage.NewHistoryStore()
	if err != nil {
		fmt.Printf("warning: history store unavailable: %v\n", err)
	}
	e.settings, err = storage.NewSettingsStore()
	if err != nil {
		fmt.Printf("warning: settings store unavailable: %v\n", err)
		return e
	}

	saved, err := e.settings.Load()
	if err != nil || saved == nil {
		return e
	}

	var parts []*rpc.ProtosetDescriptor
	if len(saved.ProtosetPaths) > 0 {
		pd, err := rpc.LoadProtosets(saved.ProtosetPaths)
		if err == nil {
			parts = append(parts, pd)
			e.loadedProtosetPaths = append([]string(nil), saved.ProtosetPaths...)
		}
	}
	if len(saved.ProtoFilePaths) > 0 {
		pd, err := rpc.LoadProtoFiles(saved.ProtoImportPaths, saved.ProtoFilePaths)
		if err == nil {
			parts = append(parts, pd)
			e.loadedProtoFiles = append([]string(nil), saved.ProtoFilePaths...)
			e.loadImportPaths = append([]string(nil), saved.ProtoImportPaths...)
		}
	}
	if merged := rpc.MergeDescriptors(parts...); merged != nil {
		e.protoset = merged
	}

	// Restore active environment.
	if saved.ActiveEnvironmentID != "" && e.envStore != nil {
		if env, err := e.envStore.GetEnvironment(saved.ActiveEnvironmentID); err == nil {
			e.activeEnv = env
		}
	}

	return e
}

// Connect dials the specified gRPC server.
func (e *MCPEngine) Connect(cfg rpc.ConnectionConfig) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.conn != nil {
		_ = e.conn.Close()
	}
	conn, err := rpc.NewConnection(e.ctx, cfg)
	if err != nil {
		return err
	}
	e.conn = conn

	go e.saveSettings(func(s *storage.AppSettings) {
		s.LastTarget = cfg.Target
		s.LastTLS = string(cfg.TLS)
	})
	return nil
}

// Disconnect closes the current gRPC connection.
func (e *MCPEngine) Disconnect() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.conn != nil {
		_ = e.conn.Close()
		e.conn = nil
	}
}

// GetConnectionState returns the current connectivity state string.
func (e *MCPEngine) GetConnectionState() string {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.conn == nil {
		return "disconnected"
	}
	return e.conn.GetState()
}

// SetActiveEnvironment activates an environment by ID and returns it.
func (e *MCPEngine) SetActiveEnvironment(id string) error {
	if id == "" {
		e.mu.Lock()
		e.activeEnv = nil
		e.mu.Unlock()
		e.saveSettings(func(s *storage.AppSettings) { s.ActiveEnvironmentID = "" })
		return nil
	}
	if e.envStore == nil {
		return fmt.Errorf("environment store unavailable")
	}
	env, err := e.envStore.GetEnvironment(id)
	if err != nil {
		return err
	}
	e.mu.Lock()
	e.activeEnv = env
	e.mu.Unlock()
	e.saveSettings(func(s *storage.AppSettings) { s.ActiveEnvironmentID = id })
	return nil
}

// SetActiveEnvironmentByName activates the first environment whose name matches (case-sensitive).
func (e *MCPEngine) SetActiveEnvironmentByName(name string) error {
	if e.envStore == nil {
		return fmt.Errorf("environment store unavailable")
	}
	envs, err := e.envStore.ListEnvironments()
	if err != nil {
		return err
	}
	for _, env := range envs {
		if env.Name == name {
			return e.SetActiveEnvironment(env.ID)
		}
	}
	return fmt.Errorf("no environment named %q", name)
}

// LoadProtosets loads one or more .protoset files, merging with any existing descriptors.
func (e *MCPEngine) LoadProtosets(paths []string) ([]rpc.ServiceInfo, error) {
	e.mu.Lock()
	currentProtosets := append([]string(nil), e.loadedProtosetPaths...)
	importPaths := append([]string(nil), e.loadImportPaths...)
	protoFiles := append([]string(nil), e.loadedProtoFiles...)
	withReflection := e.loadReflection
	conn := e.conn
	e.mu.Unlock()

	allProtosets := dedupeStrings(append(currentProtosets, paths...))
	pd, err := e.rebuildDescriptor(allProtosets, importPaths, protoFiles, withReflection, conn)
	if err != nil {
		return nil, err
	}
	e.storeDescriptorState(pd, allProtosets, importPaths, protoFiles, withReflection)
	return pd.Services(), nil
}

// LoadViaReflection queries the connected server's reflection API.
func (e *MCPEngine) LoadViaReflection() ([]rpc.ServiceInfo, error) {
	e.mu.Lock()
	conn := e.conn
	protosets := append([]string(nil), e.loadedProtosetPaths...)
	importPaths := append([]string(nil), e.loadImportPaths...)
	protoFiles := append([]string(nil), e.loadedProtoFiles...)
	e.mu.Unlock()

	if conn == nil {
		return nil, fmt.Errorf("not connected — call connect first")
	}
	pd, err := e.rebuildDescriptor(protosets, importPaths, protoFiles, true, conn)
	if err != nil {
		return nil, err
	}
	e.storeDescriptorState(pd, protosets, importPaths, protoFiles, true)
	return pd.Services(), nil
}

// GetServices returns the service/method tree from the loaded descriptor.
func (e *MCPEngine) GetServices() ([]rpc.ServiceInfo, error) {
	e.mu.Lock()
	pd := e.protoset
	e.mu.Unlock()
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded — call load_protoset or load_via_reflection first")
	}
	return pd.Services(), nil
}

// GetRequestSchema returns the JSON field schemas for a method's input message.
func (e *MCPEngine) GetRequestSchema(methodPath string) ([]rpc.FieldSchema, error) {
	e.mu.Lock()
	pd := e.protoset
	e.mu.Unlock()
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded")
	}
	return pd.GetRequestSchema(methodPath)
}

// InvokeUnary executes a unary RPC and records it to history.
func (e *MCPEngine) InvokeUnary(req rpc.InvokeRequest) (*rpc.InvokeResponse, error) {
	e.mu.Lock()
	conn := e.conn
	pd := e.protoset
	env := e.activeEnv
	e.mu.Unlock()

	if conn == nil {
		return nil, fmt.Errorf("not connected")
	}
	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded")
	}

	req = interpolateRequest(req, env)

	ctx := e.ctx
	if req.TimeoutSeconds > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(req.TimeoutSeconds*float64(time.Second)))
		defer cancel()
	}

	resp, err := rpc.InvokeUnary(ctx, conn, pd, req)
	if err != nil {
		return nil, err
	}

	if e.histStore != nil {
		_ = e.histStore.Add(storage.HistoryEntry{
			ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
			MethodPath:  req.MethodPath,
			RequestJSON: req.RequestJSON,
			Metadata:    req.Metadata,
			Response:    resp,
			InvokedAt:   time.Now().Format(time.RFC3339Nano),
		})
	}
	return resp, nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func (e *MCPEngine) rebuildDescriptor(
	protosets, importPaths, protoFiles []string,
	withReflection bool,
	conn *rpc.Connection,
) (*rpc.ProtosetDescriptor, error) {
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
		if conn == nil {
			return nil, fmt.Errorf("not connected")
		}
		pd, err := rpc.LoadViaReflection(e.ctx, conn.ClientConn())
		if err != nil {
			return nil, err
		}
		parts = append(parts, pd)
	}
	return rpc.MergeDescriptors(parts...), nil
}

func (e *MCPEngine) storeDescriptorState(
	pd *rpc.ProtosetDescriptor,
	protosets, importPaths, protoFiles []string,
	withReflection bool,
) {
	e.mu.Lock()
	old := e.protoset
	e.protoset = pd
	e.loadedProtosetPaths = append([]string(nil), protosets...)
	e.loadedProtoFiles = append([]string(nil), protoFiles...)
	e.loadImportPaths = append([]string(nil), importPaths...)
	e.loadReflection = withReflection
	e.mu.Unlock()

	if old != nil {
		go func() {
			time.Sleep(5 * time.Second)
			old.Close()
		}()
	}
}

func (e *MCPEngine) saveSettings(fn func(*storage.AppSettings)) {
	if e.settings == nil {
		return
	}
	saved, err := e.settings.Load()
	if err != nil || saved == nil {
		saved = &storage.AppSettings{}
	}
	fn(saved)
	_ = e.settings.Save(saved)
}

func dedupeStrings(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, v := range values {
		if v != "" && !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}

func interpolateRequest(req rpc.InvokeRequest, env *storage.Environment) rpc.InvokeRequest {
	if env == nil || len(env.Headers) == 0 {
		return req
	}
	envMeta := make([]rpc.MetadataEntry, 0, len(env.Headers))
	for _, h := range env.Headers {
		if h.Key == "" {
			continue
		}
		envMeta = append(envMeta, rpc.MetadataEntry{Key: h.Key, Value: h.Value})
	}
	req.Metadata = append(envMeta, req.Metadata...)
	return req
}
