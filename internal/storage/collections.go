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

// FilePath returns the on-disk path for the given collection ID.
func (s *Store) FilePath(id string) string {
	return s.filePath(id)
}

// PortableExport is a self-contained collection bundle for sharing across machines.
// Referenced protoset files are embedded as raw bytes (base64 in JSON) so the
// recipient doesn't need to have the same files on disk.
type PortableExport struct {
	Version    int                `json:"version"`
	Collection Collection         `json:"collection"`
	Protosets  []EmbeddedProtoset `json:"protosets,omitempty"`
}

// EmbeddedProtoset holds one protoset file's content inside a PortableExport.
type EmbeddedProtoset struct {
	Name string `json:"name"`
	Data []byte `json:"data"` // marshalled as base64 by encoding/json
}

// ExportPortable writes a self-contained bundle to destPath.
// All protoset files referenced by the collection are embedded so the file
// can be shared without shipping separate .protoset files alongside it.
func (s *Store) ExportPortable(id, destPath string) error {
	col, err := s.GetCollection(id)
	if err != nil {
		return err
	}

	exp := PortableExport{Version: 1, Collection: *col}

	seen := make(map[string]bool)
	relativeNames := make([]string, 0, len(col.ProtosetPaths))
	for _, p := range col.ProtosetPaths {
		name := filepath.Base(p)
		data, readErr := os.ReadFile(p)
		if readErr == nil && !seen[name] {
			exp.Protosets = append(exp.Protosets, EmbeddedProtoset{Name: name, Data: data})
			seen[name] = true
		}
		relativeNames = append(relativeNames, name)
	}
	// Store relative names so the importer can resolve them to its own local paths.
	exp.Collection.ProtosetPaths = relativeNames

	out, err := json.MarshalIndent(exp, "", "  ")
	if err != nil {
		return fmt.Errorf("marshalling portable export: %w", err)
	}
	return os.WriteFile(destPath, out, 0o644)
}

// ImportCollection reads a collection from srcPath.
// Automatically detects both the legacy plain-collection format and the newer
// portable bundle format (identified by a top-level "version" field).
func (s *Store) ImportCollection(srcPath string) (*Collection, error) {
	raw, err := os.ReadFile(srcPath)
	if err != nil {
		return nil, fmt.Errorf("reading import file: %w", err)
	}

	var probe struct {
		Version int `json:"version"`
	}
	_ = json.Unmarshal(raw, &probe)
	if probe.Version > 0 {
		return s.importPortable(raw)
	}
	return s.importPlain(raw)
}

func (s *Store) importPlain(raw []byte) (*Collection, error) {
	var col Collection
	if err := json.Unmarshal(raw, &col); err != nil {
		return nil, fmt.Errorf("parsing collection: %w", err)
	}
	col.ID = col.ID + "_imported_" + fmt.Sprintf("%d", time.Now().UnixNano())
	if err := s.SaveCollection(col); err != nil {
		return nil, err
	}
	return &col, nil
}

func (s *Store) importPortable(raw []byte) (*Collection, error) {
	var exp PortableExport
	if err := json.Unmarshal(raw, &exp); err != nil {
		return nil, fmt.Errorf("parsing portable bundle: %w", err)
	}

	col := exp.Collection
	col.ID = col.ID + "_imported_" + fmt.Sprintf("%d", time.Now().UnixNano())

	if len(exp.Protosets) > 0 {
		configDir, err := os.UserConfigDir()
		if err != nil {
			return nil, fmt.Errorf("locating config dir: %w", err)
		}
		protosetDir := filepath.Join(configDir, appDirName, "protosets")
		if err := os.MkdirAll(protosetDir, 0o755); err != nil {
			return nil, fmt.Errorf("creating protosets dir: %w", err)
		}

		nameToAbs := make(map[string]string, len(exp.Protosets))
		for _, ps := range exp.Protosets {
			abs := filepath.Join(protosetDir, ps.Name)
			if err := os.WriteFile(abs, ps.Data, 0o644); err != nil {
				return nil, fmt.Errorf("extracting %s: %w", ps.Name, err)
			}
			nameToAbs[ps.Name] = abs
		}

		// Replace the relative names stored in the bundle with absolute local paths.
		resolved := make([]string, 0, len(col.ProtosetPaths))
		for _, name := range col.ProtosetPaths {
			if abs, ok := nameToAbs[filepath.Base(name)]; ok {
				resolved = append(resolved, abs)
			} else {
				resolved = append(resolved, name)
			}
		}
		col.ProtosetPaths = resolved
	}

	if err := s.SaveCollection(col); err != nil {
		return nil, err
	}
	return &col, nil
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
