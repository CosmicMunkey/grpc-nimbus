package main

import (
	"path/filepath"
	"testing"

	"grpc-nimbus/internal/rpc"
	"grpc-nimbus/internal/storage"
)

// newTestApp builds a minimal App with a temporary env store and settings store.
func newTestApp(t *testing.T) *App {
	t.Helper()
	dir := t.TempDir()

	envStore, err := storage.NewEnvStoreAt(filepath.Join(dir, "environments"))
	if err != nil {
		t.Fatalf("NewEnvStoreAt: %v", err)
	}

	settingsStore, err := storage.NewSettingsStoreAt(filepath.Join(dir, "settings.json"))
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}

	return &App{
		envStore: envStore,
		settings: settingsStore,
	}
}

// TestSaveEnvironmentRefreshesActiveEnv verifies that editing an active
// environment updates a.activeEnv in memory so that subsequent RPCs use the
// new headers rather than stale ones.
func TestSaveEnvironmentRefreshesActiveEnv(t *testing.T) {
	a := newTestApp(t)

	env := storage.Environment{
		ID:   "env1",
		Name: "prod",
		Headers: []storage.EnvHeader{
			{Key: "authorization", Value: "Bearer old-token"},
		},
	}
	if err := a.SaveEnvironment(env); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}
	if err := a.SetActiveEnvironment("env1"); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}

	// Sanity-check the initial header value.
	a.mu.Lock()
	got := a.activeEnv.Headers[0].Value
	a.mu.Unlock()
	if got != "Bearer old-token" {
		t.Fatalf("expected old token, got %q", got)
	}

	// Now update the environment (simulates the user editing the auth token).
	env.Headers[0].Value = "Bearer new-token"
	if err := a.SaveEnvironment(env); err != nil {
		t.Fatalf("SaveEnvironment (update): %v", err)
	}

	// a.activeEnv must be refreshed immediately — no restart required.
	a.mu.Lock()
	got = a.activeEnv.Headers[0].Value
	a.mu.Unlock()
	if got != "Bearer new-token" {
		t.Errorf("expected a.activeEnv to be refreshed to new token, got %q", got)
	}
}

// TestSaveEnvironmentDoesNotTouchOtherActiveEnv verifies that saving an env
// that is NOT the active one leaves a.activeEnv unchanged.
func TestSaveEnvironmentDoesNotTouchOtherActiveEnv(t *testing.T) {
	a := newTestApp(t)

	active := storage.Environment{
		ID:      "active",
		Name:    "active",
		Headers: []storage.EnvHeader{{Key: "x-custom", Value: "active-value"}},
	}
	other := storage.Environment{ID: "other", Name: "other"}

	if err := a.SaveEnvironment(active); err != nil {
		t.Fatalf("SaveEnvironment (active): %v", err)
	}
	if err := a.SaveEnvironment(other); err != nil {
		t.Fatalf("SaveEnvironment (other): %v", err)
	}
	if err := a.SetActiveEnvironment("active"); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}

	// Save the OTHER env — should not affect the active env pointer.
	other.Name = "other-updated"
	if err := a.SaveEnvironment(other); err != nil {
		t.Fatalf("SaveEnvironment (other update): %v", err)
	}

	a.mu.Lock()
	gotID := a.activeEnv.ID
	a.mu.Unlock()
	if gotID != "active" {
		t.Errorf("active env changed unexpectedly, got ID %q", gotID)
	}
}

// TestSetActiveEnvironmentPersistsID verifies that SetActiveEnvironment writes
// the environment ID to AppSettings so it survives an app restart.
func TestSetActiveEnvironmentPersistsID(t *testing.T) {
	a := newTestApp(t)

	env := storage.Environment{ID: "env1", Name: "prod"}
	if err := a.SaveEnvironment(env); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}
	if err := a.SetActiveEnvironment("env1"); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}

	saved, err := a.settings.Load()
	if err != nil {
		t.Fatalf("Load settings: %v", err)
	}
	if saved.ActiveEnvironmentID != "env1" {
		t.Errorf("expected ActiveEnvironmentID %q, got %q", "env1", saved.ActiveEnvironmentID)
	}
}

// TestSetActiveEnvironmentClearsPersistenceOnEmpty verifies that clearing the
// active environment (empty ID) also clears the persisted setting.
func TestSetActiveEnvironmentClearsPersistenceOnEmpty(t *testing.T) {
	a := newTestApp(t)

	env := storage.Environment{ID: "env1", Name: "prod"}
	if err := a.SaveEnvironment(env); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}
	if err := a.SetActiveEnvironment("env1"); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}

	// Now clear the active environment.
	if err := a.SetActiveEnvironment(""); err != nil {
		t.Fatalf("SetActiveEnvironment (clear): %v", err)
	}

	saved, err := a.settings.Load()
	if err != nil {
		t.Fatalf("Load settings: %v", err)
	}
	if saved.ActiveEnvironmentID != "" {
		t.Errorf("expected empty ActiveEnvironmentID after clear, got %q", saved.ActiveEnvironmentID)
	}
	a.mu.Lock()
	activeEnv := a.activeEnv
	a.mu.Unlock()
	if activeEnv != nil {
		t.Errorf("expected a.activeEnv to be nil after clear, got %+v", activeEnv)
	}
}

// TestGetLoadedStateIncludesActiveEnvironmentID verifies that GetLoadedState
// returns the persisted active environment ID for frontend restoration.
func TestGetLoadedStateIncludesActiveEnvironmentID(t *testing.T) {
	a := newTestApp(t)

	// Pre-write settings with an active environment ID.
	a.saveSettings(func(s *storage.AppSettings) {
		s.ActiveEnvironmentID = "env42"
	})

	state, err := a.GetLoadedState()
	if err != nil {
		t.Fatalf("GetLoadedState: %v", err)
	}
	if state.ActiveEnvironmentID != "env42" {
		t.Errorf("expected ActiveEnvironmentID %q, got %q", "env42", state.ActiveEnvironmentID)
	}
}

func TestInterpolateRequestRequestMetadataOverridesEnvHeadersCaseInsensitive(t *testing.T) {
	env := &storage.Environment{
		ID:   "env1",
		Name: "prod",
		Headers: []storage.EnvHeader{
			{Key: "authorization", Value: "Bearer env"},
			{Key: "x-tenant", Value: "env-tenant"},
		},
	}

	req := rpc.InvokeRequest{
		Metadata: []rpc.MetadataEntry{
			{Key: "Authorization", Value: "Bearer request"},
			{Key: "x-trace", Value: "trace-1"},
		},
	}

	got := interpolateRequest(req, nil, env, false)
	if len(got.Metadata) != 3 {
		t.Fatalf("expected 3 metadata entries, got %d", len(got.Metadata))
	}

	if got.Metadata[0].Key != "x-tenant" || got.Metadata[0].Value != "env-tenant" {
		t.Fatalf("expected non-overridden env header first, got %+v", got.Metadata[0])
	}
	if got.Metadata[1].Key != "Authorization" || got.Metadata[1].Value != "Bearer request" {
		t.Fatalf("expected request authorization header preserved, got %+v", got.Metadata[1])
	}
	if got.Metadata[2].Key != "x-trace" || got.Metadata[2].Value != "trace-1" {
		t.Fatalf("expected request metadata preserved, got %+v", got.Metadata[2])
	}
}
