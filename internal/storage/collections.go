package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	grpcinternal "grpc-nimbus/internal/grpc"
)

const appDirName = "grpc-nimbus"

// SavedRequest is a named gRPC request stored in a collection.
type SavedRequest struct {
	ID          string                      `json:"id"`
	Name        string                      `json:"name"`
	CollectionID string                     `json:"collectionId"`
	MethodPath  string                      `json:"methodPath"`
	RequestJSON string                      `json:"requestJson"`
	Metadata    []grpcinternal.MetadataEntry `json:"metadata"`
	Connection  grpcinternal.ConnectionConfig `json:"connection"`
	CreatedAt   time.Time                   `json:"createdAt"`
	UpdatedAt   time.Time                   `json:"updatedAt"`
}

// Collection is a named group of saved requests.
type Collection struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	ProtosetPaths []string     `json:"protosetPaths"`
	Requests    []SavedRequest `json:"requests"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

// Store manages persistent collection data on disk.
type Store struct {
	dir string
}

// NewStore creates a Store using the OS user config directory.
func NewStore() (*Store, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("locating config dir: %w", err)
	}
	dir := filepath.Join(configDir, appDirName, "collections")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("creating collections dir %s: %w", dir, err)
	}
	return &Store{dir: dir}, nil
}

// ListCollections returns all stored collections (metadata only, requests included).
func (s *Store) ListCollections() ([]Collection, error) {
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		return nil, fmt.Errorf("reading collections dir: %w", err)
	}
	var cols []Collection
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		col, err := s.loadFile(filepath.Join(s.dir, e.Name()))
		if err != nil {
			continue // skip corrupt files
		}
		cols = append(cols, *col)
	}
	return cols, nil
}

// GetCollection returns a single collection by ID.
func (s *Store) GetCollection(id string) (*Collection, error) {
	return s.loadFile(s.filePath(id))
}

// SaveCollection persists a collection to disk (create or update).
func (s *Store) SaveCollection(col Collection) error {
	now := time.Now()
	if col.CreatedAt.IsZero() {
		col.CreatedAt = now
	}
	col.UpdatedAt = now

	data, err := json.MarshalIndent(col, "", "  ")
	if err != nil {
		return fmt.Errorf("marshalling collection: %w", err)
	}
	path := s.filePath(col.ID)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("writing collection file: %w", err)
	}
	return nil
}

// DeleteCollection removes a collection from disk.
func (s *Store) DeleteCollection(id string) error {
	path := s.filePath(id)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("removing collection file: %w", err)
	}
	return nil
}

func (s *Store) filePath(id string) string {
	// Sanitize: only allow alphanumeric, dash, underscore.
	safe := filepath.Base(id)
	return filepath.Join(s.dir, safe+".json")
}

func (s *Store) loadFile(path string) (*Collection, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", path, err)
	}
	var col Collection
	if err := json.Unmarshal(data, &col); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", path, err)
	}
	return &col, nil
}
