package backend

import (
	"path/filepath"
	"testing"

	"github.com/CosmicMunkey/grpc-nimbus/internal/rpc"
	"github.com/CosmicMunkey/grpc-nimbus/internal/storage"
)

// newTestEngine builds a minimal Engine with a temporary env store and settings store.
func newTestEngine(t *testing.T) *Engine {
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

	return &Engine{
		envStore: envStore,
		settings: settingsStore,
	}
}

// TestSaveEnvironmentRefreshesActiveEnv verifies that editing an active
// environment updates e.activeEnv in memory so that subsequent RPCs use the
// new headers rather than stale ones.
func TestSaveEnvironmentRefreshesActiveEnv(t *testing.T) {
	e := newTestEngine(t)

	env := storage.Environment{
		ID:   "env1",
		Name: "prod",
		Headers: []storage.EnvHeader{
			{Key: "authorization", Value: "Bearer old-token"},
		},
	}
	if err := e.SaveEnvironment(env); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}
	if err := e.SetActiveEnvironment("env1"); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}

	// Sanity-check the initial header value.
	e.mu.Lock()
	got := e.activeEnv.Headers[0].Value
	e.mu.Unlock()
	if got != "Bearer old-token" {
		t.Fatalf("expected old token, got %q", got)
	}

	// Now update the environment (simulates the user editing the auth token).
	env.Headers[0].Value = "Bearer new-token"
	if err := e.SaveEnvironment(env); err != nil {
		t.Fatalf("SaveEnvironment (update): %v", err)
	}

	// e.activeEnv must be refreshed immediately — no restart required.
	e.mu.Lock()
	got = e.activeEnv.Headers[0].Value
	e.mu.Unlock()
	if got != "Bearer new-token" {
		t.Errorf("expected e.activeEnv to be refreshed to new token, got %q", got)
	}
}

// TestSaveEnvironmentDoesNotTouchOtherActiveEnv verifies that saving an env
// that is NOT the active one leaves e.activeEnv unchanged.
func TestSaveEnvironmentDoesNotTouchOtherActiveEnv(t *testing.T) {
	e := newTestEngine(t)

	active := storage.Environment{
		ID:      "active",
		Name:    "active",
		Headers: []storage.EnvHeader{{Key: "x-custom", Value: "active-value"}},
	}
	other := storage.Environment{ID: "other", Name: "other"}

	if err := e.SaveEnvironment(active); err != nil {
		t.Fatalf("SaveEnvironment (active): %v", err)
	}
	if err := e.SaveEnvironment(other); err != nil {
		t.Fatalf("SaveEnvironment (other): %v", err)
	}
	if err := e.SetActiveEnvironment("active"); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}

	// Save the OTHER env — should not affect the active env pointer.
	other.Name = "other-updated"
	if err := e.SaveEnvironment(other); err != nil {
		t.Fatalf("SaveEnvironment (other update): %v", err)
	}

	e.mu.Lock()
	gotID := e.activeEnv.ID
	e.mu.Unlock()
	if gotID != "active" {
		t.Errorf("active env changed unexpectedly, got ID %q", gotID)
	}
}

// TestSetActiveEnvironmentPersistsID verifies that SetActiveEnvironment writes
// the environment ID to AppSettings so it survives an app restart.
func TestSetActiveEnvironmentPersistsID(t *testing.T) {
	e := newTestEngine(t)

	env := storage.Environment{ID: "env1", Name: "prod"}
	if err := e.SaveEnvironment(env); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}
	if err := e.SetActiveEnvironment("env1"); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}

	saved, err := e.settings.Load()
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
	e := newTestEngine(t)

	env := storage.Environment{ID: "env1", Name: "prod"}
	if err := e.SaveEnvironment(env); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}
	if err := e.SetActiveEnvironment("env1"); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}

	// Now clear the active environment.
	if err := e.SetActiveEnvironment(""); err != nil {
		t.Fatalf("SetActiveEnvironment (clear): %v", err)
	}

	saved, err := e.settings.Load()
	if err != nil {
		t.Fatalf("Load settings: %v", err)
	}
	if saved.ActiveEnvironmentID != "" {
		t.Errorf("expected empty ActiveEnvironmentID after clear, got %q", saved.ActiveEnvironmentID)
	}
	e.mu.Lock()
	activeEnv := e.activeEnv
	e.mu.Unlock()
	if activeEnv != nil {
		t.Errorf("expected e.activeEnv to be nil after clear, got %+v", activeEnv)
	}
}

// TestGetLoadedStateIncludesActiveEnvironmentID verifies that GetLoadedState
// returns the persisted active environment ID for frontend restoration.
func TestGetLoadedStateIncludesActiveEnvironmentID(t *testing.T) {
	e := newTestEngine(t)

	// Pre-write settings with an active environment ID.
	e.saveSettings(func(s *storage.AppSettings) {
		s.ActiveEnvironmentID = "env42"
	})

	saved, mode, paths, protosets, protoFiles, svcs, err := e.GetLoadedState()
	if err != nil {
		t.Fatalf("GetLoadedState: %v", err)
	}
	_ = mode
	_ = paths
	_ = protosets
	_ = protoFiles
	_ = svcs
	if saved == nil || saved.ActiveEnvironmentID != "env42" {
		t.Errorf("expected ActiveEnvironmentID %q, got %q", "env42", saved.ActiveEnvironmentID)
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

	got := interpolateRequest(req, nil, env, false, false)
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
