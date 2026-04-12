package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/desc/protoparse"
	"google.golang.org/protobuf/proto"
	"grpc-nimbus/internal/rpc"
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
