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
	MethodPath     string          `json:"methodPath"`
	RequestJSON    string          `json:"requestJson"`
	Metadata       []MetadataEntry `json:"metadata"`
	TimeoutSeconds float64         `json:"timeoutSeconds"`
}

// MetadataEntry is a single gRPC metadata header key/value pair.
type MetadataEntry struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// InvokeResponse is the frontend-facing response payload.
type InvokeResponse struct {
	ResponseJSON  string          `json:"responseJson"`
	Status        string          `json:"status"`
	StatusCode    int             `json:"statusCode"`
	StatusMessage string          `json:"statusMessage"`
	Headers       []MetadataEntry `json:"headers"`
	Trailers      []MetadataEntry `json:"trailers"`
	DurationMs    int64           `json:"durationMs"`
	Error         string          `json:"error,omitempty"`
	// Streaming indicates this response may contain multiple newline-separated JSON objects.
	Streaming bool `json:"streaming,omitempty"`
}

// StreamEvent is emitted for each message in a streaming RPC.
type StreamEvent struct {
	// Type is "message", "header", "trailer", or "error".
	Type        string          `json:"type"`
	JSON        string          `json:"json,omitempty"`
	Metadata    []MetadataEntry `json:"metadata,omitempty"`
	Status      string          `json:"status,omitempty"`
	StatusCode  int             `json:"statusCode,omitempty"`
	Error       string          `json:"error,omitempty"`
}

// StreamEventCallback is called for each event during a streaming invocation.
type StreamEventCallback func(event StreamEvent)

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
	if md.IsClientStreaming() {
		return nil, fmt.Errorf("method %q uses client streaming; only server-streaming and unary are supported", req.MethodPath)
	}

	if req.TimeoutSeconds > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(req.TimeoutSeconds*float64(time.Second)))
		defer cancel()
	}

	extraHeaders := buildHeaders(req.Metadata)

	rf, formatter, err := grpcurl.RequestParserAndFormatterFor(
		grpcurl.FormatJSON, pd.Source(), true, false,
		strings.NewReader(req.RequestJSON),
	)
	if err != nil {
		return nil, fmt.Errorf("building request parser/formatter: %w", err)
	}

	handler := &collectingHandler{formatter: formatter}

	start := time.Now()
	invokeErr := grpcurl.InvokeRPC(ctx, pd.Source(), conn.ClientConn(), req.MethodPath, extraHeaders, handler, rf.Next)
	elapsed := time.Since(start)

	resp := &InvokeResponse{
		DurationMs: elapsed.Milliseconds(),
		Streaming:  md.IsServerStreaming(),
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

// InvokeStream sends a streaming RPC, calling cb for each event.
// Supports server-streaming and unary (callback receives one message event).
func InvokeStream(
	ctx context.Context,
	conn *Connection,
	pd *ProtosetDescriptor,
	req InvokeRequest,
	cb StreamEventCallback,
) error {
	if req.TimeoutSeconds > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(req.TimeoutSeconds*float64(time.Second)))
		defer cancel()
	}

	extraHeaders := buildHeaders(req.Metadata)

	rf, formatter, err := grpcurl.RequestParserAndFormatterFor(
		grpcurl.FormatJSON, pd.Source(), true, false,
		strings.NewReader(req.RequestJSON),
	)
	if err != nil {
		return fmt.Errorf("building request parser/formatter: %w", err)
	}

	handler := &streamingHandler{formatter: formatter, cb: cb}
	return grpcurl.InvokeRPC(ctx, pd.Source(), conn.ClientConn(), req.MethodPath, extraHeaders, handler, rf.Next)
}

// ─── Handlers ────────────────────────────────────────────────────────────────

type collectingHandler struct {
	respBuf      bytes.Buffer
	respHeaders  metadata.MD
	respTrailers metadata.MD
	grpcStatus   *status.Status
	formatter    grpcurl.Formatter
}

func (h *collectingHandler) OnResolveMethod(md *desc.MethodDescriptor) {}
func (h *collectingHandler) OnSendHeaders(md metadata.MD)              {}
func (h *collectingHandler) OnReceiveHeaders(md metadata.MD)           { h.respHeaders = md }
func (h *collectingHandler) OnReceiveTrailers(stat *status.Status, md metadata.MD) {
	h.grpcStatus = stat
	h.respTrailers = md
}
func (h *collectingHandler) OnReceiveResponse(msg proto.Message) {
	if h.formatter == nil {
		return
	}
	if jsn, err := h.formatter(msg); err == nil {
		h.respBuf.WriteString(jsn)
	}
}

type streamingHandler struct {
	formatter grpcurl.Formatter
	cb        StreamEventCallback
}

func (h *streamingHandler) OnResolveMethod(md *desc.MethodDescriptor) {}
func (h *streamingHandler) OnSendHeaders(md metadata.MD)              {}
func (h *streamingHandler) OnReceiveHeaders(md metadata.MD) {
	h.cb(StreamEvent{Type: "header", Metadata: mdToEntries(md)})
}
func (h *streamingHandler) OnReceiveResponse(msg proto.Message) {
	if h.formatter == nil {
		return
	}
	jsn, err := h.formatter(msg)
	if err != nil {
		h.cb(StreamEvent{Type: "error", Error: err.Error()})
		return
	}
	h.cb(StreamEvent{Type: "message", JSON: jsn})
}
func (h *streamingHandler) OnReceiveTrailers(stat *status.Status, md metadata.MD) {
	h.cb(StreamEvent{
		Type:       "trailer",
		Metadata:   mdToEntries(md),
		Status:     stat.Code().String(),
		StatusCode: int(stat.Code()),
	})
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func buildHeaders(md []MetadataEntry) []string {
	headers := make([]string, 0, len(md))
	for _, e := range md {
		headers = append(headers, fmt.Sprintf("%s: %s", e.Key, e.Value))
	}
	return headers
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

