package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/desc/protoparse"
	"google.golang.org/protobuf/proto"
	"github.com/CosmicMunkey/grpc-nimbus/internal/rpc"
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
	base, err := filepath.Abs(filepath.Join("internal", "rpc", "testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(base, "needs_includes.proto")
	includeRoot := filepath.Join(base, "include")

	a := &App{}
	services, err := a.LoadProtoFiles([]string{includeRoot}, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}
	if services[0].Name != "library.v1.Library" {
		t.Fatalf("expected service library.v1.Library, got %q", services[0].Name)
	}
	if len(services[0].Methods) != 2 {
		t.Fatalf("expected 2 methods, got %d", len(services[0].Methods))
	}
}

func TestLoadProtoFilesWithoutManualImportPaths(t *testing.T) {
	base, err := filepath.Abs(filepath.Join("internal", "rpc", "testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(base, "no_includes_needed.proto")

	a := &App{}
	services, err := a.LoadProtoFiles(nil, []string{protoFile})
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
	base, err := filepath.Abs(filepath.Join("internal", "rpc", "testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(base, "needs_includes.proto")

	a := &App{}
	services, err := a.LoadProtoFiles(nil, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}
	if services[0].Name != "library.v1.Library" {
		t.Fatalf("expected service library.v1.Library, got %q", services[0].Name)
	}
	if len(services[0].Methods) != 2 {
		t.Fatalf("expected 2 methods, got %d", len(services[0].Methods))
	}
}

func TestDescriptorSourcesAccumulateAcrossProtoAndProtosetLoads(t *testing.T) {
	base, err := filepath.Abs(filepath.Join("internal", "rpc", "testdata", "protoimport"))
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
		first  func(*App) ([]string, error)
		second func(*App) ([]string, error)
	}{
		{
			name: "protoset-then-proto",
			first: func(a *App) ([]string, error) {
				return serviceNames(a.LoadProtosets([]string{protosetPath}))
			},
			second: func(a *App) ([]string, error) {
				return serviceNames(a.LoadProtoFiles([]string{includeRoot}, []string{protoFile}))
			},
		},
		{
			name: "proto-then-protoset",
			first: func(a *App) ([]string, error) {
				return serviceNames(a.LoadProtoFiles([]string{includeRoot}, []string{protoFile}))
			},
			second: func(a *App) ([]string, error) {
				return serviceNames(a.LoadProtosets([]string{protosetPath}))
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			a := &App{}
			if _, err := tc.first(a); err != nil {
				t.Fatalf("first load failed: %v", err)
			}
			names, err := tc.second(a)
			if err != nil {
				t.Fatalf("second load failed: %v", err)
			}
			assertServiceSet(t, names, "library.v1.Library", "sample.v1.PingService")
		})
	}
}

func TestLoadProtoFilesAutoResolvesModulePathImports(t *testing.T) {
	moduleRoot, err := filepath.Abs(filepath.Join("internal", "rpc", "testdata", "protoimport", "module"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(moduleRoot, "service", "service.proto")

	a := &App{}
	services, err := a.LoadProtoFiles(nil, []string{protoFile})
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
	a.mu.Lock()
	vdCount := len(a.virtualImportDirs)
	a.mu.Unlock()
	if vdCount == 0 {
		t.Fatal("expected at least one virtual import dir to be tracked")
	}
	a.ClearLoadedProtos()
	a.mu.Lock()
	vdCountAfter := len(a.virtualImportDirs)
	a.mu.Unlock()
	if vdCountAfter != 0 {
		t.Fatalf("expected virtual import dirs to be cleared, got %d", vdCountAfter)
	}
}
func TestLoadProtoFilesAutoDiscoveryIgnoresVendorWhenMissing(t *testing.T) {
	base, err := filepath.Abs(filepath.Join("internal", "rpc", "testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	protoFile := filepath.Join(base, "no_includes_needed.proto")

	a := &App{}
	services, err := a.LoadProtoFiles(nil, []string{protoFile})
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

	a := &App{}
	services, err := a.LoadProtoFiles(nil, []string{serviceProto})
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

func TestLoadProtoFilesVendorPreferClosestMatch(t *testing.T) {
	tmp := t.TempDir()

	// Create directory structure with file in both service area and vendor
	serviceDir := filepath.Join(tmp, "service")
	vendorDir := filepath.Join(tmp, "vendor", "types")
	serviceTypesDir := filepath.Join(tmp, "service", "types")

	if err := os.MkdirAll(vendorDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.MkdirAll(serviceTypesDir, 0755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	// Create types.proto in both locations (vendor should win as it's closer)
	vendorTypesProto := filepath.Join(vendorDir, "types.proto")
	if err := os.WriteFile(vendorTypesProto, []byte(`
syntax = "proto3";

package types.v1;

message Data {
  string content = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile vendor types.proto: %v", err)
	}

	serviceTypesProto := filepath.Join(serviceTypesDir, "types.proto")
	if err := os.WriteFile(serviceTypesProto, []byte(`
syntax = "proto3";

package types.v1;

message Data {
  string content = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile service types.proto: %v", err)
	}

	// Create service.proto that imports types/types.proto
	serviceProto := filepath.Join(serviceDir, "service.proto")
	if err := os.WriteFile(serviceProto, []byte(`
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
  types.v1.Data data = 1;
}
`), 0644); err != nil {
		t.Fatalf("WriteFile service.proto: %v", err)
	}

	a := &App{}
	services, err := a.LoadProtoFiles(nil, []string{serviceProto})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
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

	result := searchImportRootInDir(tmp, "notexists/file.proto", map[string]bool{})
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

	result, ok := matchingImportRootWithVendor(mainDir, vendorDir, "some/pkg/service.proto", map[string]bool{})
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

	result, ok := matchingImportRootWithVendor(mainDir, vendorDir, "nonexistent/file.proto", map[string]bool{})
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

	discovered := discoverImportPaths([]string{serviceProto}, nil)

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
