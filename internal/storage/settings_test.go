package storage

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func TestSettingsLoadSaveRoundTrip(t *testing.T) {
	store, err := NewSettingsStoreAt(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}

	saved, err := store.Load()
	if err != nil {
		t.Fatalf("first Load: %v", err)
	}
	val := true
	saved.ConfirmDeletes = &val
	if err := store.Save(saved); err != nil {
		t.Fatalf("Save: %v", err)
	}

	loaded, err := store.Load()
	if err != nil {
		t.Fatalf("second Load: %v", err)
	}
	if loaded.ConfirmDeletes == nil || *loaded.ConfirmDeletes != true {
		t.Fatal("expected ConfirmDeletes=true after round-trip")
	}
}

func TestSettingsLoadReturnsDefaultsForMissingFile(t *testing.T) {
	store, err := NewSettingsStoreAt(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}
	s, err := store.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if s.Theme != "" {
		t.Fatalf("expected empty Theme, got %q", s.Theme)
	}
}

func TestSettingsLoadReturnsDefaultsForCorruptFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	if err := os.WriteFile(path, []byte("{corrupt}"), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	store, err := NewSettingsStoreAt(path)
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}
	s, err := store.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if s.Theme != "" {
		t.Fatalf("expected empty Theme for corrupt file, got %q", s.Theme)
	}
}

func TestSettingsUpdateSetsAndPersists(t *testing.T) {
	store, err := NewSettingsStoreAt(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}

	if err := store.Update(func(s *AppSettings) {
		s.Theme = "dark"
	}); err != nil {
		t.Fatalf("Update: %v", err)
	}

	loaded, err := store.Load()
	if err != nil {
		t.Fatalf("Load after Update: %v", err)
	}
	if loaded.Theme != "dark" {
		t.Fatalf("expected Theme=dark after Update, got %q", loaded.Theme)
	}
}

func TestSettingsUpdateBuildsOnPreviousUpdate(t *testing.T) {
	store, err := NewSettingsStoreAt(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}

	theme := "dark"
	if err := store.Update(func(s *AppSettings) { s.Theme = theme }); err != nil {
		t.Fatalf("first Update: %v", err)
	}
	if err := store.Update(func(s *AppSettings) { s.LastTarget = "localhost:8080" }); err != nil {
		t.Fatalf("second Update: %v", err)
	}

	loaded, err := store.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if loaded.Theme != "dark" {
		t.Fatalf("expected Theme=dark, got %q", loaded.Theme)
	}
	if loaded.LastTarget != "localhost:8080" {
		t.Fatalf("expected LastTarget=localhost:8080, got %q", loaded.LastTarget)
	}
}

func TestSettingsCacheHit(t *testing.T) {
	store, err := NewSettingsStoreAt(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}

	if err := store.Update(func(s *AppSettings) { s.Theme = "dark" }); err != nil {
		t.Fatalf("Update: %v", err)
	}

	// Remove the file — a cache hit should still return cached settings
	if err := os.Remove(store.path); err != nil {
		t.Fatalf("Remove: %v", err)
	}

	s, err := store.Load()
	if err != nil {
		t.Fatalf("second Load (cache hit): %v", err)
	}
	if s.Theme != "dark" {
		t.Fatalf("expected Theme=dark from cache, got %q", s.Theme)
	}
}

func TestSettingsConcurrentLoad(t *testing.T) {
	store, err := NewSettingsStoreAt(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}

	if err := store.Update(func(s *AppSettings) { s.Theme = "blue" }); err != nil {
		t.Fatalf("Update: %v", err)
	}

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s, err := store.Load()
			if err != nil {
				t.Errorf("Load: %v", err)
			}
			if s.Theme != "blue" {
				t.Errorf("expected Theme=blue, got %q", s.Theme)
			}
		}()
	}
	wg.Wait()
}

func TestSettingsConcurrentUpdate(t *testing.T) {
	store, err := NewSettingsStoreAt(filepath.Join(t.TempDir(), "settings.json"))
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := store.Update(func(s *AppSettings) {
				s.Theme = "dark"
			}); err != nil {
				t.Errorf("Update: %v", err)
			}
		}()
	}
	wg.Wait()
}

func TestSettingsLoadReturnsErrorForPathIsDirectory(t *testing.T) {
	dir := t.TempDir()
	store, err := NewSettingsStoreAt(filepath.Join(dir, "settings.json"))
	if err != nil {
		t.Fatalf("NewSettingsStoreAt: %v", err)
	}
	// Create a valid file first, then replace with a directory
	if err := store.Save(&AppSettings{}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if err := os.Remove(store.path); err != nil {
		t.Fatalf("Remove: %v", err)
	}
	if err := os.Mkdir(store.path, 0755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}

	// Invalidate the cache so Load must re-read from disk
	store.mu.Lock()
	store.cache = nil
	store.mu.Unlock()

	_, err = store.Load()
	if err == nil {
		t.Fatal("expected error when settings path is a directory")
	}
}
