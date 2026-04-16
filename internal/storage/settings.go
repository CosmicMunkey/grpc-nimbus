package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// AppSettings holds persistent application configuration that survives restarts.
type AppSettings struct {
	// Proto descriptor source
	ProtoLoadMode    string   `json:"protoLoadMode,omitempty"`    // "protoset" or "proto"
	ProtosetPaths    []string `json:"protosetPaths,omitempty"`    // loaded .protoset file paths
	ProtoImportPaths []string `json:"protoImportPaths,omitempty"` // -I import directories for .proto
	ProtoFilePaths   []string `json:"protoFilePaths,omitempty"`   // loaded .proto file paths

	// Last-used connection
	LastTarget string `json:"lastTarget,omitempty"` // e.g. "localhost:50051"
	LastTLS    string `json:"lastTLS,omitempty"`    // e.g. "none", "system", "insecure_skip"

	// Active environment
	ActiveEnvironmentID string `json:"activeEnvironmentId,omitempty"`

	// User preferences
	ConfirmDeletes      *bool `json:"confirmDeletes,omitempty"`      // nil → default true
	TimestampInputLocal *bool `json:"timestampInputLocal,omitempty"` // nil → default false (UTC input)

	// Appearance
	Theme       string            `json:"theme,omitempty"`       // "nimbus" | "dracula" | "light" | "custom"; nil → "nimbus"
	CustomTheme map[string]string `json:"customTheme,omitempty"` // token→hex map when theme=="custom"
	FontSize    *int              `json:"fontSize,omitempty"`    // body font size in px; nil → 14

	// Layout
	SidebarWidth *float64 `json:"sidebarWidth,omitempty"` // sidebar width in px; nil → 256
	PanelSplit   *float64 `json:"panelSplit,omitempty"`   // request/response split fraction; nil → 0.5
}

// SettingsStore persists AppSettings as a single JSON file.
type SettingsStore struct {
	path string
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

// Load reads settings from disk. Returns empty settings if the file doesn't exist.
func (s *SettingsStore) Load() (*AppSettings, error) {
	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return &AppSettings{}, nil
		}
		return nil, err
	}
	var settings AppSettings
	if err := json.Unmarshal(data, &settings); err != nil {
		// Corrupt file — return empty settings rather than failing
		return &AppSettings{}, nil
	}
	return &settings, nil
}

// Save writes settings to disk atomically (write to temp file then rename).
func (s *SettingsStore) Save(settings *AppSettings) error {
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}
