package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"grpc-nimbus/internal/rpc"
)

func TestPortableExportImportPreservesProtoSources(t *testing.T) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("get wd: %v", err)
	}
	protoRoot := filepath.Join(wd, "..", "rpc", "testdata", "protoimport")
	store := &Store{dir: t.TempDir()}
	col := Collection{
		ID:               "proto-bundle",
		Name:             "Proto Bundle",
		ProtoFilePaths:   []string{filepath.Join(protoRoot, "needs_includes.proto")},
		ProtoImportPaths: []string{filepath.Join(protoRoot, "include")},
		Requests: []SavedRequest{{
			ID:         "req-1",
			Name:       "List books",
			MethodPath: "library.v1.Library/ListBooks",
		}},
	}
	if err := store.SaveCollection(col); err != nil {
		t.Fatalf("save collection: %v", err)
	}

	exportPath := filepath.Join(t.TempDir(), "collection.json")
	if err := store.ExportPortable(col.ID, exportPath); err != nil {
		t.Fatalf("export portable: %v", err)
	}

	raw, err := os.ReadFile(exportPath)
	if err != nil {
		t.Fatalf("read export: %v", err)
	}
	var exp PortableExport
	if err := json.Unmarshal(raw, &exp); err != nil {
		t.Fatalf("parse export: %v", err)
	}
	if len(exp.ProtoFiles) == 0 {
		t.Fatal("expected portable export to embed proto sources")
	}
	if len(exp.Collection.ProtoFilePaths) != 1 || exp.Collection.ProtoFilePaths[0] != "entries/needs_includes.proto" {
		t.Fatalf("unexpected exported proto entry paths: %#v", exp.Collection.ProtoFilePaths)
	}
	if len(exp.Collection.ProtoImportPaths) != 1 || exp.Collection.ProtoImportPaths[0] != "imports" {
		t.Fatalf("unexpected exported proto import roots: %#v", exp.Collection.ProtoImportPaths)
	}

	t.Setenv("HOME", t.TempDir())
	imported, err := store.ImportCollection(exportPath)
	if err != nil {
		t.Fatalf("import portable: %v", err)
	}
	if len(imported.ProtoFilePaths) != 1 {
		t.Fatalf("expected one extracted proto file, got %d", len(imported.ProtoFilePaths))
	}
	if len(imported.ProtoImportPaths) != 1 {
		t.Fatalf("expected one extracted import root, got %d", len(imported.ProtoImportPaths))
	}
	for _, p := range append(append([]string(nil), imported.ProtoFilePaths...), imported.ProtoImportPaths...) {
		if _, err := os.Stat(p); err != nil {
			t.Fatalf("expected extracted proto asset at %s: %v", p, err)
		}
	}

	importPaths := append([]string(nil), imported.ProtoImportPaths...)
	importPaths = append(importPaths, filepath.Dir(imported.ProtoFilePaths[0]))
	pd, err := rpc.LoadProtoFiles(importPaths, imported.ProtoFilePaths)
	if err != nil {
		t.Fatalf("load extracted proto sources: %v", err)
	}
	defer pd.Close()
	services := pd.Services()
	if len(services) != 1 {
		t.Fatalf("expected one service from extracted proto sources, got %d", len(services))
	}
	if services[0].Name != "library.v1.Library" {
		t.Fatalf("unexpected service name %q", services[0].Name)
	}

	secondImported, err := store.ImportCollection(exportPath)
	if err != nil {
		t.Fatalf("second portable import: %v", err)
	}
	if len(secondImported.ProtoFilePaths) != len(imported.ProtoFilePaths) {
		t.Fatalf("expected repeated import to reuse proto file count, got %d vs %d", len(secondImported.ProtoFilePaths), len(imported.ProtoFilePaths))
	}
	if secondImported.ProtoFilePaths[0] != imported.ProtoFilePaths[0] {
		t.Fatalf("expected repeated import to reuse extracted proto file path, got %q vs %q", secondImported.ProtoFilePaths[0], imported.ProtoFilePaths[0])
	}
	if secondImported.ProtoImportPaths[0] != imported.ProtoImportPaths[0] {
		t.Fatalf("expected repeated import to reuse extracted import root, got %q vs %q", secondImported.ProtoImportPaths[0], imported.ProtoImportPaths[0])
	}
}
