package rpc

import (
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	"github.com/fullstorydev/grpcurl"
	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/grpcreflect"
)

func protoImportFixturePaths(t *testing.T) (string, string, string, string) {
	t.Helper()

	base, err := filepath.Abs(filepath.Join("testdata", "protoimport"))
	if err != nil {
		t.Fatalf("resolve fixture root: %v", err)
	}

	includeRoot := filepath.Join(base, "include")
	protoRoot := base
	needsIncludes := filepath.Join(base, "needs_includes.proto")
	noIncludes := filepath.Join(base, "no_includes_needed.proto")
	return protoRoot, includeRoot, needsIncludes, noIncludes
}

func fieldNamed(t *testing.T, fields []FieldSchema, name string) FieldSchema {
	t.Helper()

	for _, field := range fields {
		if field.Name == name {
			return field
		}
	}

	t.Fatalf("field %q not found", name)
	return FieldSchema{}
}

func TestLoadProtoFilesWithMultipleImportRoots(t *testing.T) {
	protoRoot, includeRoot, protoFile, _ := protoImportFixturePaths(t)

	pd, err := LoadProtoFiles([]string{protoRoot, includeRoot}, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	services := pd.Services()
	if len(services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(services))
	}

	service := services[0]
	if service.Name != "library.v1.Library" {
		t.Fatalf("expected service library.v1.Library, got %q", service.Name)
	}
	if len(service.Methods) != 2 {
		t.Fatalf("expected 2 methods, got %d", len(service.Methods))
	}

	methods := map[string]MethodInfo{}
	for _, method := range service.Methods {
		methods[method.MethodName] = method
	}

	listBooks, ok := methods["ListBooks"]
	if !ok {
		t.Fatal("expected ListBooks method to be present")
	}
	if listBooks.InputType != "library.v1.ListBooksRequest" {
		t.Fatalf("expected ListBooks input type library.v1.ListBooksRequest, got %q", listBooks.InputType)
	}
	if listBooks.OutputType != "library.v1.ListBooksResponse" {
		t.Fatalf("expected ListBooks output type library.v1.ListBooksResponse, got %q", listBooks.OutputType)
	}

	watchShelves, ok := methods["WatchShelves"]
	if !ok {
		t.Fatal("expected WatchShelves method to be present")
	}
	if !watchShelves.ServerStreaming {
		t.Fatal("expected WatchShelves to be server streaming")
	}

	schema, err := pd.GetRequestSchema("library.v1.Library/ListBooks")
	if err != nil {
		t.Fatalf("GetRequestSchema: %v", err)
	}

	page := fieldNamed(t, schema, "page")
	if page.Type != "message" {
		t.Fatalf("expected page field type message, got %q", page.Type)
	}
	if fieldNamed(t, page.Fields, "page_size").Type != "int32" {
		t.Fatalf("expected imported page_size field type int32")
	}

	filter := fieldNamed(t, schema, "filter")
	if filter.Type != "message" {
		t.Fatalf("expected filter field type message, got %q", filter.Type)
	}
	requestedBy := fieldNamed(t, filter.Fields, "requested_by")
	if requestedBy.Type != "message" {
		t.Fatalf("expected requested_by field type message, got %q", requestedBy.Type)
	}
	if fieldNamed(t, requestedBy.Fields, "actor").Type != "string" {
		t.Fatalf("expected transitive imported actor field type string")
	}
}

func TestLoadProtoFilesMissingSecondaryImportRoot(t *testing.T) {
	protoRoot, _, protoFile, _ := protoImportFixturePaths(t)

	_, err := LoadProtoFiles([]string{protoRoot}, []string{protoFile})
	if err == nil {
		t.Fatal("expected LoadProtoFiles to fail without the shared include import root")
	}
	if !strings.Contains(err.Error(), "vendor/common/v1/paging.proto") {
		t.Fatalf("expected missing import error to mention vendor/common/v1/paging.proto, got %v", err)
	}
}

func TestLoadProtoFilesRejectsServiceFreeProto(t *testing.T) {
	protoRoot, includeRoot, _, _ := protoImportFixturePaths(t)
	protoFile := filepath.Join(includeRoot, "vendor", "library", "v1", "types.proto")

	_, err := LoadProtoFiles([]string{protoRoot, includeRoot}, []string{protoFile})
	if err == nil {
		t.Fatal("expected service-free proto load to fail")
	}
	if !strings.Contains(err.Error(), "no services found") {
		t.Fatalf("expected no-services error, got %v", err)
	}
}

type failingDescriptorSource struct {
	grpcurl.DescriptorSource
	fail map[string]error
}

func (s failingDescriptorSource) FindSymbol(name string) (desc.Descriptor, error) {
	if err, ok := s.fail[name]; ok {
		return nil, err
	}
	return s.DescriptorSource.FindSymbol(name)
}

func TestLoadProtoFilesWithoutExtraImportPaths(t *testing.T) {
	protoRoot, _, _, protoFile := protoImportFixturePaths(t)

	pd, err := LoadProtoFiles([]string{protoRoot}, []string{protoFile})
	if err != nil {
		t.Fatalf("LoadProtoFiles: %v", err)
	}

	services := pd.Services()
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

func TestNewDescriptorErrorsOnUnresolvedProtoServices(t *testing.T) {
	protoRoot, includeRoot, protoFile, _ := protoImportFixturePaths(t)

	src, err := grpcurl.DescriptorSourceFromProtoFiles([]string{protoRoot, includeRoot}, protoFile)
	if err != nil {
		t.Fatalf("DescriptorSourceFromProtoFiles: %v", err)
	}

	_, err = newDescriptor(failingDescriptorSource{
		DescriptorSource: src,
		fail: map[string]error{
			"library.v1.Library": fmt.Errorf("forced failure"),
		},
	}, nil)
	if err == nil {
		t.Fatal("expected unresolved proto services to fail")
	}
	if !strings.Contains(err.Error(), "library.v1.Library") {
		t.Fatalf("expected error to mention unresolved service, got %v", err)
	}
}

func TestNewDescriptorKeepsReflectionUnresolvableServices(t *testing.T) {
	protoRoot, includeRoot, protoFile, _ := protoImportFixturePaths(t)

	src, err := grpcurl.DescriptorSourceFromProtoFiles([]string{protoRoot, includeRoot}, protoFile)
	if err != nil {
		t.Fatalf("DescriptorSourceFromProtoFiles: %v", err)
	}

	pd, err := newDescriptor(failingDescriptorSource{
		DescriptorSource: src,
		fail: map[string]error{
			"library.v1.Library": fmt.Errorf("forced failure"),
		},
	}, &grpcreflect.Client{})
	if err != nil {
		t.Fatalf("expected reflection mode to tolerate unresolved services, got %v", err)
	}

	services := pd.Services()
	if len(services) != 1 {
		t.Fatalf("expected 1 unresolved service entry, got %d", len(services))
	}
	if services[0].Name != "library.v1.Library" || !services[0].Unresolvable {
		t.Fatalf("expected unresolved reflection service entry, got %+v", services[0])
	}
}
