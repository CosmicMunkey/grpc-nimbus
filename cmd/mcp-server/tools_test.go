package main

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/mark3labs/mcp-go/mcp"
	"grpc-nimbus/internal/rpc"
	"grpc-nimbus/internal/storage"
)

func TestHandleInvokeUnaryRejectsInvalidTimeout(t *testing.T) {
	t.Parallel()

	engine := &MCPEngine{}
	handler := handleInvokeUnary(engine)
	req := mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Arguments: map[string]any{
				"method_path":     "example.Service/Method",
				"timeout_seconds": 0,
			},
		},
	}

	result, err := handler(context.Background(), req)
	if err != nil {
		t.Fatalf("handler returned unexpected error: %v", err)
	}
	if !result.IsError {
		t.Fatalf("expected tool error result")
	}
	if got := firstResultText(t, result); !strings.Contains(got, "timeout_seconds must be greater than 0") {
		t.Fatalf("unexpected error message: %q", got)
	}
}

func TestHandleConnectWithEnvironmentPersistsActiveEnvironment(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	envStore, err := storage.NewEnvStoreAt(filepath.Join(tmpDir, "environments"))
	if err != nil {
		t.Fatalf("creating env store: %v", err)
	}
	settingsStore, err := storage.NewSettingsStoreAt(filepath.Join(tmpDir, "settings.json"))
	if err != nil {
		t.Fatalf("creating settings store: %v", err)
	}

	env := storage.Environment{
		ID:     "env-1",
		Name:   "dev",
		Target: "localhost:65535",
		TLS:    string(rpc.TLSModeNone),
	}
	if err := envStore.SaveEnvironment(env); err != nil {
		t.Fatalf("saving environment: %v", err)
	}

	engine := &MCPEngine{
		ctx:      context.Background(),
		envStore: envStore,
		settings: settingsStore,
	}
	t.Cleanup(engine.Disconnect)

	handler := handleConnectWithEnvironment(engine)
	req := mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Arguments: map[string]any{
				"environment_id": env.ID,
			},
		},
	}

	result, err := handler(context.Background(), req)
	if err != nil {
		t.Fatalf("handler returned unexpected error: %v", err)
	}
	if result.IsError {
		t.Fatalf("expected success result, got: %q", firstResultText(t, result))
	}

	if engine.activeEnv == nil || engine.activeEnv.ID != env.ID {
		t.Fatalf("active environment not set")
	}

	saved, err := settingsStore.Load()
	if err != nil {
		t.Fatalf("loading settings: %v", err)
	}
	if saved.ActiveEnvironmentID != env.ID {
		t.Fatalf("expected active environment %q, got %q", env.ID, saved.ActiveEnvironmentID)
	}
}

func TestValidateTimeoutSeconds(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		timeout float64
		wantErr bool
	}{
		{name: "valid", timeout: 1, wantErr: false},
		{name: "zero", timeout: 0, wantErr: true},
		{name: "negative", timeout: -1, wantErr: true},
		{name: "too large", timeout: maxInvokeTimeoutSeconds + 1, wantErr: true},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := validateTimeoutSeconds(tt.timeout)
			if tt.wantErr && err == nil {
				t.Fatalf("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestInterpolateRequestRequestMetadataOverridesEnvHeadersCaseInsensitive(t *testing.T) {
	t.Parallel()

	env := &storage.Environment{
		Headers: []storage.EnvHeader{
			{Key: "authorization", Value: "Bearer env"},
			{Key: "x-request-id", Value: "env-id"},
		},
	}
	req := rpc.InvokeRequest{
		Metadata: []rpc.MetadataEntry{
			{Key: "Authorization", Value: "Bearer req"},
		},
	}

	got := interpolateRequest(req, env)
	if len(got.Metadata) != 2 {
		t.Fatalf("expected 2 metadata entries, got %d", len(got.Metadata))
	}
	if got.Metadata[0].Key != "x-request-id" || got.Metadata[0].Value != "env-id" {
		t.Fatalf("expected env x-request-id to remain, got %+v", got.Metadata[0])
	}
	if got.Metadata[1].Key != "Authorization" || got.Metadata[1].Value != "Bearer req" {
		t.Fatalf("expected request Authorization to override env, got %+v", got.Metadata[1])
	}
}

func firstResultText(t *testing.T, result *mcp.CallToolResult) string {
	t.Helper()
	if len(result.Content) == 0 {
		t.Fatalf("result has no content")
	}
	text, ok := mcp.AsTextContent(result.Content[0])
	if !ok {
		t.Fatalf("expected text content, got %T", result.Content[0])
	}
	return text.Text
}
