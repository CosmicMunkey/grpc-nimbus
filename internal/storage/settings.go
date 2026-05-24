package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/CosmicMunkey/grpc-nimbus/internal/logger"
	"github.com/CosmicMunkey/grpc-nimbus/internal/rpc"
)

// CustomThemeEntry is a user-saved named color theme.
type CustomThemeEntry struct {
	ID     string            `json:"id"`
	Name   string            `json:"name"`
	Tokens map[string]string `json:"tokens"`
}

// AppSettings holds persistent application configuration that survives restarts.
type AppSettings struct {
	// Proto descriptor source
	ProtoLoadMode    string   `json:"protoLoadMode,omitempty"`    // "protoset" or "proto"
	ProtosetPaths    []string `json:"protosetPaths,omitempty"`    // loaded .protoset file paths
	ProtoImportPaths []string `json:"protoImportPaths,omitempty"` // -I import directories for .proto
	ProtoFilePaths   []string `json:"protoFilePaths,omitempty"`   // loaded .proto file paths

	// Last-used connection
	LastTarget string `json:"lastTarget,omitempty"` // e.g. "localhost:50051"
	LastTLS    string `json:"lastTLS,omitempty"`    // e.g. "none", "system"

	// Active environment
	ActiveEnvironmentID string `json:"activeEnvironmentId,omitempty"`

	// User preferences
	ConfirmDeletes      *bool `json:"confirmDeletes,omitempty"`      // nil → default true
	TimestampInputLocal *bool `json:"timestampInputLocal,omitempty"` // nil → default false (UTC input)
	ConfirmClearHistory *bool `json:"confirmClearHistory,omitempty"` // nil → default false

	// Response
	EmitDefaults *bool `json:"emitDefaults,omitempty"` // nil → default false (omit zero-value fields)

	// Appearance
	EnvSortByCreated    *bool              `json:"envSortByCreated,omitempty"`    // nil → false (alphabetical); true → by creation time
	ThemeBadge          string             `json:"themeBadge,omitempty"`          // decorative icon badge: "" | "rainbow" | "trans" | "nonbinary"
	Theme               string             `json:"theme,omitempty"`               // "nimbus" | "dark" | "light" | "custom" | colorblind presets
	CustomTheme         map[string]string  `json:"customTheme,omitempty"`         // legacy single custom theme (migrated on load)
	CustomThemes        []CustomThemeEntry `json:"customThemes,omitempty"`        // named custom themes
	ActiveCustomThemeID string             `json:"activeCustomThemeId,omitempty"` // ID of the active custom theme
	FontSize            *int               `json:"fontSize,omitempty"`            // body font size in px; nil → 16
	ResponseWordWrap    *bool              `json:"responseWordWrap,omitempty"`    // nil → default true
	ResponseIndent      *int               `json:"responseIndent,omitempty"`      // nil → default 2

	// Layout
	SidebarWidth *float64 `json:"sidebarWidth,omitempty"` // sidebar width in px; nil → 256
	PanelSplit   *float64 `json:"panelSplit,omitempty"`   // request/response split fraction; nil → 0.5

	// Request defaults
	DefaultTimeoutSeconds *float64            `json:"defaultTimeoutSeconds,omitempty"` // nil → 0 (no timeout)
	HistoryLimit          *int                `json:"historyLimit,omitempty"`          // nil → 50; 0 = use default; negative = unlimited
	AutoConnectOnStartup  *bool               `json:"autoConnectOnStartup,omitempty"`  // nil → false
	AllowShellCommands    *bool               `json:"allowShellCommands,omitempty"`    // nil → false
	InheritShellEnv       *bool               `json:"inheritShellEnv,omitempty"`       // nil → false
	MaxStreamMessages     *int                `json:"maxStreamMessages,omitempty"`     // nil → 200; 0 = unlimited
	DefaultMetadata       []rpc.MetadataEntry `json:"defaultMetadata,omitempty"`       // global headers for all requests

	// Debug
	ShowDebugIndicator *bool `json:"showDebugIndicator,omitempty"` // nil → default false

	// Window state
	WindowWidth  *int `json:"windowWidth,omitempty"`  // window width in px
	WindowHeight *int `json:"windowHeight,omitempty"` // window height in px
	WindowX      *int `json:"windowX,omitempty"`      // window X position in px
	WindowY      *int `json:"windowY,omitempty"`      // window Y position in px
}

// SettingsStore persists AppSettings as a single JSON file.
// Load is safe for concurrent use; Save and Update are serialized.
type SettingsStore struct {
	mu    sync.RWMutex
	path  string
	cache *AppSettings
}

// NewSettingsStore creates a SettingsStore using the OS config directory.
func NewSettingsStore() (*SettingsStore, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(configDir, appDirName)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}
	return NewSettingsStoreAt(filepath.Join(dir, "settings.json"))
}

// NewSettingsStoreAt creates a SettingsStore using the given file path.
func NewSettingsStoreAt(path string) (*SettingsStore, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, err
	}
	return &SettingsStore{path: path}, nil
}

// Load reads settings from the in-memory cache or disk.
// Returns empty settings if the file doesn't exist.
func (s *SettingsStore) Load() (*AppSettings, error) {
	s.mu.RLock()
	if s.cache != nil {
		cp := *s.cache
		s.mu.RUnlock()
		return &cp, nil
	}
	s.mu.RUnlock()

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.cache != nil {
		cp := *s.cache
		return &cp, nil
	}

	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			s.cache = &AppSettings{}
			return &AppSettings{}, nil
		}
		return nil, err
	}
	var settings AppSettings
	if err := json.Unmarshal(data, &settings); err != nil {
		logger.Default.Warnf("corrupt settings file %q — returning defaults: %v", s.path, err)
		s.cache = &AppSettings{}
		return &AppSettings{}, nil
	}
	s.cache = &settings
	cp := *s.cache
	return &cp, nil
}

// atomicWrite writes data to a temp file then renames it to s.path.
// Must be called with s.mu held.
func (s *SettingsStore) atomicWrite(data []byte) error {
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

// saveLocked marshals settings, writes them atomically, and updates the cache.
// Must be called with s.mu held. Stores a copy in cache to avoid aliasing.
func (s *SettingsStore) saveLocked(settings *AppSettings) error {
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	if err := s.atomicWrite(data); err != nil {
		return err
	}
	cp := *settings
	s.cache = &cp
	return nil
}

// Save writes settings to disk atomically (write to temp file then rename).
func (s *SettingsStore) Save(settings *AppSettings) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.saveLocked(settings)
}

// Update loads the current settings, applies the mutation, and saves the result.
// The entire read-mutate-write sequence is serialized, so concurrent calls are safe.
func (s *SettingsStore) Update(mutate func(*AppSettings)) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	current := s.cache
	if current == nil {
		current = &AppSettings{}
		data, err := os.ReadFile(s.path)
		if err == nil {
			_ = json.Unmarshal(data, current)
		}
		s.cache = current
	}

	mutate(current)
	return s.saveLocked(current)
}
