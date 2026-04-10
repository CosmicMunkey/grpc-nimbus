package main

import (
	"fmt"

	"grpc-nimbus/internal/storage"
)

// ListCollections returns all saved request collections.
func (a *App) ListCollections() ([]storage.Collection, error) {
	if a.store == nil {
		return nil, nil
	}
	return a.store.ListCollections()
}

// SaveCollection creates or updates a collection on disk.
func (a *App) SaveCollection(col storage.Collection) error {
	if a.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	return a.store.SaveCollection(col)
}

// DeleteCollection removes a collection by ID.
func (a *App) DeleteCollection(id string) error {
	if a.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	return a.store.DeleteCollection(id)
}

// GetCollection returns a single collection by ID.
func (a *App) GetCollection(id string) (*storage.Collection, error) {
	if a.store == nil {
		return nil, fmt.Errorf("collection store unavailable")
	}
	return a.store.GetCollection(id)
}

// ExportCollection writes a portable, self-contained collection bundle to destPath.
// Protoset files referenced by the collection are embedded in the output so the
// export can be shared with colleagues on different machines.
func (a *App) ExportCollection(id, destPath string) error {
	if a.store == nil {
		return fmt.Errorf("collection store unavailable")
	}
	return a.store.ExportPortable(id, destPath)
}

// ImportCollection reads a collection JSON from srcPath and saves it with a new ID.
func (a *App) ImportCollection(srcPath string) (*storage.Collection, error) {
	if a.store == nil {
		return nil, fmt.Errorf("collection store unavailable")
	}
	return a.store.ImportCollection(srcPath)
}
