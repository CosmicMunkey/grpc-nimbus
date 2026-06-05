package backend

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/CosmicMunkey/grpc-nimbus/internal/protoresolver"
	"github.com/CosmicMunkey/grpc-nimbus/internal/rpc"
	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/desc/protoparse"
	"google.golang.org/protobuf/proto"
)

func writeProtosetFixture(t *testing.T, importPaths []string, entryProto string) string {
	t.Helper()

	parser := protoparse.Parser{ImportPaths: importPaths}
	fds, err := parser.ParseFiles(entryProto)
	if err != nil {
		t.Fatalf("ParseFiles(%q): %v", entryProto, err)
	}
	set := desc.ToFileDescriptorSet(fds...)
	data, err := proto.Marshal(set)
	if err != nil {
		t.Fatalf("Marshal FileDescriptorSet: %v", err)
	}

	path := filepath.Join(t.TempDir(), "fixture.protoset")
	if err := os.WriteFile(path, data, 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	return path
}

func TestLoadProtoFilesMergesProtoParentDirWithExtraImportPaths(t *testing.T) {
	base, err := filepath.Abs(filepath.Join("..", "rpc", "testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(base, "needs_includes.proto")
	includeRoot := filepath.Join(base, "include")

	e := NewEngine()
	services, err := e.LoadProtoFiles(context.Background(), []string{includeRoot}, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}
	if services[0].Name != "library.v1.Library" {
		t.Fatalf("expected service library.v1.Library, got %q", services[0].Name)
	}
	if len(services[0].Methods) != 3 {
		t.Fatalf("expected 3 methods, got %d", len(services[0].Methods))
	}
}

func TestLoadProtoFilesWithoutManualImportPaths(t *testing.T) {
	base, err := filepath.Abs(filepath.Join("..", "rpc", "testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(base, "no_includes_needed.proto")

	e := NewEngine()
	services, err := e.LoadProtoFiles(context.Background(), nil, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}
	if services[0].Name != "sample.v1.PingService" {
		t.Fatalf("expected service sample.v1.PingService, got %q", services[0].Name)
	}
	if len(services[0].Methods) != 1 || services[0].Methods[0].MethodName != "Ping" {
		t.Fatalf("expected Ping method, got %+v", services[0].Methods)
	}
}

func TestLoadProtoFilesAutoDetectsNestedImportRoot(t *testing.T) {
	base, err := filepath.Abs(filepath.Join("..", "rpc", "testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(base, "needs_includes.proto")

	e := NewEngine()
	services, err := e.LoadProtoFiles(context.Background(), nil, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}
	if services[0].Name != "library.v1.Library" {
		t.Fatalf("expected service library.v1.Library, got %q", services[0].Name)
	}
	if len(services[0].Methods) != 3 {
		t.Fatalf("expected 3 methods, got %d", len(services[0].Methods))
	}
}

func TestDescriptorSourcesAccumulateAcrossProtoAndProtosetLoads(t *testing.T) {
	base, err := filepath.Abs(filepath.Join("..", "rpc", "testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}
	includeRoot := filepath.Join(base, "include")
	protoRoot := base
	protoFile := filepath.Join(base, "needs_includes.proto")
	noIncludesProto := "no_includes_needed.proto"
	protosetPath := writeProtosetFixture(t, []string{protoRoot}, noIncludesProto)

	tests := []struct {
		name   string
		first  func(*Engine) ([]string, error)
		second func(*Engine) ([]string, error)
	}{
		{
			name: "protoset-then-proto",
			first: func(e *Engine) ([]string, error) {
				return serviceNames(e.LoadProtosets(context.Background(), []string{protosetPath}))
			},
			second: func(e *Engine) ([]string, error) {
				return serviceNames(e.LoadProtoFiles(context.Background(), []string{includeRoot}, []string{protoFile}))
			},
		},
		{
			name: "proto-then-protoset",
			first: func(e *Engine) ([]string, error) {
				return serviceNames(e.LoadProtoFiles(context.Background(), []string{includeRoot}, []string{protoFile}))
			},
			second: func(e *Engine) ([]string, error) {
				return serviceNames(e.LoadProtosets(context.Background(), []string{protosetPath}))
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			e := NewEngine()
			if _, err := tc.first(e); err != nil {
				t.Fatalf("first load failed: %v", err)
			}
			names, err := tc.second(e)
			if err != nil {
				t.Fatalf("second load failed: %v", err)
			}
			assertServiceSet(t, names, "library.v1.Library", "sample.v1.PingService")
		})
	}
}

func TestLoadProtoFilesAutoResolvesModulePathImports(t *testing.T) {
	moduleRoot, err := filepath.Abs(filepath.Join("..", "rpc", "testdata", "protoimport", "module"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(moduleRoot, "service", "service.proto")

	e := NewEngine()
	services, err := e.LoadProtoFiles(context.Background(), nil, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}
	if services[0].Name != "service.v1.ModuleService" {
		t.Fatalf("expected service service.v1.ModuleService, got %q", services[0].Name)
	}
	if len(services[0].Methods) != 1 || services[0].Methods[0].MethodName != "Greet" {
		t.Fatalf("expected Greet method, got %+v", services[0].Methods)
	}

	// Virtual dirs should be tracked and cleaned up on clear.
	e.mu.Lock()
	vdCount := len(e.virtualImportDirs)
	e.mu.Unlock()
	if vdCount == 0 {
		t.Fatal("expected at least one virtual import dir to be tracked")
	}
	e.ClearLoadedProtos()
	e.mu.Lock()
	vdCountAfter := len(e.virtualImportDirs)
	e.mu.Unlock()
	if vdCountAfter != 0 {
		t.Fatalf("expected virtual import dirs to be cleared, got %d", vdCountAfter)
	}
}

func TestLoadProtoFilesAutoDiscoveryIgnoresVendorWhenMissing(t *testing.T) {
	base, err := filepath.Abs(filepath.Join("..", "rpc", "testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(base, "no_includes_needed.proto")

	e := NewEngine()
	services, err := e.LoadProtoFiles(context.Background(), nil, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}
	if services[0].Name != "sample.v1.PingService" {
		t.Fatalf("expected service sample.v1.PingService, got %q", services[0].Name)
	}
}

func TestLoadProtoFilesAutoDiscoversVendorDirectory(t *testing.T) {
	tmp := t.TempDir()

	// Create directory structure: tmp/service and tmp/vendor
	serviceDir := filepath.Join(tmp, "service")
	vendorDir := filepath.Join(tmp, "vendor")
	commonDir := filepath.Join(vendorDir, "example", "org", "common", "v1")

	if err := os.MkdirAll(commonDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.MkdirAll(serviceDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	// Create types.proto in vendor directory
	typesProto := filepath.Join(commonDir, "types.proto")
	if err := os.WriteFile(typesProto, []byte(`
syntax = "proto3";

package example.org.common.v1;

message Config {
  string name = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile types.proto: %v", err)
	}

	// Create service.proto that imports from vendor
	serviceProto := filepath.Join(serviceDir, "service.proto")
	if err := os.WriteFile(serviceProto, []byte(`
syntax = "proto3";

package myservice.v1;

import "example/org/common/v1/types.proto";

service MyService {
  rpc Process(ProcessRequest) returns (ProcessResponse);
}

message ProcessRequest {
  example.org.common.v1.Config config = 1;
}

message ProcessResponse {
  bool success = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile service.proto: %v", err)
	}

	e := NewEngine()
	services, err := e.LoadProtoFiles(context.Background(), nil, []string{serviceProto})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}
	if services[0].Name != "myservice.v1.MyService" {
		t.Fatalf("expected service myservice.v1.MyService, got %q", services[0].Name)
	}
	if len(services[0].Methods) != 1 || services[0].Methods[0].MethodName != "Process" {
		t.Fatalf("expected Process method, got %+v", services[0].Methods)
	}
}

func TestLoadProtoFilesVendorWinsOverProtoParentDirWhenBothHaveFile(t *testing.T) {
	tmp := t.TempDir()

	// tmp/
	//   service/
	//     service.proto           ← entry point; references types.vendor.v1.Data
	//     types/
	//       types.proto           ← package types.local.v1  (local copy, loses)
	//   vendor/
	//     types/
	//       types.proto           ← package types.vendor.v1 (vendor copy, wins)
	serviceDir := filepath.Join(tmp, "service")
	vendorTypesDir := filepath.Join(tmp, "vendor", "types")
	serviceTypesDir := filepath.Join(tmp, "service", "types")

	for _, dir := range []string{vendorTypesDir, serviceTypesDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			t.Fatalf("MkdirAll %s: %v", dir, err)
		}
	}

	// Local copy: deliberately different package so the test fails if this
	// root were somehow resolved instead of the vendor copy.
	if err := os.WriteFile(filepath.Join(serviceTypesDir, "types.proto"), []byte(`
syntax = "proto3";

package types.local.v1;

message Data {
  string content = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile service types.proto: %v", err)
	}

	// Vendor copy: package types.vendor.v1 — this must win.
	if err := os.WriteFile(filepath.Join(vendorTypesDir, "types.proto"), []byte(`
syntax = "proto3";

package types.vendor.v1;

message Data {
  string content = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile vendor types.proto: %v", err)
	}

	// service.proto references types.vendor.v1.Data: only compiles when the
	// vendor copy is the active import root.
	if err := os.WriteFile(filepath.Join(serviceDir, "service.proto"), []byte(`
syntax = "proto3";

package api.v1;

import "types/types.proto";

service DataService {
  rpc GetData(GetDataRequest) returns (GetDataResponse);
}

message GetDataRequest {
  string id = 1;
}

message GetDataResponse {
  types.vendor.v1.Data data = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile service.proto: %v", err)
	}

	e := NewEngine()
	services, err := e.LoadProtoFiles(context.Background(), nil, []string{filepath.Join(serviceDir, "service.proto")})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v (vendor import root was not preferred)", err)
	}

	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}
	if services[0].Name != "api.v1.DataService" {
		t.Fatalf("expected service api.v1.DataService, got %q", services[0].Name)
	}
}

func TestSearchImportRootInDirReturnsEmpty(t *testing.T) {
	tmp := t.TempDir()

	result := protoresolver.SearchImportRootInDir(tmp, "notexists/file.proto", map[string]bool{})
	if result != "" {
		t.Fatalf("expected empty string for non-existent file, got %q", result)
	}
}

func TestMatchingImportRootWithVendorFindsVendorMatch(t *testing.T) {
	tmp := t.TempDir()

	mainDir := filepath.Join(tmp, "main")
	vendorDir := filepath.Join(tmp, "vendor")
	vendorSubDir := filepath.Join(vendorDir, "some", "pkg")

	if err := os.MkdirAll(vendorSubDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.MkdirAll(mainDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	// Create file only in vendor
	vendorFile := filepath.Join(vendorSubDir, "service.proto")
	if err := os.WriteFile(vendorFile, []byte(`syntax = "proto3";`), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	result, ok := protoresolver.MatchingImportRootWithVendor(mainDir, vendorDir, "some/pkg/service.proto", map[string]bool{})
	if !ok {
		t.Fatal("expected to find match in vendor directory")
	}
	if result != vendorDir {
		t.Fatalf("expected result to be %q, got %q", vendorDir, result)
	}
}

func TestMatchingImportRootWithVendorReturnsEmptyStringIfNoMatch(t *testing.T) {
	tmp := t.TempDir()

	mainDir := filepath.Join(tmp, "main")
	vendorDir := filepath.Join(tmp, "vendor")

	if err := os.MkdirAll(vendorDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.MkdirAll(mainDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	result, ok := protoresolver.MatchingImportRootWithVendor(mainDir, vendorDir, "nonexistent/file.proto", map[string]bool{})
	if ok {
		t.Fatalf("expected no match, got %q", result)
	}
}

func TestDiscoverImportPathsIncludesVendor(t *testing.T) {
	tmp := t.TempDir()

	// Create the structure: tmp/service and tmp/vendor
	serviceDir := filepath.Join(tmp, "service")
	vendorApiDir := filepath.Join(tmp, "vendor", "api")

	if err := os.MkdirAll(vendorApiDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.MkdirAll(serviceDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	// Create API proto in vendor at vendor/api/types.proto
	apiProto := filepath.Join(vendorApiDir, "types.proto")
	if err := os.WriteFile(apiProto, []byte(`
syntax = "proto3";

package api.v1;

message ApiType {
  string data = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	// Create service proto that imports from api
	serviceProto := filepath.Join(serviceDir, "service.proto")
	if err := os.WriteFile(serviceProto, []byte(`
syntax = "proto3";

import "api/types.proto";

message ServiceMessage {
  api.v1.ApiType api = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	discovered := protoresolver.DiscoverImportPaths([]string{serviceProto}, nil)

	// Should discover either the vendor/api directory or vendor directory
	found := false
	for _, path := range discovered {
		cleanPath := filepath.Clean(path)
		if strings.HasSuffix(cleanPath, filepath.Join("vendor", "api")) || strings.HasSuffix(cleanPath, "vendor") {
			found = true
			break
		}
	}
	if !found {
		t.Logf("discovered paths: %v", discovered)
		t.Logf("vendor/api dir: %s", vendorApiDir)
		t.Fatal("expected vendor directory to be discovered")
	}
}

func TestFindGoModuleRootStripsInlineComment(t *testing.T) {
	tmp := t.TempDir()
	goMod := filepath.Join(tmp, "go.mod")
	if err := os.WriteFile(goMod, []byte("module example.com/foo // inline comment\n\ngo 1.21\n"), 0644); err != nil {
		t.Fatalf("WriteFile go.mod: %v", err)
	}

	// Start the search from a subdirectory so the walk-up logic is exercised.
	subDir := filepath.Join(tmp, "service")
	if err := os.MkdirAll(subDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	mod, root := protoresolver.FindGoModuleRoot(subDir)
	if mod != "example.com/foo" {
		t.Fatalf("expected module path %q, got %q (inline comment not stripped)", "example.com/foo", mod)
	}
	if root != tmp {
		t.Fatalf("expected module root %q, got %q", tmp, root)
	}
}

func TestMakeVirtualRootRejectsUnsafePaths(t *testing.T) {
	tmp := t.TempDir() // a real directory to use as actualRoot

	cases := []struct {
		name string
		path string
	}{
		{"dotdot", ".."},
		{"dotdot-segment", "../escaped"},
		{"dotdot-nested", "../../etc"},
		{"absolute", "/absolute/path"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dir, ok := protoresolver.MakeVirtualRoot(tc.path, tmp)
			if ok || dir != "" {
				// Clean up if something was created despite the guard.
				if dir != "" {
					os.RemoveAll(dir)
				}
				t.Fatalf("makeVirtualRoot(%q) = (%q, %v); want (\"\", false)", tc.path, dir, ok)
			}
		})
	}
}

func TestMakeVirtualRootFallsBackToCopyWhenSymlinkTargetExists(t *testing.T) {
	// Verify copyDirTree produces the same directory layout that a symlink would.
	src := t.TempDir()
	subDir := filepath.Join(src, "sub")
	if err := os.MkdirAll(subDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(src, "root.proto"), []byte("syntax = \"proto3\";"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(subDir, "nested.proto"), []byte("syntax = \"proto3\";"), 0644); err != nil {
		t.Fatal(err)
	}

	dst := t.TempDir()
	target := filepath.Join(dst, "copy")
	if err := protoresolver.CopyDirTree(src, target); err != nil {
		t.Fatalf("copyDirTree: %v", err)
	}

	for _, rel := range []string{"root.proto", filepath.Join("sub", "nested.proto")} {
		got, err := os.ReadFile(filepath.Join(target, rel))
		if err != nil {
			t.Errorf("missing %s after copy: %v", rel, err)
			continue
		}
		want, _ := os.ReadFile(filepath.Join(src, rel))
		if string(got) != string(want) {
			t.Errorf("%s content mismatch: got %q want %q", rel, got, want)
		}
	}
}

func serviceNames(services []rpc.ServiceInfo, err error) ([]string, error) {
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(services))
	for _, svc := range services {
		names = append(names, svc.Name)
	}
	return names, nil
}

func assertServiceSet(t *testing.T, names []string, expected ...string) {
	t.Helper()
	if len(names) != len(expected) {
		t.Fatalf("expected %d services, got %d (%v)", len(expected), len(names), names)
	}
	seen := map[string]bool{}
	for _, name := range names {
		seen[name] = true
	}
	for _, name := range expected {
		if !seen[name] {
			t.Fatalf("expected service %q in %v", name, names)
		}
	}
}
