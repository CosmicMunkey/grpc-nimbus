package main

import (
	"fmt"

	"github.com/CosmicMunkey/grpc-nimbus/internal/logger"
	"github.com/CosmicMunkey/grpc-nimbus/internal/storage"
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
		logger.Default.Errorf("save collection %q failed: store unavailable", col.Name)
		return fmt.Errorf("collection store unavailable")
	}
	logger.Default.Infof("saving collection %q", col.Name)
	if err := a.store.SaveCollection(col); err != nil {
		logger.Default.Errorf("save collection %q failed: %v", col.Name, err)
		return err
	}
	return nil
}

// DeleteCollection removes a collection by ID.
func (a *App) DeleteCollection(id string) error {
	if a.store == nil {
		logger.Default.Errorf("delete collection %s failed: store unavailable", id)
		return fmt.Errorf("collection store unavailable")
	}
	logger.Default.Infof("deleting collection %s", id)
	if err := a.store.DeleteCollection(id); err != nil {
		logger.Default.Errorf("delete collection %s failed: %v", id, err)
		return err
	}
	return nil
}

// GetCollection returns a single collection by ID.
func (a *App) GetCollection(id string) (*storage.Collection, error) {
	if a.store == nil {
		logger.Default.Errorf("get collection %s failed: store unavailable", id)
		return nil, fmt.Errorf("collection store unavailable")
	}
	col, err := a.store.GetCollection(id)
	if err != nil {
		logger.Default.Errorf("get collection %s failed: %v", id, err)
		return nil, err
	}
	return col, nil
}

// ExportCollection writes a portable, self-contained collection bundle to destPath.
// Protoset files and proto sources referenced by the collection are embedded so the
// export can be shared with colleagues on different machines.
func (a *App) ExportCollection(id, destPath string) error {
	if a.store == nil {
		logger.Default.Errorf("export collection %s failed: store unavailable", id)
		return fmt.Errorf("collection store unavailable")
	}
	logger.Default.Infof("exporting collection %s to %s", id, destPath)
	if err := a.store.ExportPortable(id, destPath); err != nil {
		logger.Default.Errorf("export collection %s failed: %v", id, err)
		return err
	}
	logger.Default.Infof("collection exported: %s", destPath)
	return nil
}

// ImportCollection reads a collection JSON from srcPath and saves it with a new ID.
func (a *App) ImportCollection(srcPath string) (*storage.Collection, error) {
	if a.store == nil {
		logger.Default.Errorf("import collection from %s failed: store unavailable", srcPath)
		return nil, fmt.Errorf("collection store unavailable")
	}
	logger.Default.Infof("importing collection from %s", srcPath)
	col, err := a.store.ImportCollection(srcPath)
	if err != nil {
		logger.Default.Errorf("import collection failed: %v", err)
		return nil, err
	}
	logger.Default.Infof("collection imported: %q", col.Name)
	return col, nil
}
