package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"grpc-nimbus/internal/rpc"
	"grpc-nimbus/internal/storage"
)

// toolError returns a CallToolResult that signals a tool-level error to the LLM.
// Per the MCP spec, tool errors should use isError:true so the LLM can self-correct.
func toolError(format string, args ...any) (*mcp.CallToolResult, error) {
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: fmt.Sprintf(format, args...)}},
		IsError: true,
	}, nil
}

func toolText(text string) (*mcp.CallToolResult, error) {
	return mcp.NewToolResultText(text), nil
}

func toolJSON(v any) (*mcp.CallToolResult, error) {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return toolError("failed to marshal result: %v", err)
	}
	return mcp.NewToolResultText(string(data)), nil
}

// ─── Connection tools ─────────────────────────────────────────────────────────

func handleConnect(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		target := req.GetString("target", "")
		if target == "" {
			return toolError("target is required (e.g. \"localhost:50051\")")
		}
		tlsMode := rpc.TLSMode(req.GetString("tls_mode", string(rpc.TLSModeNone)))
		cfg := rpc.ConnectionConfig{
			Target:     target,
			TLS:        tlsMode,
			ClientCert: req.GetString("client_cert", ""),
			ClientKey:  req.GetString("client_key", ""),
		}
		if err := e.Connect(cfg); err != nil {
			return toolError("connection failed: %v", err)
		}
		return toolText(fmt.Sprintf("Connected to %s (TLS: %s)", target, tlsMode))
	}
}

func handleConnectWithEnvironment(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		name := req.GetString("environment_name", "")
		id := req.GetString("environment_id", "")

		if name == "" && id == "" {
			return toolError("provide either environment_name or environment_id")
		}

		if e.envStore == nil {
			return toolError("environment store unavailable")
		}

		var env *storage.Environment
		if id != "" {
			v, err := e.envStore.GetEnvironment(id)
			if err != nil {
				return toolError("environment %q not found: %v", id, err)
			}
			env = v
		} else {
			envs, err := e.envStore.ListEnvironments()
			if err != nil {
				return toolError("listing environments: %v", err)
			}
			for i := range envs {
				if envs[i].Name == name {
					env = &envs[i]
					break
				}
			}
			if env == nil {
				return toolError("no environment named %q", name)
			}
		}

		if env.Target == "" {
			return toolError("environment %q has no target configured", env.Name)
		}

		tlsMode := rpc.TLSMode(env.TLS)
		if tlsMode == "" {
			tlsMode = rpc.TLSModeNone
		}
		cfg := rpc.ConnectionConfig{Target: env.Target, TLS: tlsMode}
		if err := e.Connect(cfg); err != nil {
			return toolError("connection to %s failed: %v", env.Target, err)
		}

		// Activate the environment so its headers are applied to subsequent requests.
		e.mu.Lock()
		e.activeEnv = env
		e.mu.Unlock()

		return toolText(fmt.Sprintf("Connected to %s using environment %q (TLS: %s)", env.Target, env.Name, tlsMode))
	}
}

func handleDisconnect(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		e.Disconnect()
		return toolText("Disconnected")
	}
}

func handleGetConnectionState(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		state := e.GetConnectionState()
		return toolText(state)
	}
}

// ─── Environment tools ────────────────────────────────────────────────────────

func handleListEnvironments(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		if e.envStore == nil {
			return toolError("environment store unavailable")
		}
		envs, err := e.envStore.ListEnvironments()
		if err != nil {
			return toolError("listing environments: %v", err)
		}

		e.mu.Lock()
		activeID := ""
		if e.activeEnv != nil {
			activeID = e.activeEnv.ID
		}
		e.mu.Unlock()

		type envSummary struct {
			ID      string `json:"id"`
			Name    string `json:"name"`
			Target  string `json:"target,omitempty"`
			TLS     string `json:"tls,omitempty"`
			Active  bool   `json:"active"`
			Headers int    `json:"headerCount"`
		}
		summaries := make([]envSummary, len(envs))
		for i, env := range envs {
			summaries[i] = envSummary{
				ID:      env.ID,
				Name:    env.Name,
				Target:  env.Target,
				TLS:     env.TLS,
				Active:  env.ID == activeID,
				Headers: len(env.Headers),
			}
		}
		return toolJSON(summaries)
	}
}

func handleSetActiveEnvironment(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		name := req.GetString("environment_name", "")
		id := req.GetString("environment_id", "")

		if name == "" && id == "" {
			// Clear active environment.
			if err := e.SetActiveEnvironment(""); err != nil {
				return toolError("clearing active environment: %v", err)
			}
			return toolText("Active environment cleared")
		}

		if id != "" {
			if err := e.SetActiveEnvironment(id); err != nil {
				return toolError("setting active environment: %v", err)
			}
			return toolText(fmt.Sprintf("Active environment set to ID %q", id))
		}

		if err := e.SetActiveEnvironmentByName(name); err != nil {
			return toolError("%v", err)
		}
		return toolText(fmt.Sprintf("Active environment set to %q", name))
	}
}

// ─── Descriptor / proto tools ─────────────────────────────────────────────────

func handleLoadProtoset(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		path := req.GetString("path", "")
		if path == "" {
			return toolError("path is required")
		}
		services, err := e.LoadProtosets([]string{path})
		if err != nil {
			return toolError("loading protoset: %v", err)
		}
		names := make([]string, len(services))
		for i, svc := range services {
			names[i] = svc.Name
		}
		return toolText(fmt.Sprintf("Loaded %d service(s): %s", len(services), strings.Join(names, ", ")))
	}
}

func handleLoadViaReflection(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		services, err := e.LoadViaReflection()
		if err != nil {
			return toolError("reflection failed: %v", err)
		}
		names := make([]string, len(services))
		for i, svc := range services {
			names[i] = svc.Name
		}
		return toolText(fmt.Sprintf("Loaded %d service(s) via reflection: %s", len(services), strings.Join(names, ", ")))
	}
}

func handleListServices(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		services, err := e.GetServices()
		if err != nil {
			return toolError("%v", err)
		}
		return toolJSON(services)
	}
}

func handleGetRequestSchema(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		methodPath := req.GetString("method_path", "")
		if methodPath == "" {
			return toolError("method_path is required (e.g. \"com.example.Greeter/SayHello\")")
		}
		schema, err := e.GetRequestSchema(methodPath)
		if err != nil {
			return toolError("getting schema: %v", err)
		}
		return toolJSON(schema)
	}
}

// ─── Collection tools ─────────────────────────────────────────────────────────

func handleListCollections(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		if e.store == nil {
			return toolError("collection store unavailable")
		}
		cols, err := e.store.ListCollections()
		if err != nil {
			return toolError("listing collections: %v", err)
		}

		type colSummary struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description,omitempty"`
			Requests    int    `json:"requestCount"`
		}
		summaries := make([]colSummary, len(cols))
		for i, c := range cols {
			summaries[i] = colSummary{
				ID:          c.ID,
				Name:        c.Name,
				Description: c.Description,
				Requests:    len(c.Requests),
			}
		}
		return toolJSON(summaries)
	}
}

func handleGetCollection(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		if e.store == nil {
			return toolError("collection store unavailable")
		}
		name := req.GetString("name", "")
		id := req.GetString("id", "")

		if id != "" {
			col, err := e.store.GetCollection(id)
			if err != nil {
				return toolError("collection %q not found: %v", id, err)
			}
			return toolJSON(col)
		}

		if name == "" {
			return toolError("provide either id or name")
		}

		cols, err := e.store.ListCollections()
		if err != nil {
			return toolError("listing collections: %v", err)
		}
		for _, c := range cols {
			if c.Name == name {
				return toolJSON(c)
			}
		}
		return toolError("no collection named %q", name)
	}
}

// ─── Invocation tools ─────────────────────────────────────────────────────────

func handleInvokeUnary(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		methodPath := req.GetString("method_path", "")
		if methodPath == "" {
			return toolError("method_path is required")
		}
		requestJSON := req.GetString("request_json", "{}")
		timeoutSeconds := req.GetFloat("timeout_seconds", 30)

		invokeReq := rpc.InvokeRequest{
			MethodPath:     methodPath,
			RequestJSON:    requestJSON,
			TimeoutSeconds: timeoutSeconds,
		}

		resp, err := e.InvokeUnary(invokeReq)
		if err != nil {
			return toolError("invoke failed: %v", err)
		}

		type result struct {
			Status        string             `json:"status"`
			StatusCode    int                `json:"statusCode"`
			StatusMessage string             `json:"statusMessage,omitempty"`
			ResponseJSON  string             `json:"responseJson"`
			DurationMs    int64              `json:"durationMs"`
			Headers       []rpc.MetadataEntry `json:"headers,omitempty"`
			Trailers      []rpc.MetadataEntry `json:"trailers,omitempty"`
			Error         string             `json:"error,omitempty"`
		}
		return toolJSON(result{
			Status:        resp.Status,
			StatusCode:    resp.StatusCode,
			StatusMessage: resp.StatusMessage,
			ResponseJSON:  resp.ResponseJSON,
			DurationMs:    resp.DurationMs,
			Headers:       resp.Headers,
			Trailers:      resp.Trailers,
			Error:         resp.Error,
		})
	}
}

func handleInvokeSavedRequest(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		if e.store == nil {
			return toolError("collection store unavailable")
		}
		collectionName := req.GetString("collection_name", "")
		collectionID := req.GetString("collection_id", "")
		requestName := req.GetString("request_name", "")
		requestID := req.GetString("request_id", "")

		var col *storage.Collection
		if collectionID != "" {
			c, err := e.store.GetCollection(collectionID)
			if err != nil {
				return toolError("collection not found: %v", err)
			}
			col = c
		} else if collectionName != "" {
			cols, err := e.store.ListCollections()
			if err != nil {
				return toolError("listing collections: %v", err)
			}
			for i := range cols {
				if cols[i].Name == collectionName {
					col = &cols[i]
					break
				}
			}
			if col == nil {
				return toolError("no collection named %q", collectionName)
			}
		} else {
			return toolError("provide collection_name or collection_id")
		}

		var saved *storage.SavedRequest
		for i := range col.Requests {
			r := &col.Requests[i]
			if (requestID != "" && r.ID == requestID) || (requestName != "" && r.Name == requestName) {
				saved = r
				break
			}
		}
		if saved == nil {
			if requestName != "" {
				return toolError("no request named %q in collection %q", requestName, col.Name)
			}
			return toolError("no request with ID %q in collection %q", requestID, col.Name)
		}

		invokeReq := rpc.InvokeRequest{
			MethodPath:     saved.MethodPath,
			RequestJSON:    saved.RequestJSON,
			Metadata:       saved.Metadata,
			TimeoutSeconds: 30,
		}

		resp, err := e.InvokeUnary(invokeReq)
		if err != nil {
			return toolError("invoke failed: %v", err)
		}

		type result struct {
			RequestName   string             `json:"requestName"`
			MethodPath    string             `json:"methodPath"`
			Status        string             `json:"status"`
			StatusCode    int                `json:"statusCode"`
			ResponseJSON  string             `json:"responseJson"`
			DurationMs    int64              `json:"durationMs"`
			Error         string             `json:"error,omitempty"`
		}
		return toolJSON(result{
			RequestName:  saved.Name,
			MethodPath:   saved.MethodPath,
			Status:       resp.Status,
			StatusCode:   resp.StatusCode,
			ResponseJSON: resp.ResponseJSON,
			DurationMs:   resp.DurationMs,
			Error:        resp.Error,
		})
	}
}

// ─── Regression testing tool ──────────────────────────────────────────────────

func handleRunCollection(e *MCPEngine) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		if e.store == nil {
			return toolError("collection store unavailable")
		}

		collectionName := req.GetString("collection_name", "")
		collectionID := req.GetString("collection_id", "")
		stopOnFailure := req.GetBool("stop_on_failure", false)

		var col *storage.Collection
		if collectionID != "" {
			c, err := e.store.GetCollection(collectionID)
			if err != nil {
				return toolError("collection not found: %v", err)
			}
			col = c
		} else if collectionName != "" {
			cols, err := e.store.ListCollections()
			if err != nil {
				return toolError("listing collections: %v", err)
			}
			for i := range cols {
				if cols[i].Name == collectionName {
					col = &cols[i]
					break
				}
			}
			if col == nil {
				return toolError("no collection named %q", collectionName)
			}
		} else {
			return toolError("provide collection_name or collection_id")
		}

		if len(col.Requests) == 0 {
			return toolText(fmt.Sprintf("Collection %q has no saved requests", col.Name))
		}

		type requestResult struct {
			Name       string `json:"name"`
			MethodPath string `json:"methodPath"`
			Status     string `json:"status"`
			StatusCode int    `json:"statusCode"`
			DurationMs int64  `json:"durationMs"`
			Error      string `json:"error,omitempty"`
			Passed     bool   `json:"passed"`
		}

		results := make([]requestResult, 0, len(col.Requests))
		passed, failed := 0, 0

		for _, saved := range col.Requests {
			invokeReq := rpc.InvokeRequest{
				MethodPath:     saved.MethodPath,
				RequestJSON:    saved.RequestJSON,
				Metadata:       saved.Metadata,
				TimeoutSeconds: 30,
			}

			resp, err := e.InvokeUnary(invokeReq)
			r := requestResult{
				Name:       saved.Name,
				MethodPath: saved.MethodPath,
			}

			if err != nil {
				r.Error = err.Error()
				r.Passed = false
				failed++
			} else {
				r.Status = resp.Status
				r.StatusCode = resp.StatusCode
				r.DurationMs = resp.DurationMs
				r.Error = resp.Error
				// Consider OK (code 0) as passed; any non-zero gRPC status is a failure.
				r.Passed = resp.StatusCode == 0 && resp.Error == ""
				if r.Passed {
					passed++
				} else {
					failed++
				}
			}
			results = append(results, r)

			if stopOnFailure && !r.Passed {
				break
			}
		}

		type report struct {
			Collection string          `json:"collection"`
			Total      int             `json:"total"`
			Passed     int             `json:"passed"`
			Failed     int             `json:"failed"`
			Results    []requestResult `json:"results"`
		}
		return toolJSON(report{
			Collection: col.Name,
			Total:      len(results),
			Passed:     passed,
			Failed:     failed,
			Results:    results,
		})
	}
}
