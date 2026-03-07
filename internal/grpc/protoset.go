package grpc

import (
	"fmt"
	"sort"

	"github.com/fullstorydev/grpcurl"
	"github.com/jhump/protoreflect/desc"
)

// MethodInfo is the frontend-facing descriptor for a single RPC method.
type MethodInfo struct {
	FullName       string `json:"fullName"`       // e.g. "com.example.Greeter/SayHello"
	ServiceName    string `json:"serviceName"`    // e.g. "com.example.Greeter"
	MethodName     string `json:"methodName"`     // e.g. "SayHello"
	ClientStreaming bool   `json:"clientStreaming"`
	ServerStreaming bool   `json:"serverStreaming"`
	// InputType is the fully-qualified message name for the request.
	InputType  string `json:"inputType"`
	OutputType string `json:"outputType"`
	// RequestSchema is a JSON object template (field name → zero value) for the request.
	RequestSchema string `json:"requestSchema"`
}

// ServiceInfo groups methods under a service.
type ServiceInfo struct {
	Name    string       `json:"name"`
	Methods []MethodInfo `json:"methods"`
}

// ProtosetDescriptor holds the parsed descriptor source from one or more protoset files.
type ProtosetDescriptor struct {
	source grpcurl.DescriptorSource
	methods []*desc.MethodDescriptor
}

// LoadProtosets parses the given protoset file paths and returns a descriptor.
func LoadProtosets(paths []string) (*ProtosetDescriptor, error) {
	if len(paths) == 0 {
		return nil, fmt.Errorf("no protoset files provided")
	}
	src, err := grpcurl.DescriptorSourceFromProtoSets(paths...)
	if err != nil {
		return nil, fmt.Errorf("loading protoset files: %w", err)
	}
	svcNames, err := src.ListServices()
	if err != nil {
		return nil, fmt.Errorf("listing services: %w", err)
	}

	var methods []*desc.MethodDescriptor
	for _, svcName := range svcNames {
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
	return &ProtosetDescriptor{source: src, methods: methods}, nil
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
			FullName:       svcName + "/" + m.GetName(),
			ServiceName:    svcName,
			MethodName:     m.GetName(),
			ClientStreaming: m.IsClientStreaming(),
			ServerStreaming: m.IsServerStreaming(),
			InputType:      m.GetInputType().GetFullyQualifiedName(),
			OutputType:     m.GetOutputType().GetFullyQualifiedName(),
		}
		byService[svcName].Methods = append(byService[svcName].Methods, mi)
	}
	sort.Strings(order)

	result := make([]ServiceInfo, 0, len(order))
	for _, name := range order {
		result = append(result, *byService[name])
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
	return nil, fmt.Errorf("method %q not found in loaded protosets", fullName)
}

// Source returns the underlying DescriptorSource for use with grpcurl invocation.
func (pd *ProtosetDescriptor) Source() grpcurl.DescriptorSource {
	return pd.source
}
