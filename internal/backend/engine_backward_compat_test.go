package backend

import (
	"encoding/json"
	"testing"

	"github.com/CosmicMunkey/grpc-nimbus/internal/storage"
)

// TestBackwardCompatibility_OldSettingsFileWithoutInheritShellEnv
// verifies that settings files created before InheritShellEnv was added
// can still be loaded and default to false (opt-in behavior).
func TestBackwardCompatibility_OldSettingsFileWithoutInheritShellEnv(t *testing.T) {
	// Simulate an old settings.json without the inheritShellEnv field
	oldSettingsJSON := []byte(`{
		"allowShellCommands": true,
		"emitDefaults": false
	}`)

	var settings storage.AppSettings
	if err := json.Unmarshal(oldSettingsJSON, &settings); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}

	// Verify that inheritShellEnv is nil (unset) after unmarshal
	if settings.InheritShellEnv != nil {
		t.Errorf("expected InheritShellEnv to be nil after unmarshal, got %v", settings.InheritShellEnv)
	}

	// When nil, it should be treated as false (opt-in)
	isInheriting := settings.InheritShellEnv != nil && *settings.InheritShellEnv
	if isInheriting {
		t.Errorf("old settings should default to not inheriting, but got true")
	}
}

// TestBackwardCompatibility_NewSettingsFileWithInheritShellEnv verifies that new
// settings files with InheritShellEnv can be unmarshaled correctly.
func TestBackwardCompatibility_NewSettingsFileWithInheritShellEnv(t *testing.T) {
	trueVal := true
	newSettingsJSON := []byte(`{
		"allowShellCommands": true,
		"inheritShellEnv": true,
		"emitDefaults": false
	}`)

	var settings storage.AppSettings
	if err := json.Unmarshal(newSettingsJSON, &settings); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}

	if settings.InheritShellEnv == nil {
		t.Fatalf("InheritShellEnv should be set after unmarshal")
	}

	if *settings.InheritShellEnv != trueVal {
		t.Errorf("expected InheritShellEnv to be true, got %v", *settings.InheritShellEnv)
	}
}
