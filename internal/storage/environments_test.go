package storage

import "testing"

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
