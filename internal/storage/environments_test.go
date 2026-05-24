package storage

import (
	"os"
	"testing"
)

func TestSaveEnvironmentRejectsEmptyID(t *testing.T) {
	store, err := NewEnvStoreAt(t.TempDir())
	if err != nil {
		t.Fatalf("NewEnvStoreAt: %v", err)
	}

	err = store.SaveEnvironment(Environment{ID: " ", Name: "bad"})
	if err == nil {
		t.Fatal("expected error for empty environment id")
	}
}

func TestEnvironmentRoundTrip(t *testing.T) {
	store, err := NewEnvStoreAt(t.TempDir())
	if err != nil {
		t.Fatalf("NewEnvStoreAt: %v", err)
	}

	env := Environment{
		ID:     "env-1",
		Name:   "Test",
		Target: "localhost:50051",
		TLS:    "system",
		Headers: []EnvHeader{
			{Key: "authorization", Value: "bearer token"},
		},
	}
	if err := store.SaveEnvironment(env); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}

	loaded, err := store.GetEnvironment("env-1")
	if err != nil {
		t.Fatalf("GetEnvironment: %v", err)
	}
	if loaded.Name != "Test" || loaded.Target != "localhost:50051" || loaded.TLS != "system" {
		t.Fatalf("unexpected environment: %+v", loaded)
	}
	if len(loaded.Headers) != 1 || loaded.Headers[0].Key != "authorization" {
		t.Fatalf("unexpected headers: %+v", loaded.Headers)
	}
}

func TestListEnvironments(t *testing.T) {
	store, err := NewEnvStoreAt(t.TempDir())
	if err != nil {
		t.Fatalf("NewEnvStoreAt: %v", err)
	}

	envs, err := store.ListEnvironments()
	if err != nil {
		t.Fatalf("ListEnvironments (empty): %v", err)
	}
	if len(envs) != 0 {
		t.Fatalf("expected no environments, got %d", len(envs))
	}

	if err := store.SaveEnvironment(Environment{ID: "a", Name: "A"}); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}
	if err := store.SaveEnvironment(Environment{ID: "b", Name: "B"}); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}

	envs, err = store.ListEnvironments()
	if err != nil {
		t.Fatalf("ListEnvironments: %v", err)
	}
	if len(envs) != 2 {
		t.Fatalf("expected 2 environments, got %d", len(envs))
	}
}

func TestDeleteEnvironment(t *testing.T) {
	store, err := NewEnvStoreAt(t.TempDir())
	if err != nil {
		t.Fatalf("NewEnvStoreAt: %v", err)
	}

	if err := store.SaveEnvironment(Environment{ID: "del-me", Name: "Delete Me"}); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}
	if err := store.DeleteEnvironment("del-me"); err != nil {
		t.Fatalf("DeleteEnvironment: %v", err)
	}

	_, err = store.GetEnvironment("del-me")
	if err == nil {
		t.Fatal("expected error for deleted environment")
	}
}

func TestDeleteNonexistentEnvironmentReturnsNil(t *testing.T) {
	store, err := NewEnvStoreAt(t.TempDir())
	if err != nil {
		t.Fatalf("NewEnvStoreAt: %v", err)
	}
	if err := store.DeleteEnvironment("does-not-exist"); err != nil {
		t.Fatalf("expected no error deleting nonexistent: %v", err)
	}
}

func TestEnvironmentSkipsCorruptFile(t *testing.T) {
	dir := t.TempDir()
	store, err := NewEnvStoreAt(dir)
	if err != nil {
		t.Fatalf("NewEnvStoreAt: %v", err)
	}

	if err := store.SaveEnvironment(Environment{ID: "good", Name: "Good"}); err != nil {
		t.Fatalf("SaveEnvironment: %v", err)
	}
	if err := os.WriteFile(store.envFilePath("bad"), []byte("{corrupt}"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	envs, err := store.ListEnvironments()
	if err != nil {
		t.Fatalf("ListEnvironments: %v", err)
	}
	if len(envs) != 1 || envs[0].ID != "good" {
		t.Fatalf("expected 1 environment (good), got %d", len(envs))
	}
}
