package grpc

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/fullstorydev/grpcurl"
	"github.com/jhump/protoreflect/desc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	// grpcurl needs the older proto.Message interface from here
	"github.com/golang/protobuf/proto" //nolint:staticcheck // required by grpcurl API
)

// InvokeRequest is the frontend-facing request payload.
type InvokeRequest struct {
	// MethodPath is "ServiceName/MethodName" (matches MethodInfo.FullName).
	MethodPath string `json:"methodPath"`
	// RequestJSON is the JSON-encoded request message body.
	RequestJSON string `json:"requestJson"`
	// Metadata is a list of key/value header pairs to send.
	Metadata []MetadataEntry `json:"metadata"`
	// TimeoutSeconds is an optional per-RPC deadline. 0 means no timeout.
	TimeoutSeconds float64 `json:"timeoutSeconds"`
}

// MetadataEntry is a single gRPC metadata header key/value pair.
type MetadataEntry struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// InvokeResponse is the frontend-facing response payload.
type InvokeResponse struct {
	// ResponseJSON is the JSON-encoded response message.
	ResponseJSON string `json:"responseJson"`
	// Status is the gRPC status code string (e.g. "OK", "NOT_FOUND").
	Status string `json:"status"`
	// StatusCode is the numeric gRPC status code.
	StatusCode int `json:"statusCode"`
	// StatusMessage is the gRPC status message.
	StatusMessage string `json:"statusMessage"`
	// Headers is the response initial metadata.
	Headers []MetadataEntry `json:"headers"`
	// Trailers is the response trailing metadata.
	Trailers []MetadataEntry `json:"trailers"`
	// DurationMs is the round-trip time in milliseconds.
	DurationMs int64 `json:"durationMs"`
	// Error is set when an application-level error occurred.
	Error string `json:"error,omitempty"`
}

// InvokeUnary sends a single unary RPC and returns the response.
func InvokeUnary(
	ctx context.Context,
	conn *Connection,
	pd *ProtosetDescriptor,
	req InvokeRequest,
) (*InvokeResponse, error) {
	md, err := pd.FindMethod(req.MethodPath)
	if err != nil {
		return nil, err
	}
	if md.IsClientStreaming() || md.IsServerStreaming() {
		return nil, fmt.Errorf("method %q is streaming; use the streaming invoker", req.MethodPath)
	}

	if req.TimeoutSeconds > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(req.TimeoutSeconds*float64(time.Second)))
		defer cancel()
	}

	// Build outgoing metadata headers.
	var extraHeaders []string
	for _, e := range req.Metadata {
		extraHeaders = append(extraHeaders, fmt.Sprintf("%s: %s", e.Key, e.Value))
	}

	// Build request parser (JSON → proto.Message) and response formatter (proto.Message → JSON).
	rf, formatter, err := grpcurl.RequestParserAndFormatterFor(
		grpcurl.FormatJSON, pd.Source(), true, false,
		strings.NewReader(req.RequestJSON),
	)
	if err != nil {
		return nil, fmt.Errorf("building request parser/formatter: %w", err)
	}

	handler := &collectingHandler{
		formatter: formatter,
	}

	start := time.Now()
	invokeErr := grpcurl.InvokeRPC(ctx, pd.Source(), conn.ClientConn(), req.MethodPath, extraHeaders, handler, rf.Next)
	elapsed := time.Since(start)

	resp := &InvokeResponse{
		DurationMs: elapsed.Milliseconds(),
	}

	if handler.grpcStatus != nil {
		resp.Status = handler.grpcStatus.Code().String()
		resp.StatusCode = int(handler.grpcStatus.Code())
		resp.StatusMessage = handler.grpcStatus.Message()
	}

	resp.Headers = mdToEntries(handler.respHeaders)
	resp.Trailers = mdToEntries(handler.respTrailers)
	resp.ResponseJSON = handler.respBuf.String()

	if invokeErr != nil {
		resp.Error = invokeErr.Error()
	}

	return resp, nil
}

// collectingHandler implements grpcurl.InvocationEventHandler to capture
// response data during a grpcurl.InvokeRPC call.
type collectingHandler struct {
	respBuf      bytes.Buffer
	respHeaders  metadata.MD
	respTrailers metadata.MD
	grpcStatus   *status.Status
	formatter    grpcurl.Formatter
}

func (h *collectingHandler) OnResolveMethod(md *desc.MethodDescriptor) {}
func (h *collectingHandler) OnSendHeaders(md metadata.MD)              {}

func (h *collectingHandler) OnReceiveHeaders(md metadata.MD) {
	h.respHeaders = md
}

func (h *collectingHandler) OnReceiveResponse(msg proto.Message) {
	if h.formatter == nil {
		return
	}
	jsn, err := h.formatter(msg)
	if err == nil {
		h.respBuf.WriteString(jsn)
	}
}

func (h *collectingHandler) OnReceiveTrailers(stat *status.Status, md metadata.MD) {
	h.grpcStatus = stat
	h.respTrailers = md
}

func mdToEntries(md metadata.MD) []MetadataEntry {
	if len(md) == 0 {
		return nil
	}
	var entries []MetadataEntry
	for k, vs := range md {
		for _, v := range vs {
			entries = append(entries, MetadataEntry{Key: k, Value: v})
		}
	}
	return entries
}

// PrettyJSON re-indents a JSON string for display. Returns the original on error.
func PrettyJSON(raw string) string {
	var buf bytes.Buffer
	if err := json.Indent(&buf, []byte(raw), "", "  "); err != nil {
		return raw
	}
	return buf.String()
}

