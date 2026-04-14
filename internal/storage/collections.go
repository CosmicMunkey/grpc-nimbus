package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"grpc-nimbus/internal/rpc"
)

const appDirName = "grpc-nimbus"

// SavedRequest is a named gRPC request stored in a collection.
type SavedRequest struct {
	ID           string               `json:"id"`
	Name         string               `json:"name"`
	CollectionID string               `json:"collectionId"`
	MethodPath   string               `json:"methodPath"`
	RequestJSON  string               `json:"requestJson"`
	Metadata     []rpc.MetadataEntry  `json:"metadata"`
	Connection   rpc.ConnectionConfig `json:"connection"`
	CreatedAt    string               `json:"createdAt"`
	UpdatedAt    string               `json:"updatedAt"`
}

// Collection is a named group of saved requests.
type Collection struct {
	ID               string         `json:"id"`
	Name             string         `json:"name"`
	Description      string         `json:"description"`
	ProtosetPaths    []string       `json:"protosetPaths"`
	ProtoFilePaths   []string       `json:"protoFilePaths,omitempty"`
	ProtoImportPaths []string       `json:"protoImportPaths,omitempty"`
	Requests         []SavedRequest `json:"requests"`
	CreatedAt        string         `json:"createdAt"`
	UpdatedAt        string         `json:"updatedAt"`
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
	now := time.Now().Format(time.RFC3339Nano)
	if col.CreatedAt == "" {
		col.CreatedAt = now
	}
	col.UpdatedAt = now

	data, err := json.MarshalIndent(col, "", "  ")
	if err != nil {
		return fmt.Errorf("marshalling collection: %w", err)
	}
	path := s.filePath(col.ID)
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return fmt.Errorf("writing collection file: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
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
// Referenced protoset files and proto sources are embedded as raw bytes (base64 in
// JSON) so the recipient doesn't need the same files on disk.
type PortableExport struct {
	Version    int                 `json:"version"`
	Collection Collection          `json:"collection"`
	Protosets  []EmbeddedProtoset  `json:"protosets,omitempty"`
	ProtoFiles []EmbeddedProtoFile `json:"protoFiles,omitempty"`
}

// EmbeddedProtoset holds one protoset file's content inside a PortableExport.
type EmbeddedProtoset struct {
	Name string `json:"name"`
	Data []byte `json:"data"` // marshalled as base64 by encoding/json
}

// EmbeddedProtoFile holds one proto source file inside a PortableExport.
type EmbeddedProtoFile struct {
	Path    string `json:"path"`
	Data    []byte `json:"data"`
	IsEntry bool   `json:"isEntry,omitempty"`
}

func importRefs(path string) []string {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	lines := strings.Split(string(data), "\n")
	var refs []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		const prefix = `import "`
		if !strings.HasPrefix(line, prefix) {
			continue
		}
		rest := strings.TrimPrefix(line, prefix)
		before, _, ok := strings.Cut(rest, `"`)
		if !ok {
			continue
		}
		refs = append(refs, before)
	}
	return refs
}

func commonDir(paths []string) string {
	if len(paths) == 0 {
		return ""
	}
	common := filepath.Dir(paths[0])
	for _, p := range paths[1:] {
		dir := filepath.Dir(p)
		for dir != common && !strings.HasPrefix(dir, common+string(filepath.Separator)) {
			parent := filepath.Dir(common)
			if parent == common {
				return common
			}
			common = parent
		}
	}
	return common
}

func resolveImport(importPaths []string, ref string) (string, bool) {
	rel := filepath.FromSlash(ref)
	for _, root := range importPaths {
		candidate := filepath.Join(root, rel)
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate, true
		}
	}
	return "", false
}

func bundleProtoSources(protoFiles, importPaths []string) ([]EmbeddedProtoFile, []string, []string, error) {
	if len(protoFiles) == 0 {
		return nil, nil, nil, nil
	}
	entryBase := commonDir(protoFiles)
	if entryBase == "" {
		entryBase = filepath.Dir(protoFiles[0])
	}

	var bundled []EmbeddedProtoFile
	var entryRelPaths []string
	seenEntries := map[string]bool{}
	for _, file := range protoFiles {
		data, err := os.ReadFile(file)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("reading proto entry %s: %w", file, err)
		}
		rel, err := filepath.Rel(entryBase, file)
		if err != nil {
			rel = filepath.Base(file)
		}
		rel = filepath.ToSlash(path.Join("entries", filepath.ToSlash(rel)))
		if !seenEntries[rel] {
			seenEntries[rel] = true
			bundled = append(bundled, EmbeddedProtoFile{Path: rel, Data: data, IsEntry: true})
			entryRelPaths = append(entryRelPaths, rel)
		}
	}

	seenImports := map[string]bool{}
	queue := append([]string(nil), protoFiles...)
	for len(queue) > 0 {
		file := queue[0]
		queue = queue[1:]
		for _, ref := range importRefs(file) {
			if seenImports[ref] {
				continue
			}
			resolved, ok := resolveImport(importPaths, ref)
			if !ok {
				return nil, nil, nil, fmt.Errorf("resolving imported proto %q", ref)
			}
			data, err := os.ReadFile(resolved)
			if err != nil {
				return nil, nil, nil, fmt.Errorf("reading imported proto %s: %w", resolved, err)
			}
			seenImports[ref] = true
			rel := filepath.ToSlash(path.Join("imports", ref))
			bundled = append(bundled, EmbeddedProtoFile{Path: rel, Data: data})
			queue = append(queue, resolved)
		}
	}

	importRoots := []string(nil)
	if len(seenImports) > 0 {
		importRoots = []string{"imports"}
	}
	return bundled, entryRelPaths, importRoots, nil
}

// ExportPortable writes a self-contained bundle to destPath.
// All descriptor assets referenced by the collection are embedded so the file can
// be shared without shipping separate proto/protoset files alongside it.
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
	if len(col.ProtoFilePaths) > 0 {
		files, entryRelPaths, importRoots, err := bundleProtoSources(col.ProtoFilePaths, col.ProtoImportPaths)
		if err != nil {
			return err
		}
		exp.ProtoFiles = files
		exp.Collection.ProtoFilePaths = entryRelPaths
		exp.Collection.ProtoImportPaths = importRoots
	}

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
	assetDirName := filepath.Base(exp.Collection.ID)
	if assetDirName == "." || assetDirName == string(filepath.Separator) || assetDirName == "" {
		assetDirName = "imported"
	}
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
	if len(exp.ProtoFiles) > 0 {
		configDir, err := os.UserConfigDir()
		if err != nil {
			return nil, fmt.Errorf("locating config dir: %w", err)
		}
		protoDir := filepath.Join(configDir, appDirName, "proto-sources", assetDirName)
		if err := os.MkdirAll(protoDir, 0o755); err != nil {
			return nil, fmt.Errorf("creating proto source dir: %w", err)
		}
		for _, pf := range exp.ProtoFiles {
			abs := filepath.Join(protoDir, filepath.FromSlash(pf.Path))
			if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
				return nil, fmt.Errorf("creating proto source path: %w", err)
			}
			if err := os.WriteFile(abs, pf.Data, 0o644); err != nil {
				return nil, fmt.Errorf("extracting %s: %w", pf.Path, err)
			}
		}
		resolvedFiles := make([]string, 0, len(col.ProtoFilePaths))
		for _, rel := range col.ProtoFilePaths {
			resolvedFiles = append(resolvedFiles, filepath.Join(protoDir, filepath.FromSlash(rel)))
		}
		col.ProtoFilePaths = resolvedFiles
		resolvedImports := make([]string, 0, len(col.ProtoImportPaths))
		for _, rel := range col.ProtoImportPaths {
			resolvedImports = append(resolvedImports, filepath.Join(protoDir, filepath.FromSlash(rel)))
		}
		col.ProtoImportPaths = resolvedImports
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
