package main

import (
	"fmt"

	"grpc-nimbus/internal/rpc"
	"grpc-nimbus/internal/storage"
)

// CustomThemeEntry is a user-saved named color theme exposed to the frontend.
type CustomThemeEntry struct {
	ID     string            `json:"id"`
	Name   string            `json:"name"`
	Tokens map[string]string `json:"tokens"`
}

// UserSettings holds user-configurable preferences exposed to the frontend.
type UserSettings struct {
	ConfirmDeletes        bool                `json:"confirmDeletes"`
	TimestampInputLocal   bool                `json:"timestampInputLocal"`
	ConfirmClearHistory   bool                `json:"confirmClearHistory"`
	Theme                 string              `json:"theme"`
	CustomThemes          []CustomThemeEntry  `json:"customThemes"`
	ActiveCustomThemeID   string              `json:"activeCustomThemeId"`
	FontSize              int                 `json:"fontSize"`
	ResponseWordWrap      bool                `json:"responseWordWrap"`
	ResponseIndent        int                 `json:"responseIndent"`
	SidebarWidth          float64             `json:"sidebarWidth"`
	PanelSplit            float64             `json:"panelSplit"`
	DefaultTimeoutSeconds float64             `json:"defaultTimeoutSeconds"`
	HistoryLimit          int                 `json:"historyLimit"`
	AutoConnectOnStartup  bool                `json:"autoConnectOnStartup"`
	AllowShellCommands    bool                `json:"allowShellCommands"`
	MaxStreamMessages     int                 `json:"maxStreamMessages"`
	DefaultMetadata       []rpc.MetadataEntry `json:"defaultMetadata"`
	WindowWidth           int                 `json:"windowWidth"`
	WindowHeight          int                 `json:"windowHeight"`
	WindowX               int                 `json:"windowX"`
	WindowY               int                 `json:"windowY"`
}

// GetUserSettings returns the current user preference settings.
func (a *App) GetUserSettings() UserSettings {
	defaults := UserSettings{
		ConfirmDeletes:       true,
		TimestampInputLocal:  true,
		ConfirmClearHistory:  true,
		AutoConnectOnStartup: false,
		Theme:                "nimbus",
		FontSize:             16,
		ResponseWordWrap:     true,
		ResponseIndent:       2,
		SidebarWidth:         256,
		PanelSplit:           0.5,
		HistoryLimit:         50,
		AllowShellCommands:   false,
		MaxStreamMessages:    200,
		DefaultMetadata:      []rpc.MetadataEntry{},
		WindowWidth:          1280,
		WindowHeight:         800,
	}
	if a.settings == nil {
		return defaults
	}
	saved, err := a.settings.Load()
	if err != nil || saved == nil {
		return defaults
	}
	result := defaults
	if saved.ConfirmDeletes != nil {
		result.ConfirmDeletes = *saved.ConfirmDeletes
	}
	if saved.TimestampInputLocal != nil {
		result.TimestampInputLocal = *saved.TimestampInputLocal
	}
	if saved.ConfirmClearHistory != nil {
		result.ConfirmClearHistory = *saved.ConfirmClearHistory
	}
	if saved.Theme != "" {
		result.Theme = saved.Theme
	}
	if saved.FontSize != nil {
		result.FontSize = *saved.FontSize
	}
	if saved.ResponseWordWrap != nil {
		result.ResponseWordWrap = *saved.ResponseWordWrap
	}
	if saved.ResponseIndent != nil {
		result.ResponseIndent = *saved.ResponseIndent
	}
	if saved.SidebarWidth != nil {
		result.SidebarWidth = *saved.SidebarWidth
	}
	if saved.PanelSplit != nil {
		result.PanelSplit = *saved.PanelSplit
	}
	if saved.DefaultTimeoutSeconds != nil {
		result.DefaultTimeoutSeconds = *saved.DefaultTimeoutSeconds
	}
	if saved.HistoryLimit != nil {
		result.HistoryLimit = *saved.HistoryLimit
	}
	if saved.AutoConnectOnStartup != nil {
		result.AutoConnectOnStartup = *saved.AutoConnectOnStartup
	}
	if saved.AllowShellCommands != nil {
		result.AllowShellCommands = *saved.AllowShellCommands
	}
	if saved.MaxStreamMessages != nil {
		result.MaxStreamMessages = *saved.MaxStreamMessages
	}
	if saved.DefaultMetadata != nil {
		result.DefaultMetadata = saved.DefaultMetadata
	}
	if saved.WindowWidth != nil {
		result.WindowWidth = *saved.WindowWidth
	}
	if saved.WindowHeight != nil {
		result.WindowHeight = *saved.WindowHeight
	}
	if saved.WindowX != nil {
		result.WindowX = *saved.WindowX
	}
	if saved.WindowY != nil {
		result.WindowY = *saved.WindowY
	}

	// Migrate legacy single customTheme to a named entry.
	themes := migrateCustomThemes(saved)
	result.CustomThemes = themes
	activeID := saved.ActiveCustomThemeID
	if saved.Theme == "custom" && activeID == "" && len(themes) > 0 {
		activeID = themes[0].ID
	}
	result.ActiveCustomThemeID = activeID

	return result
}

// migrateCustomThemes returns the CustomThemes list from saved settings,
// auto-creating a "My Theme" entry from the legacy CustomTheme field if needed.
func migrateCustomThemes(saved *storage.AppSettings) []CustomThemeEntry {
	entries := make([]CustomThemeEntry, 0, len(saved.CustomThemes))
	for _, e := range saved.CustomThemes {
		entries = append(entries, CustomThemeEntry{ID: e.ID, Name: e.Name, Tokens: e.Tokens})
	}
	if len(entries) == 0 && len(saved.CustomTheme) > 0 {
		entries = append(entries, CustomThemeEntry{
			ID:     "my-theme",
			Name:   "My Theme",
			Tokens: saved.CustomTheme,
		})
	}
	return entries
}

// SaveUserSettings persists user preference settings.
func (a *App) SaveUserSettings(s UserSettings) {
	// Apply runtime-only state immediately (before the async disk write).
	a.mu.Lock()
	a.defaultMetadata = s.DefaultMetadata
	a.allowShellCommands = s.AllowShellCommands
	a.mu.Unlock()
	if a.histStore != nil {
		// HistoryLimit: 0 = default (50), negative = unlimited
		limit := s.HistoryLimit
		if limit == 0 {
			limit = 0 // store will use its own default
		}
		a.histStore.SetLimit(limit)
	}

	go a.saveSettings(func(settings *storage.AppSettings) {
		settings.ConfirmDeletes = &s.ConfirmDeletes
		settings.TimestampInputLocal = &s.TimestampInputLocal
		settings.ConfirmClearHistory = &s.ConfirmClearHistory
		settings.Theme = s.Theme
		settings.ActiveCustomThemeID = s.ActiveCustomThemeID
		settings.CustomTheme = nil // clear legacy field once new list is in use
		themes := make([]storage.CustomThemeEntry, 0, len(s.CustomThemes))
		for _, e := range s.CustomThemes {
			themes = append(themes, storage.CustomThemeEntry{ID: e.ID, Name: e.Name, Tokens: e.Tokens})
		}
		settings.CustomThemes = themes
		settings.FontSize = &s.FontSize
		settings.ResponseWordWrap = &s.ResponseWordWrap
		settings.ResponseIndent = &s.ResponseIndent
		settings.SidebarWidth = &s.SidebarWidth
		settings.PanelSplit = &s.PanelSplit
		settings.DefaultTimeoutSeconds = &s.DefaultTimeoutSeconds
		settings.HistoryLimit = &s.HistoryLimit
		settings.AutoConnectOnStartup = &s.AutoConnectOnStartup
		settings.AllowShellCommands = &s.AllowShellCommands
		settings.MaxStreamMessages = &s.MaxStreamMessages
		settings.DefaultMetadata = s.DefaultMetadata
		settings.WindowWidth = &s.WindowWidth
		settings.WindowHeight = &s.WindowHeight
		settings.WindowX = &s.WindowX
		settings.WindowY = &s.WindowY
	})
}

// saveSettings merges a settings mutation into the persisted settings file.
// Serialized via settingsMu to prevent concurrent read-modify-write races.
func (a *App) saveSettings(mutate func(*storage.AppSettings)) {
	a.settingsMu.Lock()
	defer a.settingsMu.Unlock()
	if a.settings == nil {
		return
	}
	current, err := a.settings.Load()
	if err != nil || current == nil {
		current = &storage.AppSettings{}
	}
	mutate(current)
	if err := a.settings.Save(current); err != nil {
		fmt.Printf("warning: could not save settings: %v\n", err)
	}
}
