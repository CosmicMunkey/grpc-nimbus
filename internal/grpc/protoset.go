package grpc

import (
	"context"
	"fmt"
	"sort"

	"github.com/fullstorydev/grpcurl"
	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/grpcreflect"
	"google.golang.org/grpc"
)

// MethodInfo is the frontend-facing descriptor for a single RPC method.
type MethodInfo struct {
	FullName        string `json:"fullName"`        // e.g. "com.example.Greeter/SayHello"
	ServiceName     string `json:"serviceName"`     // e.g. "com.example.Greeter"
	MethodName      string `json:"methodName"`      // e.g. "SayHello"
	ClientStreaming  bool   `json:"clientStreaming"`
	ServerStreaming  bool   `json:"serverStreaming"`
	InputType       string `json:"inputType"`
	OutputType      string `json:"outputType"`
	RequestSchema   string `json:"requestSchema"`
}

// ServiceInfo groups methods under a service.
type ServiceInfo struct {
	Name       string       `json:"name"`
	Methods    []MethodInfo `json:"methods"`
	SourceFile string       `json:"sourceFile,omitempty"` // set when loaded from a protoset file
}

// ProtosetDescriptor holds the parsed descriptor source from any loading strategy.
type ProtosetDescriptor struct {
	source     grpcurl.DescriptorSource
	methods    []*desc.MethodDescriptor
	svcFiles   map[string]string    // service full name → source file path (protoset only)
	reflClient *grpcreflect.Client  // non-nil when loaded via server reflection
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
	return newDescriptor(src, nil)
}

// LoadViaReflection queries server reflection on the given connection.
func LoadViaReflection(ctx context.Context, cc *grpc.ClientConn) (*ProtosetDescriptor, error) {
	refClient := grpcreflect.NewClientAuto(ctx, cc)
	src := grpcurl.DescriptorSourceFromServer(ctx, refClient)
	pd, err := newDescriptor(src, refClient)
	if err != nil {
		refClient.Reset()
		return nil, err
	}
	return pd, nil
}

// Close cleans up any resources held by the descriptor (e.g., reflection stream).
func (pd *ProtosetDescriptor) Close() {
	if pd.reflClient != nil {
		pd.reflClient.Reset()
	}
}

func newDescriptor(src grpcurl.DescriptorSource, reflClient *grpcreflect.Client) (*ProtosetDescriptor, error) {
	svcNames, err := src.ListServices()
	if err != nil {
		return nil, fmt.Errorf("listing services: %w", err)
	}

	var methods []*desc.MethodDescriptor
	for _, svcName := range svcNames {
		// Skip the gRPC reflection meta-service.
		if svcName == "grpc.reflection.v1alpha.ServerReflection" ||
			svcName == "grpc.reflection.v1.ServerReflection" {
			continue
		}
		dsc, err := src.FindSymbol(svcName)
		if err != nil {
			continue
		}
		sd, ok := dsc.(*desc.ServiceDescriptor)
		if !ok {
			continue
		}
		methods = append(methods, sd.GetMethods()...)
	}
	return &ProtosetDescriptor{source: src, methods: methods, reflClient: reflClient}, nil
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
			ClientStreaming:  m.IsClientStreaming(),
			ServerStreaming:  m.IsServerStreaming(),
			InputType:       m.GetInputType().GetFullyQualifiedName(),
			OutputType:      m.GetOutputType().GetFullyQualifiedName(),
		}
		byService[svcName].Methods = append(byService[svcName].Methods, mi)
	}
	sort.Strings(order)

	result := make([]ServiceInfo, 0, len(order))
	for _, name := range order {
		svc := *byService[name]
		if pd.svcFiles != nil {
			svc.SourceFile = pd.svcFiles[name]
		}
		result = append(result, svc)
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

