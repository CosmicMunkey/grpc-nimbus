package backend

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/CosmicMunkey/grpc-nimbus/internal/logger"
	"github.com/CosmicMunkey/grpc-nimbus/internal/protoresolver"
	"github.com/CosmicMunkey/grpc-nimbus/internal/rpc"
	"github.com/CosmicMunkey/grpc-nimbus/internal/storage"
	"github.com/CosmicMunkey/grpc-nimbus/internal/util"
)

var (
	// ${VAR_NAME} — OS environment variable substitution.
	reEnvVar = regexp.MustCompile(`\$\{([^}]+)\}`)
	// $(command) — shell command substitution.
	reShellCmd = regexp.MustCompile(`\$\(([^)]+)\)`)
)

// Engine manages all application business logic, storage operations,
// and gRPC connections. It is UI-agnostic and Wails-independent.
type Engine struct {
	mu        sync.Mutex
	conn      *rpc.Connection
	protoset  *rpc.ProtosetDescriptor
	store     *storage.Store
	envStore  *storage.EnvStore
	histStore *storage.HistoryStore
	settings  *storage.SettingsStore
	activeEnv *storage.Environment

	// Configuration cached from settings
	defaultMetadata    []rpc.MetadataEntry
	allowShellCommands bool
	inheritShellEnv    bool
	emitDefaults       bool

	// Loaded descriptor paths and temporary virtual roots
	loadedProtosetPaths []string
	loadedProtoFiles    []string
	loadImportPaths     []string
	loadReflection      bool
	virtualImportDirs   []string

	// Cancel functions for async tasks
	connWatchCancel     context.CancelFunc
	streamCancel        context.CancelFunc
	streamCancelSeq     uint64
	unaryCancel         context.CancelFunc
	unaryCancelSeq      uint64
	reflectionCancel    context.CancelFunc
	reflectionCancelSeq uint64
}

// NewEngine creates a new Engine instance.
func NewEngine() *Engine {
	return &Engine{}
}

// Startup initializes stores and restores last saved state.
func (e *Engine) Startup(ctx context.Context) error {
	var err error
	e.store, err = storage.NewStore()
	if err != nil {
		logger.Default.Warnf("collection store unavailable: %v", err)
	}
	e.envStore, err = storage.NewEnvStore()
	if err != nil {
		logger.Default.Warnf("environment store unavailable: %v", err)
	}
	e.histStore, err = storage.NewHistoryStore()
	if err != nil {
		logger.Default.Warnf("history store unavailable: %v", err)
	}
	e.settings, err = storage.NewSettingsStore()
	if err != nil {
		logger.Default.Warnf("settings store unavailable: %v", err)
		return err
	}

	// Auto-restore descriptors
	saved, err := e.settings.Load()
	if err != nil || saved == nil {
		return nil
	}

	var parts []*rpc.ProtosetDescriptor
	for _, path := range saved.ProtosetPaths {
		pd, err := rpc.LoadProtosets([]string{path})
		if err != nil {
			logger.Default.Warnf("auto-restore protoset %q skipped: %v", path, err)
			continue
		}
		parts = append(parts, pd)
		e.loadedProtosetPaths = append(e.loadedProtosetPaths, path)
	}

	if len(saved.ProtoFilePaths) > 0 {
		pd, _, virtualDirs, err := protoresolver.ResolveProtoFiles(saved.ProtoImportPaths, saved.ProtoFilePaths)
		if err != nil {
			for _, file := range saved.ProtoFilePaths {
				pd, _, vd, err := protoresolver.ResolveProtoFiles(saved.ProtoImportPaths, []string{file})
				if err != nil {
					logger.Default.Warnf("auto-restore proto file %q skipped: %v", file, err)
					continue
				}
				parts = append(parts, pd)
				e.loadedProtoFiles = append(e.loadedProtoFiles, file)
				e.virtualImportDirs = append(e.virtualImportDirs, vd...)
			}
			if len(e.loadedProtoFiles) > 0 {
				e.loadImportPaths = append([]string(nil), saved.ProtoImportPaths...)
			}
		} else {
			parts = append(parts, pd)
			e.loadedProtoFiles = append([]string(nil), saved.ProtoFilePaths...)
			e.loadImportPaths = append([]string(nil), saved.ProtoImportPaths...)
			e.virtualImportDirs = append(e.virtualImportDirs, virtualDirs...)
		}
	}

	if merged := rpc.MergeDescriptors(parts...); merged != nil {
		e.protoset = merged
	}

	// Apply settings
	if e.histStore != nil && saved.HistoryLimit != nil {
		e.histStore.SetLimit(*saved.HistoryLimit)
	}

	e.mu.Lock()
	if len(saved.DefaultMetadata) > 0 {
		e.defaultMetadata = saved.DefaultMetadata
	}
	if saved.AllowShellCommands != nil {
		e.allowShellCommands = *saved.AllowShellCommands
	}
	if saved.InheritShellEnv != nil {
		e.inheritShellEnv = *saved.InheritShellEnv
	}
	if saved.EmitDefaults != nil {
		e.emitDefaults = *saved.EmitDefaults
	}
	e.mu.Unlock()

	// Auto-connect
	if saved.AutoConnectOnStartup != nil && *saved.AutoConnectOnStartup && saved.LastTarget != "" {
		tls := rpc.TLSModeNone
		if saved.LastTLS != "" {
			mode := rpc.TLSMode(saved.LastTLS)
			if mode == rpc.TLSModeNone || mode == rpc.TLSModeSystem {
				tls = mode
			}
		}
		go func() {
			if err := e.Connect(ctx, rpc.ConnectionConfig{Target: saved.LastTarget, TLS: tls}); err != nil {
				logger.Default.Warnf("auto-connect failed: %v", err)
			}
		}()
	}

	return nil
}

// Shutdown cleans up resources.
func (e *Engine) Shutdown() {
	e.mu.Lock()
	virtualDirs := e.virtualImportDirs
	e.virtualImportDirs = nil
	e.mu.Unlock()
	for _, d := range virtualDirs {
		os.RemoveAll(d)
	}
}

// ─── Connection ──────────────────────────────────────────────────────────────

func (e *Engine) Connect(ctx context.Context, cfg rpc.ConnectionConfig) error {
	e.mu.Lock()
	if e.conn != nil {
		_ = e.conn.Close()
	}
	if e.connWatchCancel != nil {
		e.connWatchCancel()
		e.connWatchCancel = nil
	}
	logger.Default.Infof("connecting to %s (TLS: %s)", cfg.Target, cfg.TLS)
	conn, err := rpc.NewConnection(ctx, cfg)
	if err != nil {
		e.mu.Unlock()
		logger.Default.Errorf("connection to %s failed: %v", cfg.Target, err)
		return err
	}
	e.conn = conn

	watchCtx, watchCancel := context.WithCancel(ctx)
	e.connWatchCancel = watchCancel
	e.mu.Unlock()

	go e.watchConnectionState(watchCtx, conn, cfg.Target)

	e.saveSettings(func(s *storage.AppSettings) {
		s.LastTarget = cfg.Target
		s.LastTLS = string(cfg.TLS)
	})
	return nil
}

func (e *Engine) Disconnect() {
	e.mu.Lock()
	cancel := e.connWatchCancel
	e.connWatchCancel = nil
	conn := e.conn
	e.conn = nil
	e.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	if conn != nil {
		logger.Default.Infof("disconnecting")
		_ = conn.Close()
	}
}

func (e *Engine) watchConnectionState(ctx context.Context, conn *rpc.Connection, target string) {
	warnLogged := false
	for {
		state := conn.GetState()
		switch state {
		case "ready":
			logger.Default.Infof("connected to %s", target)
			warnLogged = false
		case "transient_failure":
			if !warnLogged {
				logger.Default.Warnf("connection to %s failed (transient_failure)", target)
				warnLogged = true
			}
		case "shutdown":
			return
		}
		select {
		case <-ctx.Done():
			return
		case <-conn.WaitForStateChange(ctx):
		}
	}
}

func (e *Engine) GetConnectionState() string {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.conn == nil {
		return "disconnected"
	}
	return e.conn.GetState()
}

// ─── Collections ─────────────────────────────────────────────────────────────

func (e *Engine) ListCollections() ([]storage.Collection, error) {
	if e.store == nil {
		return nil, fmt.Errorf("collection store unavailable")
	}
	return e.store.ListCollections()
}

func (e *Engine) SaveCollection(col storage.Collection) error {
	if e.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	return e.store.SaveCollection(col)
}

func (e *Engine) DeleteCollection(id string) error {
	if e.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	return e.store.DeleteCollection(id)
}

func (e *Engine) GetCollection(id string) (*storage.Collection, error) {
	if e.store == nil {
		return nil, fmt.Errorf("collection store unavailable")
	}
	return e.store.GetCollection(id)
}

func (e *Engine) ExportCollection(id, destPath string) error {
	if e.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	return e.store.ExportPortable(id, destPath)
}

func (e *Engine) ImportCollection(srcPath string) (*storage.Collection, error) {
	if e.store == nil {
		return nil, fmt.Errorf("collection store unavailable")
	}
	return e.store.ImportCollection(srcPath)
}

// ─── Environments ────────────────────────────────────────────────────────────

func (e *Engine) ListEnvironments() ([]storage.Environment, error) {
	if e.envStore == nil {
		return nil, fmt.Errorf("environment store unavailable")
	}
	return e.envStore.ListEnvironments()
}

func (e *Engine) SaveEnvironment(env storage.Environment) error {
	if e.envStore == nil {
		return fmt.Errorf("environment store unavailable")
	}
	if err := e.envStore.SaveEnvironment(env); err != nil {
		return err
	}
	e.mu.Lock()
	if e.activeEnv != nil && e.activeEnv.ID == env.ID {
		e.activeEnv = &env
	}
	e.mu.Unlock()
	return nil
}

func (e *Engine) DeleteEnvironment(id string) error {
	if e.envStore == nil {
		return fmt.Errorf("environment store unavailable")
	}
	return e.envStore.DeleteEnvironment(id)
}

func (e *Engine) SetActiveEnvironment(id string) error {
	if id == "" {
		e.mu.Lock()
		e.activeEnv = nil
		e.mu.Unlock()
		e.saveSettings(func(s *storage.AppSettings) {
			s.ActiveEnvironmentID = ""
		})
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

	e.saveSettings(func(s *storage.AppSettings) {
		s.ActiveEnvironmentID = id
	})
	return nil
}

// ─── History ─────────────────────────────────────────────────────────────────

func (e *Engine) GetHistory(methodPath string) ([]storage.HistoryEntry, error) {
	if e.histStore == nil {
		return nil, fmt.Errorf("history store unavailable")
	}
	return e.histStore.GetHistory(methodPath)
}

func (e *Engine) ClearHistory(methodPath string) error {
	if e.histStore == nil {
		return fmt.Errorf("history store unavailable")
	}
	return e.histStore.ClearHistory(methodPath)
}

// ─── Settings ────────────────────────────────────────────────────────────────

func (e *Engine) GetUserSettings() (*storage.AppSettings, error) {
	if e.settings == nil {
		return nil, fmt.Errorf("settings store unavailable")
	}
	s, err := e.settings.Load()
	if err != nil {
		return nil, err
	}
	// Materialize defaults for the frontend (nil fields mean "use default")
	if s.ConfirmDeletes == nil {
		confirmDeletes := true
		s.ConfirmDeletes = &confirmDeletes
	}
	if s.TimestampInputLocal == nil {
		timestampInputLocal := false
		s.TimestampInputLocal = &timestampInputLocal
	}
	if s.ConfirmClearHistory == nil {
		confirmClearHistory := false
		s.ConfirmClearHistory = &confirmClearHistory
	}
	if s.EmitDefaults == nil {
		emitDefaults := false
		s.EmitDefaults = &emitDefaults
	}
	if s.FieldMaskIncludeDefaults == nil {
		fieldMaskIncludeDefaults := false
		s.FieldMaskIncludeDefaults = &fieldMaskIncludeDefaults
	}
	if s.EnvSortByCreated == nil {
		envSortByCreated := false
		s.EnvSortByCreated = &envSortByCreated
	}
	if s.FontSize == nil {
		fontSize := 16
		s.FontSize = &fontSize
	}
	if s.ResponseWordWrap == nil {
		responseWordWrap := true
		s.ResponseWordWrap = &responseWordWrap
	}
	if s.ResponseIndent == nil {
		responseIndent := 2
		s.ResponseIndent = &responseIndent
	}
	if s.SidebarWidth == nil {
		sidebarWidth := 256.0
		s.SidebarWidth = &sidebarWidth
	}
	if s.PanelSplit == nil {
		panelSplit := 0.5
		s.PanelSplit = &panelSplit
	}
	if s.DefaultTimeoutSeconds == nil {
		defaultTimeoutSeconds := 0.0
		s.DefaultTimeoutSeconds = &defaultTimeoutSeconds
	}
	if s.HistoryLimit == nil {
		historyLimit := 50
		s.HistoryLimit = &historyLimit
	}
	if s.AutoConnectOnStartup == nil {
		autoConnectOnStartup := false
		s.AutoConnectOnStartup = &autoConnectOnStartup
	}
	if s.AllowShellCommands == nil {
		allowShellCommands := false
		s.AllowShellCommands = &allowShellCommands
	}
	if s.InheritShellEnv == nil {
		inheritShellEnv := false
		s.InheritShellEnv = &inheritShellEnv
	}
	if s.MaxStreamMessages == nil {
		maxStreamMessages := 200
		s.MaxStreamMessages = &maxStreamMessages
	}
	if s.ShowDebugIndicator == nil {
		showDebugIndicator := false
		s.ShowDebugIndicator = &showDebugIndicator
	}
	return s, nil
}

func (e *Engine) SaveUserSettings(s storage.AppSettings) error {
	if e.settings == nil {
		return fmt.Errorf("settings store unavailable")
	}
	if err := e.settings.Save(&s); err != nil {
		return err
	}
	if e.histStore != nil && s.HistoryLimit != nil {
		e.histStore.SetLimit(*s.HistoryLimit)
	}
	e.mu.Lock()
	e.defaultMetadata = s.DefaultMetadata
	if s.AllowShellCommands != nil {
		e.allowShellCommands = *s.AllowShellCommands
	}
	if s.InheritShellEnv != nil {
		e.inheritShellEnv = *s.InheritShellEnv
	}
	if s.EmitDefaults != nil {
		e.emitDefaults = *s.EmitDefaults
	}
	e.mu.Unlock()
	return nil
}

func (e *Engine) saveSettings(fn func(*storage.AppSettings)) {
	if e.settings == nil {
		return
	}
	if err := e.settings.Update(fn); err != nil {
		logger.Default.Warnf("could not save settings: %v", err)
	}
}

// ─── Protobuf Discovery ──────────────────────────────────────────────────────

func (e *Engine) LoadProtosets(ctx context.Context, paths []string) ([]rpc.ServiceInfo, error) {
	e.mu.Lock()
	currentProtosets := append([]string(nil), e.loadedProtosetPaths...)
	importPaths := append([]string(nil), e.loadImportPaths...)
	protoFiles := append([]string(nil), e.loadedProtoFiles...)
	virtualDirs := append([]string(nil), e.virtualImportDirs...)
	withReflection := e.loadReflection
	conn := e.conn
	e.mu.Unlock()

	logger.Default.Infof("loading protosets: %v", paths)
	allProtosets := util.DedupeStrings(append(currentProtosets, paths...))
	effectivePaths := append(importPaths, virtualDirs...)
	pd, err := e.rebuildDescriptor(ctx, allProtosets, effectivePaths, protoFiles, withReflection, conn)
	if err != nil {
		logger.Default.Errorf("loading protosets failed: %v", err)
		return nil, err
	}
	e.storeDescriptorState(pd, allProtosets, importPaths, protoFiles, withReflection)
	// Loading protosets doesn't create new virtual dirs; the existing ones
	// (from any prior LoadProtoFiles call) remain valid for the merged descriptor.
	svcs := pd.Services()
	logger.Default.Infof("protosets loaded: %d service(s)", len(svcs))

	e.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = e.currentLoadMode()
		s.ProtosetPaths = allProtosets
		s.ProtoFilePaths = protoFiles
		s.ProtoImportPaths = importPaths
	})
	return svcs, nil
}

func (e *Engine) LoadProtoFiles(ctx context.Context, importPaths, protoFiles []string) ([]rpc.ServiceInfo, error) {
	logger.Default.Infof("loading proto files: %v", protoFiles)
	seen := map[string]bool{}
	userPaths := make([]string, 0, len(importPaths))
	for _, dir := range importPaths {
		if dir != "" && !seen[dir] {
			seen[dir] = true
			userPaths = append(userPaths, dir)
		}
	}

	var protoParentDirs []string
	for _, f := range protoFiles {
		if filepath.IsAbs(f) {
			dir := filepath.Dir(f)
			if !seen[dir] {
				seen[dir] = true
				protoParentDirs = append(protoParentDirs, dir)
			}
		}
	}

	discovered := protoresolver.DiscoverImportPaths(protoFiles, userPaths)
	importPaths = util.DedupeStrings(append(append(userPaths, discovered...), protoParentDirs...))

	e.mu.Lock()
	protosets := append([]string(nil), e.loadedProtosetPaths...)
	currentProtoFiles := append([]string(nil), e.loadedProtoFiles...)
	currentImportPaths := append([]string(nil), e.loadImportPaths...)
	withReflection := e.loadReflection
	conn := e.conn
	e.mu.Unlock()

	allProtoFiles := util.DedupeStrings(append(currentProtoFiles, protoFiles...))
	allImportPaths := util.DedupeStrings(append(currentImportPaths, importPaths...))
	var virtualDirs []string
	var (
		pd  *rpc.ProtosetDescriptor
		err error
	)
	for range 8 {
		effectivePaths := append(allImportPaths, virtualDirs...)
		pd, err = e.rebuildDescriptor(ctx, protosets, effectivePaths, allProtoFiles, withReflection, conn)
		if err == nil {
			break
		}
		inferred, ok := protoresolver.InferImportPath(err, allProtoFiles, effectivePaths)
		if ok {
			allImportPaths = util.DedupeStrings(append(allImportPaths, inferred))
			continue
		}
		sourcePath, importRef, errOk := protoresolver.ImportFromErrorLine(err, allProtoFiles)
		if !errOk {
			break
		}
		virtDir, virtOk := protoresolver.InferVirtualImportRoot(importRef, sourcePath)
		if !virtOk {
			break
		}
		virtualDirs = append(virtualDirs, virtDir)
	}
	if err != nil {
		for _, d := range virtualDirs {
			os.RemoveAll(d)
		}
		logger.Default.Errorf("loading proto files failed: %v", err)
		return nil, err
	}
	e.storeDescriptorState(pd, protosets, allImportPaths, allProtoFiles, withReflection)
	logger.Default.Infof("proto files loaded: %d service(s)", len(pd.Services()))

	e.mu.Lock()
	for _, d := range e.virtualImportDirs {
		os.RemoveAll(d)
	}
	e.virtualImportDirs = append([]string(nil), virtualDirs...)
	e.mu.Unlock()

	e.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = e.currentLoadMode()
		s.ProtoFilePaths = allProtoFiles
		s.ProtoImportPaths = allImportPaths
		s.ProtosetPaths = protosets
	})
	return pd.Services(), nil
}

func (e *Engine) LoadViaReflection(ctx context.Context) ([]rpc.ServiceInfo, error) {
	e.mu.Lock()
	conn := e.conn
	protosets := append([]string(nil), e.loadedProtosetPaths...)
	importPaths := append([]string(nil), e.loadImportPaths...)
	protoFiles := append([]string(nil), e.loadedProtoFiles...)
	virtualDirs := append([]string(nil), e.virtualImportDirs...)
	ctx, cancel := context.WithCancel(ctx)
	e.reflectionCancelSeq++
	cancelSeq := e.reflectionCancelSeq
	e.reflectionCancel = cancel
	e.mu.Unlock()

	defer func() {
		cancel()
		e.mu.Lock()
		if e.reflectionCancelSeq == cancelSeq {
			e.reflectionCancel = nil
		}
		e.mu.Unlock()
	}()

	if conn == nil {
		logger.Default.Errorf("load via reflection failed: not connected")
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	logger.Default.Infof("loading via reflection")
	effectivePaths := append(importPaths, virtualDirs...)
	pd, err := e.rebuildDescriptor(ctx, protosets, effectivePaths, protoFiles, true, conn)
	if err != nil {
		logger.Default.Errorf("reflection load failed: %v", err)
		return nil, err
	}
	e.storeDescriptorState(pd, protosets, importPaths, protoFiles, true)
	logger.Default.Infof("reflection load complete: %d service(s)", len(pd.Services()))

	e.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = e.currentLoadMode()
		s.ProtosetPaths = protosets
		s.ProtoFilePaths = protoFiles
		s.ProtoImportPaths = importPaths
	})
	return pd.Services(), nil
}

func (e *Engine) CancelReflection() {
	e.mu.Lock()
	cancel := e.reflectionCancel
	e.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

func (e *Engine) GetLoadedState() (*storage.AppSettings, string, []string, []string, []string, []rpc.ServiceInfo, error) {
	e.mu.Lock()
	pd := e.protoset

	paths := append([]string(nil), e.loadedProtosetPaths...)
	paths = append(paths, e.loadedProtoFiles...)
	paths = util.DedupeStrings(paths)

	protosets := append([]string(nil), e.loadedProtosetPaths...)
	protoFiles := append([]string(nil), e.loadedProtoFiles...)
	e.mu.Unlock()

	// Reuse the canonical load-mode computation rather than duplicating it.
	mode := e.currentLoadMode()

	var svcs []rpc.ServiceInfo
	if pd != nil {
		svcs = pd.Services()
	}

	var saved *storage.AppSettings
	if e.settings != nil {
		saved, _ = e.settings.Load()
	}
	return saved, mode, paths, protosets, protoFiles, svcs, nil
}

func (e *Engine) ClearLoadedProtos() {
	logger.Default.Infof("clearing all loaded protos")
	e.mu.Lock()
	old := e.protoset
	e.protoset = nil
	e.loadedProtosetPaths = nil
	e.loadedProtoFiles = nil
	e.loadImportPaths = nil
	e.loadReflection = false
	virtualDirs := e.virtualImportDirs
	e.virtualImportDirs = nil
	e.mu.Unlock()

	for _, d := range virtualDirs {
		os.RemoveAll(d)
	}

	if old != nil {
		go func() {
			time.Sleep(5 * time.Second)
			old.Close()
		}()
	}

	e.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = ""
		s.ProtosetPaths = nil
		s.ProtoFilePaths = nil
		s.ProtoImportPaths = nil
	})
}

func (e *Engine) ReloadProtos(ctx context.Context) ([]rpc.ServiceInfo, error) {
	e.mu.Lock()
	protosets := append([]string(nil), e.loadedProtosetPaths...)
	protoFiles := append([]string(nil), e.loadedProtoFiles...)
	importPaths := append([]string(nil), e.loadImportPaths...)
	withReflection := e.loadReflection
	conn := e.conn
	oldVirtualDirs := append([]string(nil), e.virtualImportDirs...)
	e.mu.Unlock()

	if len(protosets) == 0 && len(protoFiles) == 0 && !withReflection {
		logger.Default.Errorf("reload protos failed: nothing to reload")
		return nil, fmt.Errorf("nothing to reload")
	}
	logger.Default.Infof("reloading protos")

	// Re-resolve proto files to rebuild fresh virtual import dirs, then include
	// them alongside any existing ones for the merged rebuild.
	var newVirtualDirs []string
	if len(protoFiles) > 0 {
		_, _, newVirtualDirs, _ = protoresolver.ResolveProtoFiles(importPaths, protoFiles)
	}
	effectivePaths := util.DedupeStrings(append(importPaths, newVirtualDirs...))
	pd, err := e.rebuildDescriptor(ctx, protosets, effectivePaths, protoFiles, withReflection, conn)
	if err != nil {
		for _, d := range newVirtualDirs {
			os.RemoveAll(d)
		}
		logger.Default.Errorf("reload protos failed: %v", err)
		return nil, err
	}
	e.storeDescriptorState(pd, protosets, importPaths, protoFiles, withReflection)

	// Swap virtual dirs: clean up the old set and store the freshly resolved ones.
	e.mu.Lock()
	for _, d := range oldVirtualDirs {
		os.RemoveAll(d)
	}
	e.virtualImportDirs = append([]string(nil), newVirtualDirs...)
	e.mu.Unlock()

	logger.Default.Infof("protos reloaded: %d service(s)", len(pd.Services()))
	return pd.Services(), nil
}

func (e *Engine) RemoveProtoPath(ctx context.Context, path string) ([]rpc.ServiceInfo, error) {
	logger.Default.Infof("removing proto path: %s", path)
	cleaned := filepath.Clean(path)

	e.mu.Lock()
	currentProtosets := append([]string(nil), e.loadedProtosetPaths...)
	currentProtoFiles := append([]string(nil), e.loadedProtoFiles...)
	importPaths := append([]string(nil), e.loadImportPaths...)
	withReflection := e.loadReflection
	conn := e.conn
	oldVirtualDirs := append([]string(nil), e.virtualImportDirs...)
	e.mu.Unlock()

	var (
		newProtosets []string
		newProtoFiles []string
		removed      bool
	)

	for _, p := range currentProtosets {
		if filepath.Clean(p) == cleaned {
			removed = true
		} else {
			newProtosets = append(newProtosets, p)
		}
	}

	for _, p := range currentProtoFiles {
		if filepath.Clean(p) == cleaned {
			removed = true
		} else {
			newProtoFiles = append(newProtoFiles, p)
		}
	}

	if !removed {
		logger.Default.Warnf("remove proto path %q: not loaded", path)
		e.mu.Lock()
		pd := e.protoset
		e.mu.Unlock()
		if pd != nil {
			return pd.Services(), nil
		}
		return nil, nil
	}

	if len(newProtosets) == 0 && len(newProtoFiles) == 0 && !withReflection {
		e.ClearLoadedProtos()
		return nil, nil
	}

	// Re-resolve the remaining proto files to get a fresh set of virtual dirs.
	var newVirtualDirs []string
	if len(newProtoFiles) > 0 {
		_, _, newVirtualDirs, _ = protoresolver.ResolveProtoFiles(importPaths, newProtoFiles)
	}
	effectivePaths := util.DedupeStrings(append(importPaths, newVirtualDirs...))
	pd, err := e.rebuildDescriptor(ctx, newProtosets, effectivePaths, newProtoFiles, withReflection, conn)
	if err != nil {
		for _, d := range newVirtualDirs {
			os.RemoveAll(d)
		}
		logger.Default.Errorf("removing proto path failed: %v", err)
		return nil, err
	}

	e.storeDescriptorState(pd, newProtosets, importPaths, newProtoFiles, withReflection)

	// Swap virtual dirs: clean up the old set and store the freshly resolved ones.
	e.mu.Lock()
	for _, d := range oldVirtualDirs {
		os.RemoveAll(d)
	}
	e.virtualImportDirs = append([]string(nil), newVirtualDirs...)
	e.mu.Unlock()

	logger.Default.Infof("proto path %q removed; reloaded %d service(s)", path, len(pd.Services()))

	e.saveSettings(func(s *storage.AppSettings) {
		s.ProtoLoadMode = e.currentLoadMode()
		s.ProtosetPaths = newProtosets
		s.ProtoFilePaths = newProtoFiles
	})

	return pd.Services(), nil
}

func (e *Engine) GetRequestSchema(methodPath string) ([]rpc.FieldSchema, error) {
	e.mu.Lock()
	pd := e.protoset
	e.mu.Unlock()

	if pd == nil {
		return nil, fmt.Errorf("no descriptor loaded")
	}
	return pd.GetRequestSchema(methodPath)
}

func (e *Engine) rebuildDescriptor(
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
			return nil, fmt.Errorf("not connected — call Connect first")
		}
		pd, err := rpc.LoadViaReflection(ctx, conn.ClientConn())
		if err != nil {
			return nil, err
		}
		parts = append(parts, pd)
	}
	return rpc.MergeDescriptors(parts...), nil
}

func (e *Engine) storeDescriptorState(
	pd *rpc.ProtosetDescriptor,
	protosets, importPaths, protoFiles []string,
	withReflection bool,
) {
	cleanedProtosets := make([]string, 0, len(protosets))
	protosetSet := make(map[string]bool, len(protosets))
	for _, p := range protosets {
		cp := filepath.Clean(p)
		if cp != "" && cp != "." && !protosetSet[cp] {
			protosetSet[cp] = true
			cleanedProtosets = append(cleanedProtosets, cp)
		}
	}
	cleanedProtoFiles := make([]string, 0, len(protoFiles))
	seenFiles := make(map[string]bool, len(protoFiles))
	for _, p := range protoFiles {
		cp := filepath.Clean(p)
		if cp != "" && cp != "." && !protosetSet[cp] && !seenFiles[cp] {
			seenFiles[cp] = true
			cleanedProtoFiles = append(cleanedProtoFiles, cp)
		}
	}

	e.mu.Lock()
	old := e.protoset
	e.protoset = pd
	e.loadedProtosetPaths = cleanedProtosets
	e.loadedProtoFiles = cleanedProtoFiles
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

func (e *Engine) currentLoadMode() string {
	e.mu.Lock()
	defer e.mu.Unlock()
	count := 0
	if len(e.loadedProtosetPaths) > 0 {
		count++
	}
	if len(e.loadedProtoFiles) > 0 {
		count++
	}
	if e.loadReflection {
		count++
	}
	switch {
	case count == 0:
		return ""
	case count > 1:
		return "mixed"
	case e.loadReflection:
		return "reflection"
	case len(e.loadedProtoFiles) > 0:
		return "proto"
	default:
		return "protoset"
	}
}

func (e *Engine) combinedLoadedPaths() []string {
	e.mu.Lock()
	defer e.mu.Unlock()
	paths := append([]string(nil), e.loadedProtosetPaths...)
	paths = append(paths, e.loadedProtoFiles...)
	return util.DedupeStrings(paths)
}

// ─── Invocation ──────────────────────────────────────────────────────────────

func (e *Engine) InvokeUnary(ctx context.Context, req rpc.InvokeRequest) (*rpc.InvokeResponse, error) {
	e.mu.Lock()
	conn := e.conn
	pd := e.protoset
	env := e.activeEnv
	defaultMeta := e.defaultMetadata
	allowShell := e.allowShellCommands
	inheritEnv := e.inheritShellEnv
	emitDefaults := e.emitDefaults
	ctx, cancel := context.WithCancel(ctx)
	e.unaryCancelSeq++
	cancelSeq := e.unaryCancelSeq
	e.unaryCancel = cancel
	e.mu.Unlock()

	defer func() {
		cancel()
		e.mu.Lock()
		if e.unaryCancelSeq == cancelSeq {
			e.unaryCancel = nil
		}
		e.mu.Unlock()
	}()

	if conn == nil {
		logger.Default.Errorf("invoke unary %s failed: not connected", req.MethodPath)
		return nil, fmt.Errorf("not connected — call Connect first")
	}
	if pd == nil {
		logger.Default.Errorf("invoke unary %s failed: no descriptor loaded", req.MethodPath)
		return nil, fmt.Errorf("no descriptor loaded — load a protoset or use reflection")
	}

	logger.Default.Infof("invoke unary: %s", req.MethodPath)
	req = interpolateRequest(req, defaultMeta, env, allowShell, inheritEnv)
	req.EmitDefaults = emitDefaults

	resp, err := rpc.InvokeUnary(ctx, conn, pd, req)
	if err != nil {
		logger.Default.Errorf("invoke unary %s failed: %v", req.MethodPath, err)
		return nil, err
	}

	if resp.Error != "" {
		logger.Default.Errorf("invoke unary %s failed: %s", req.MethodPath, resp.Error)
	} else {
		logger.Default.Infof("invoke unary %s complete: %s (%dms)", req.MethodPath, resp.Status, resp.DurationMs)
	}

	if e.histStore != nil {
		if err := e.histStore.Add(storage.HistoryEntry{
			ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
			MethodPath:  req.MethodPath,
			RequestJSON: req.RequestJSON,
			Metadata:    req.Metadata,
			Response:    resp,
			InvokedAt:   time.Now().Format(time.RFC3339Nano),
		}); err != nil {
			logger.Default.Warnf("recording history for %s failed: %v", req.MethodPath, err)
		}
	}
	return resp, nil
}

func (e *Engine) CancelUnary() {
	e.mu.Lock()
	cancel := e.unaryCancel
	e.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

func (e *Engine) InvokeStream(
	ctx context.Context,
	req rpc.InvokeRequest,
	cb func(rpc.StreamEvent),
	done func(error),
) error {
	e.mu.Lock()
	conn := e.conn
	pd := e.protoset
	env := e.activeEnv
	defaultMeta := e.defaultMetadata
	allowShell := e.allowShellCommands
	inheritEnv := e.inheritShellEnv
	emitDefaults := e.emitDefaults
	oldCancel := e.streamCancel
	ctx, cancel := context.WithCancel(ctx)
	e.streamCancelSeq++
	cancelSeq := e.streamCancelSeq
	e.streamCancel = cancel
	e.mu.Unlock()

	if oldCancel != nil {
		oldCancel()
	}

	if conn == nil {
		cancel()
		logger.Default.Errorf("invoke stream %s failed: not connected", req.MethodPath)
		return fmt.Errorf("not connected")
	}
	if pd == nil {
		cancel()
		logger.Default.Errorf("invoke stream %s failed: no descriptor loaded", req.MethodPath)
		return fmt.Errorf("no descriptor loaded")
	}

	logger.Default.Infof("invoke stream: %s", req.MethodPath)
	req = interpolateRequest(req, defaultMeta, env, allowShell, inheritEnv)
	req.EmitDefaults = emitDefaults

	go func() {
		defer func() {
			cancel()
			e.mu.Lock()
			if e.streamCancelSeq == cancelSeq {
				e.streamCancel = nil
			}
			e.mu.Unlock()
		}()
		err := rpc.InvokeStream(ctx, conn, pd, req, cb)
		done(err)
	}()
	return nil
}

func (e *Engine) CancelStream() {
	e.mu.Lock()
	cancel := e.streamCancel
	e.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func interpolateRequest(req rpc.InvokeRequest, defaultMeta []rpc.MetadataEntry, env *storage.Environment, allowShell bool, inheritEnv bool) rpc.InvokeRequest {
	for i, m := range req.Metadata {
		if resolved := resolveHeaderValue(m.Value, allowShell, inheritEnv); resolved != m.Value {
			req.Metadata[i].Value = resolved
		}
	}

	if len(defaultMeta) == 0 && (env == nil || len(env.Headers) == 0) {
		return req
	}

	requestKeys := make(map[string]bool, len(req.Metadata))
	for _, entry := range req.Metadata {
		key := strings.TrimSpace(entry.Key)
		if key == "" {
			continue
		}
		requestKeys[strings.ToLower(key)] = true
	}

	envMeta := make([]rpc.MetadataEntry, 0)
	envKeys := make(map[string]bool)
	if env != nil {
		for _, h := range env.Headers {
			key := strings.TrimSpace(h.Key)
			if key == "" {
				continue
			}
			lower := strings.ToLower(key)
			if requestKeys[lower] || envKeys[lower] {
				continue
			}
			envKeys[lower] = true
			envMeta = append(envMeta, rpc.MetadataEntry{Key: key, Value: resolveHeaderValue(h.Value, allowShell, inheritEnv)})
		}
	}

	defaultOut := make([]rpc.MetadataEntry, 0, len(defaultMeta))
	for _, m := range defaultMeta {
		key := strings.TrimSpace(m.Key)
		if key == "" {
			continue
		}
		lower := strings.ToLower(key)
		if requestKeys[lower] || envKeys[lower] {
			continue
		}
		defaultOut = append(defaultOut, rpc.MetadataEntry{Key: key, Value: resolveHeaderValue(m.Value, allowShell, inheritEnv)})
	}

	req.Metadata = append(defaultOut, append(envMeta, req.Metadata...)...)
	return req
}

// resolveHeaderValue resolves dynamic syntax in a header value string:
//
//   - ${VAR_NAME}  → os.Getenv("VAR_NAME"); empty string if unset
//   - $(command)   → stdout of the command run via sh/cmd; trimmed (when enabled)
//
// Resolution failures are logged and replaced with an empty string so the
// request still proceeds. Values without either syntax are returned unchanged.
func resolveHeaderValue(val string, allowShell bool, inheritEnv bool) string {
	hasEnvVar := strings.Contains(val, "${")
	hasShellCmd := strings.Contains(val, "$(")
	if !hasEnvVar && !hasShellCmd {
		return val
	}

	if allowShell && hasShellCmd {
		// Resolve $(command) first. Note: env-var substitution below will run on the full
		// result, so any ${VAR} in command output will be evaluated in the second pass.
		val = reShellCmd.ReplaceAllStringFunc(val, func(match string) string {
			cmd := reShellCmd.FindStringSubmatch(match)[1]
			out, err := runShellCommand(cmd, inheritEnv)
			if err != nil {
				logger.Default.Warnf("header command %q failed: %v", cmd, err)
				return ""
			}
			return out
		})
	}

	// Resolve ${VAR_NAME}.
	if hasEnvVar {
		val = reEnvVar.ReplaceAllStringFunc(val, func(match string) string {
			name := reEnvVar.FindStringSubmatch(match)[1]
			return os.Getenv(strings.TrimSpace(name))
		})
	}

	return val
}

// runShellCommand executes cmd via the platform shell and returns trimmed stdout.
// A 5-second context deadline prevents hangs.
// When inheritEnv is true, the command has access to the parent process environment.
func runShellCommand(cmd string, inheritEnv bool) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var c *exec.Cmd
	if runtime.GOOS == "windows" {
		c = exec.CommandContext(ctx, "cmd", "/c", cmd)
	} else {
		c = exec.CommandContext(ctx, "sh", "-c", cmd)
	}

	// If inheritEnv is true, inherit the parent process environment.
	if inheritEnv {
		c.Env = os.Environ()
	}

	var stdout, stderr bytes.Buffer
	c.Stdout = &stdout
	c.Stderr = &stderr

	if err := c.Run(); err != nil {
		return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return strings.TrimSpace(stdout.String()), nil
}

// SaveWindowState persists the window size and position in settings.
func (e *Engine) SaveWindowState(width, height, x, y int) {
	e.saveSettings(func(s *storage.AppSettings) {
		s.WindowWidth = &width
		s.WindowHeight = &height
		s.WindowX = &x
		s.WindowY = &y
	})
}
