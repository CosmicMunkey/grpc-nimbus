package main

import (
	"fmt"

	"grpc-nimbus/internal/storage"
)

// UserSettings holds user-configurable preferences exposed to the frontend.
type UserSettings struct {
	ConfirmDeletes bool              `json:"confirmDeletes"`
	Theme          string            `json:"theme"`
	CustomTheme    map[string]string `json:"customTheme,omitempty"`
	FontSize       int               `json:"fontSize"`
}

// GetUserSettings returns the current user preference settings.
func (a *App) GetUserSettings() UserSettings {
	defaults := UserSettings{ConfirmDeletes: true, Theme: "nimbus", FontSize: 16}
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
	if saved.Theme != "" {
		result.Theme = saved.Theme
	}
	if saved.CustomTheme != nil {
		result.CustomTheme = saved.CustomTheme
	}
	if saved.FontSize != nil {
		result.FontSize = *saved.FontSize
	}
	return result
}

// SaveUserSettings persists user preference settings.
func (a *App) SaveUserSettings(s UserSettings) {
	go a.saveSettings(func(settings *storage.AppSettings) {
		settings.ConfirmDeletes = &s.ConfirmDeletes
		settings.Theme = s.Theme
		settings.CustomTheme = s.CustomTheme
		settings.FontSize = &s.FontSize
	})
}

// saveSettings merges a settings mutation into the persisted settings file.
// Safe to call from goroutines (goroutine-level serialization is acceptable
// since saves are infrequent and SettingsStore.Save is atomic via rename).
func (a *App) saveSettings(mutate func(*storage.AppSettings)) {
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
