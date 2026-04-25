package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"strings"
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
	mu         sync.Mutex
	settingsMu sync.Mutex
	ctx        context.Context
	conn       *rpc.Connection
	protoset   *rpc.ProtosetDescriptor
	activeEnv  *storage.Environment

	store     *storage.Store
	envStore  *storage.EnvStore
	histStore *storage.HistoryStore
	settings  *storage.SettingsStore

	loadedProtosetPaths []string
	loadedProtoFiles    []string
	loadImportPaths     []string
	loadReflection      bool
}

const (
	defaultInvokeTimeoutSeconds = 30.0
	maxInvokeTimeoutSeconds     = 600.0
)

// NewMCPEngine creates and initialises an MCPEngine. It auto-restores the last
// saved descriptor sources and active environment from the shared config dir.
func NewMCPEngine(ctx context.Context) *MCPEngine {
	e := &MCPEngine{ctx: ctx}

	var err error
	e.store, err = storage.NewStore()
	if err != nil {
		log.Printf("warning: collection store unavailable: %v", err)
	}
	e.envStore, err = storage.NewEnvStore()
	if err != nil {
		log.Printf("warning: environment store unavailable: %v", err)
	}
	e.histStore, err = storage.NewHistoryStore()
	if err != nil {
		log.Printf("warning: history store unavailable: %v", err)
	}
	e.settings, err = storage.NewSettingsStore()
	if err != nil {
		log.Printf("warning: settings store unavailable: %v", err)
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
func (e *MCPEngine) Connect(ctx context.Context, cfg rpc.ConnectionConfig) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.conn != nil {
		_ = e.conn.Close()
	}
	conn, err := rpc.NewConnection(e.mergeContext(ctx), cfg)
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
func (e *MCPEngine) LoadProtosets(ctx context.Context, paths []string) ([]rpc.ServiceInfo, error) {
	e.mu.Lock()
	currentProtosets := append([]string(nil), e.loadedProtosetPaths...)
	importPaths := append([]string(nil), e.loadImportPaths...)
	protoFiles := append([]string(nil), e.loadedProtoFiles...)
	withReflection := e.loadReflection
	conn := e.conn
	e.mu.Unlock()

	allProtosets := dedupeStrings(append(currentProtosets, paths...))
	pd, err := e.rebuildDescriptor(ctx, allProtosets, importPaths, protoFiles, withReflection, conn)
	if err != nil {
		return nil, err
	}
	e.storeDescriptorState(pd, allProtosets, importPaths, protoFiles, withReflection)
	return pd.Services(), nil
}

// LoadViaReflection queries the connected server's reflection API.
func (e *MCPEngine) LoadViaReflection(ctx context.Context) ([]rpc.ServiceInfo, error) {
	e.mu.Lock()
	conn := e.conn
	protosets := append([]string(nil), e.loadedProtosetPaths...)
	importPaths := append([]string(nil), e.loadImportPaths...)
	protoFiles := append([]string(nil), e.loadedProtoFiles...)
	e.mu.Unlock()

	if conn == nil {
		return nil, fmt.Errorf("not connected — call connect first")
	}
	pd, err := e.rebuildDescriptor(ctx, protosets, importPaths, protoFiles, true, conn)
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
func (e *MCPEngine) InvokeUnary(ctx context.Context, req rpc.InvokeRequest) (*rpc.InvokeResponse, error) {
	if err := validateTimeoutSeconds(req.TimeoutSeconds); err != nil {
		return nil, err
	}

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

	callCtx, cancel := context.WithTimeout(e.mergeContext(ctx), time.Duration(req.TimeoutSeconds*float64(time.Second)))
	defer cancel()

	resp, err := rpc.InvokeUnary(callCtx, conn, pd, req)
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
	ctx context.Context,
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
		pd, err := rpc.LoadViaReflection(e.mergeContext(ctx), conn.ClientConn())
		if err != nil {
			return nil, err
		}
		parts = append(parts, pd)
	}
	return rpc.MergeDescriptors(parts...), nil
}

// EnsureCollectionDescriptors loads descriptor sources referenced by col.
func (e *MCPEngine) EnsureCollectionDescriptors(ctx context.Context, col *storage.Collection) error {
	if col == nil {
		return fmt.Errorf("collection is required")
	}
	if len(col.ProtosetPaths) == 0 && len(col.ProtoFilePaths) == 0 {
		return nil
	}

	e.mu.Lock()
	currentProtosets := append([]string(nil), e.loadedProtosetPaths...)
	currentProtoFiles := append([]string(nil), e.loadedProtoFiles...)
	currentImportPaths := append([]string(nil), e.loadImportPaths...)
	withReflection := e.loadReflection
	conn := e.conn
	e.mu.Unlock()

	allProtosets := dedupeStrings(append(currentProtosets, col.ProtosetPaths...))
	allProtoFiles := dedupeStrings(append(currentProtoFiles, col.ProtoFilePaths...))
	allImportPaths := dedupeStrings(append(currentImportPaths, col.ProtoImportPaths...))

	pd, err := e.rebuildDescriptor(ctx, allProtosets, allImportPaths, allProtoFiles, withReflection, conn)
	if err != nil {
		return fmt.Errorf("loading descriptors for collection %q: %w", col.Name, err)
	}
	if pd == nil {
		return fmt.Errorf("no descriptors available for collection %q", col.Name)
	}

	e.storeDescriptorState(pd, allProtosets, allImportPaths, allProtoFiles, withReflection)
	return nil
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
	e.settingsMu.Lock()
	defer e.settingsMu.Unlock()

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

func validateTimeoutSeconds(timeoutSeconds float64) error {
	if math.IsNaN(timeoutSeconds) || math.IsInf(timeoutSeconds, 0) {
		return fmt.Errorf("timeout_seconds must be a finite number")
	}
	if timeoutSeconds <= 0 {
		return fmt.Errorf("timeout_seconds must be greater than 0")
	}
	if timeoutSeconds > maxInvokeTimeoutSeconds {
		return fmt.Errorf("timeout_seconds must be <= %.0f", maxInvokeTimeoutSeconds)
	}
	return nil
}

func (e *MCPEngine) mergeContext(ctx context.Context) context.Context {
	if ctx != nil {
		return ctx
	}
	if e.ctx != nil {
		return e.ctx
	}
	return context.Background()
}

func interpolateRequest(req rpc.InvokeRequest, env *storage.Environment) rpc.InvokeRequest {
	if env == nil || len(env.Headers) == 0 {
		return req
	}

	// Per-request metadata should override environment defaults by key.
	requestKeys := make(map[string]bool, len(req.Metadata))
	for _, md := range req.Metadata {
		key := strings.ToLower(strings.TrimSpace(md.Key))
		if key == "" {
			continue
		}
		requestKeys[key] = true
	}

	envMeta := make([]rpc.MetadataEntry, 0, len(env.Headers))
	for _, h := range env.Headers {
		key := strings.ToLower(strings.TrimSpace(h.Key))
		if key == "" || requestKeys[key] {
			continue
		}
		envMeta = append(envMeta, rpc.MetadataEntry{Key: h.Key, Value: h.Value})
	}
	req.Metadata = append(envMeta, req.Metadata...)
	return req
}
