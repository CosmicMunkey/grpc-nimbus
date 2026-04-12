package rpc

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/fullstorydev/grpcurl"
	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/grpcreflect"
	"google.golang.org/grpc"
)

// MethodInfo is the frontend-facing descriptor for a single RPC method.
type MethodInfo struct {
	FullName        string `json:"fullName"`    // e.g. "com.example.Greeter/SayHello"
	ServiceName     string `json:"serviceName"` // e.g. "com.example.Greeter"
	MethodName      string `json:"methodName"`  // e.g. "SayHello"
	ClientStreaming bool   `json:"clientStreaming"`
	ServerStreaming bool   `json:"serverStreaming"`
	InputType       string `json:"inputType"`
	OutputType      string `json:"outputType"`
	RequestSchema   string `json:"requestSchema"`
}

// ServiceInfo groups methods under a service.
type ServiceInfo struct {
	Name         string       `json:"name"`
	Methods      []MethodInfo `json:"methods"`
	SourceFile   string       `json:"sourceFile,omitempty"`   // set when loaded from a protoset file
	Unresolvable bool         `json:"unresolvable,omitempty"` // true when server reflection listed the service but could not supply its descriptor
}

// ProtosetDescriptor holds the parsed descriptor source from any loading strategy.
type ProtosetDescriptor struct {
	source       grpcurl.DescriptorSource
	methods      []*desc.MethodDescriptor
	svcFiles     map[string]string     // service full name → source file path (protoset only)
	reflClients  []*grpcreflect.Client // non-nil when loaded via server reflection
	unresolvable []string              // service names that reflection listed but could not supply descriptors for
}

type mergedDescriptorSource struct {
	sources []grpcurl.DescriptorSource
}

func (m mergedDescriptorSource) ListServices() ([]string, error) {
	seen := map[string]bool{}
	var names []string
	for _, src := range m.sources {
		svcNames, err := src.ListServices()
		if err != nil {
			return nil, err
		}
		for _, name := range svcNames {
			if !seen[name] {
				seen[name] = true
				names = append(names, name)
			}
		}
	}
	sort.Strings(names)
	return names, nil
}

func (m mergedDescriptorSource) FindSymbol(name string) (desc.Descriptor, error) {
	var lastErr error
	for _, src := range m.sources {
		dsc, err := src.FindSymbol(name)
		if err == nil {
			return dsc, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("symbol %q not found", name)
	}
	return nil, lastErr
}

func (m mergedDescriptorSource) AllExtensionsForType(typeName string) ([]*desc.FieldDescriptor, error) {
	seen := map[string]bool{}
	var out []*desc.FieldDescriptor
	for _, src := range m.sources {
		exts, err := src.AllExtensionsForType(typeName)
		if err != nil {
			return nil, err
		}
		for _, ext := range exts {
			key := ext.GetFullyQualifiedName()
			if !seen[key] {
				seen[key] = true
				out = append(out, ext)
			}
		}
	}
	return out, nil
}

// LoadProtosets parses the given protoset (FileDescriptorSet) file paths.
func LoadProtosets(paths []string) (*ProtosetDescriptor, error) {
	if len(paths) == 0 {
		return nil, fmt.Errorf("no protoset files provided")
	}
	src, err := grpcurl.DescriptorSourceFromProtoSets(paths...)
	if err != nil {
		return nil, fmt.Errorf("loading protoset files: %w", err)
	}
	pd, err := newDescriptor(src, nil)
	if err != nil {
		return nil, err
	}
	if len(pd.Services()) == 0 {
		return nil, fmt.Errorf("no services found in loaded protoset files")
	}
	// Build service → source file mapping by probing each path individually.
	pd.svcFiles = make(map[string]string)
	for _, path := range paths {
		singleSrc, err := grpcurl.DescriptorSourceFromProtoSets(path)
		if err != nil {
			continue
		}
		svcNames, err := singleSrc.ListServices()
		if err != nil {
			continue
		}
		for _, svcName := range svcNames {
			if _, exists := pd.svcFiles[svcName]; !exists {
				pd.svcFiles[svcName] = path
			}
		}
	}
	return pd, nil
}

// LoadProtoFiles parses proto source files, resolving imports from importPaths.
func LoadProtoFiles(importPaths, protoFiles []string) (*ProtosetDescriptor, error) {
	if len(protoFiles) == 0 {
		return nil, fmt.Errorf("no proto files provided")
	}
	src, err := grpcurl.DescriptorSourceFromProtoFiles(importPaths, protoFiles...)
	if err != nil {
		return nil, fmt.Errorf("loading proto files: %w", err)
	}
	pd, err := newDescriptor(src, nil)
	if err != nil {
		return nil, err
	}
	if len(pd.Services()) == 0 {
		return nil, fmt.Errorf("no services found in loaded proto files; select a .proto that defines a service")
	}
	return pd, nil
}

// LoadViaReflection queries server reflection on the given connection.
func LoadViaReflection(ctx context.Context, cc *grpc.ClientConn) (*ProtosetDescriptor, error) {
	refClient := grpcreflect.NewClientAuto(ctx, cc)
	// AllowMissingFileDescriptors lets us build descriptors even when
	// some imported proto files are absent — this happens when a server's
	// reflection service omits dependency descriptors for option-only files.
	refClient.AllowMissingFileDescriptors()
	src := grpcurl.DescriptorSourceFromServer(ctx, refClient)
	pd, err := newDescriptor(src, refClient)
	if err != nil {
		refClient.Reset()
		return nil, err
	}
	return pd, nil
}

// MergeDescriptors combines multiple descriptor sources into a single unified view.
func MergeDescriptors(parts ...*ProtosetDescriptor) *ProtosetDescriptor {
	var compact []*ProtosetDescriptor
	for _, pd := range parts {
		if pd != nil {
			compact = append(compact, pd)
		}
	}
	if len(compact) == 0 {
		return nil
	}
	if len(compact) == 1 {
		return compact[0]
	}

	seenMethods := map[string]bool{}
	var methods []*desc.MethodDescriptor
	svcFiles := map[string]string{}
	unresolvedSeen := map[string]bool{}
	var unresolved []string
	var sources []grpcurl.DescriptorSource
	var reflClients []*grpcreflect.Client

	for _, pd := range compact {
		sources = append(sources, pd.source)
		reflClients = append(reflClients, pd.reflClients...)
		for _, m := range pd.methods {
			fullName := m.GetService().GetFullyQualifiedName() + "/" + m.GetName()
			if !seenMethods[fullName] {
				seenMethods[fullName] = true
				methods = append(methods, m)
			}
		}
		for svc, file := range pd.svcFiles {
			if _, ok := svcFiles[svc]; !ok {
				svcFiles[svc] = file
			}
		}
		for _, svc := range pd.unresolvable {
			if !unresolvedSeen[svc] {
				unresolvedSeen[svc] = true
				unresolved = append(unresolved, svc)
			}
		}
	}

	return &ProtosetDescriptor{
		source:       mergedDescriptorSource{sources: sources},
		methods:      methods,
		svcFiles:     svcFiles,
		reflClients:  reflClients,
		unresolvable: unresolved,
	}
}

// Close cleans up any resources held by the descriptor (e.g., reflection stream).
func (pd *ProtosetDescriptor) Close() {
	for _, client := range pd.reflClients {
		if client != nil {
			client.Reset()
		}
	}
}

func newDescriptor(src grpcurl.DescriptorSource, reflClient *grpcreflect.Client) (*ProtosetDescriptor, error) {
	svcNames, err := src.ListServices()
	if err != nil {
		return nil, fmt.Errorf("listing services: %w", err)
	}

	// Build the pending list, excluding the gRPC reflection meta-service.
	pending := make([]string, 0, len(svcNames))
	for _, n := range svcNames {
		if n != "grpc.reflection.v1alpha.ServerReflection" &&
			n != "grpc.reflection.v1.ServerReflection" {
			pending = append(pending, n)
		}
	}

	// When loading via server reflection, the grpcreflect library builds file
	// descriptors lazily. Processing one service caches its transitive
	// dependencies as a side-effect, which can unblock earlier failures. We
	// retry up to 3 passes so all services eventually resolve. For non-reflection
	// sources the loop converges in a single pass.
	var methods []*desc.MethodDescriptor
	seenSvcs := make(map[string]bool)
	const maxPasses = 3
	for pass := 0; pass < maxPasses && len(pending) > 0; pass++ {
		var stillPending []string
		for _, svcName := range pending {
			dsc, err := src.FindSymbol(svcName)
			if err != nil {
				stillPending = append(stillPending, svcName)
				continue
			}
			sd, ok := dsc.(*desc.ServiceDescriptor)
			if !ok || seenSvcs[svcName] {
				continue
			}
			seenSvcs[svcName] = true
			methods = append(methods, sd.GetMethods()...)
		}
		if len(stillPending) == len(pending) {
			// No progress this pass; further retries won't help.
			break
		}
		pending = stillPending
	}

	if len(pending) > 0 && reflClient == nil {
		return nil, fmt.Errorf("resolving service descriptors: could not resolve %s", strings.Join(pending, ", "))
	}

	for _, svcName := range pending {
		fmt.Printf("grpc-nimbus: warning: could not resolve service %q via reflection (skipped)\n", svcName)
	}

	pd := &ProtosetDescriptor{source: src, methods: methods, unresolvable: pending}
	if reflClient != nil {
		pd.reflClients = []*grpcreflect.Client{reflClient}
	}
	return pd, nil
}

// Services returns the service/method tree suitable for the frontend.
func (pd *ProtosetDescriptor) Services() []ServiceInfo {
	byService := map[string]*ServiceInfo{}
	var order []string

	for _, m := range pd.methods {
		svcName := m.GetService().GetFullyQualifiedName()
		if _, ok := byService[svcName]; !ok {
			byService[svcName] = &ServiceInfo{Name: svcName}
			order = append(order, svcName)
		}
		mi := MethodInfo{
			FullName:        svcName + "/" + m.GetName(),
			ServiceName:     svcName,
			MethodName:      m.GetName(),
			ClientStreaming: m.IsClientStreaming(),
			ServerStreaming: m.IsServerStreaming(),
			InputType:       m.GetInputType().GetFullyQualifiedName(),
			OutputType:      m.GetOutputType().GetFullyQualifiedName(),
		}
		byService[svcName].Methods = append(byService[svcName].Methods, mi)
	}
	sort.Strings(order)

	result := make([]ServiceInfo, 0, len(order)+len(pd.unresolvable))
	for _, name := range order {
		svc := *byService[name]
		if pd.svcFiles != nil {
			svc.SourceFile = pd.svcFiles[name]
		}
		result = append(result, svc)
	}

	// Append services the reflection server listed but could not supply descriptors for.
	// These are shown in the UI so the user knows to provide a protoset file.
	unresolvedSorted := append([]string(nil), pd.unresolvable...)
	sort.Strings(unresolvedSorted)
	for _, name := range unresolvedSorted {
		result = append(result, ServiceInfo{Name: name, Unresolvable: true})
	}

	return result
}

// FindMethod returns the method descriptor for the given "ServiceName/MethodName" path.
func (pd *ProtosetDescriptor) FindMethod(fullName string) (*desc.MethodDescriptor, error) {
	for _, m := range pd.methods {
		svcName := m.GetService().GetFullyQualifiedName()
		candidate := svcName + "/" + m.GetName()
		if candidate == fullName {
			return m, nil
		}
	}
	return nil, fmt.Errorf("method %q not found in loaded descriptors", fullName)
}

// Source returns the underlying DescriptorSource for use with grpcurl invocation.
func (pd *ProtosetDescriptor) Source() grpcurl.DescriptorSource {
	return pd.source
}
