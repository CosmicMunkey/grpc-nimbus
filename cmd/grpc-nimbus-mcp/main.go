package main

import (
	"context"
	"log"
	"os"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	ctx := context.Background()
	engine := NewMCPEngine(ctx)

	s := server.NewMCPServer(
		"grpc-nimbus",
		"1.0.0",
		server.WithToolCapabilities(true),
	)

	// ── Connection ────────────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("connect",
		mcp.WithDescription("Connect to a gRPC server."),
		mcp.WithString("target",
			mcp.Description("Server address, e.g. \"localhost:50051\""),
			mcp.Required(),
		),
		mcp.WithString("tls_mode",
			mcp.Description("TLS mode: \"none\" (default) or \"system\""),
		),
		mcp.WithString("client_cert",
			mcp.Description("Path to client certificate file for mTLS (optional)"),
		),
		mcp.WithString("client_key",
			mcp.Description("Path to client key file for mTLS (optional)"),
		),
	), handleConnect(engine))

	s.AddTool(mcp.NewTool("connect_with_environment",
		mcp.WithDescription("Connect to the gRPC server configured in a saved environment and activate that environment so its headers are applied to subsequent requests."),
		mcp.WithString("environment_name",
			mcp.Description("Name of the saved environment (use list_environments to see options)"),
		),
		mcp.WithString("environment_id",
			mcp.Description("ID of the saved environment (alternative to environment_name)"),
		),
	), handleConnectWithEnvironment(engine))

	s.AddTool(mcp.NewTool("disconnect",
		mcp.WithDescription("Close the current gRPC connection."),
	), handleDisconnect(engine))

	s.AddTool(mcp.NewTool("get_connection_state",
		mcp.WithDescription("Return the current gRPC connectivity state: disconnected, idle, connecting, ready, transient_failure, or shutdown."),
	), handleGetConnectionState(engine))

	// ── Environments ──────────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("list_environments",
		mcp.WithDescription("List all saved environments. Environments store a target host, TLS mode, and default headers that are applied to every request when active."),
	), handleListEnvironments(engine))

	s.AddTool(mcp.NewTool("set_active_environment",
		mcp.WithDescription("Activate a saved environment so its headers are automatically prepended to every request. Omit both parameters to clear the active environment."),
		mcp.WithString("environment_name",
			mcp.Description("Name of the environment to activate"),
		),
		mcp.WithString("environment_id",
			mcp.Description("ID of the environment to activate (alternative to environment_name)"),
		),
	), handleSetActiveEnvironment(engine))

	// ── Descriptor loading ────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("load_protoset",
		mcp.WithDescription("Load a compiled .protoset file to discover available services and methods. The new descriptors are merged with any already loaded."),
		mcp.WithString("path",
			mcp.Description("Absolute path to the .protoset file"),
			mcp.Required(),
		),
	), handleLoadProtoset(engine))

	s.AddTool(mcp.NewTool("load_via_reflection",
		mcp.WithDescription("Discover services and methods by querying the connected server's gRPC reflection API. Requires an active connection."),
	), handleLoadViaReflection(engine))

	s.AddTool(mcp.NewTool("list_services",
		mcp.WithDescription("Return all services and their methods from the currently loaded descriptor. Each method includes its full name, streaming type, and input/output message types."),
	), handleListServices(engine))

	s.AddTool(mcp.NewTool("get_request_schema",
		mcp.WithDescription("Return the JSON field schema for a method's input message. Use this to understand what fields to include in a request_json body before calling invoke_unary."),
		mcp.WithString("method_path",
			mcp.Description("Full method path, e.g. \"com.example.Greeter/SayHello\""),
			mcp.Required(),
		),
	), handleGetRequestSchema(engine))

	// ── Collections ───────────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("list_collections",
		mcp.WithDescription("List all saved request collections. Collections group related saved requests and may reference protoset/proto files needed to replay them."),
	), handleListCollections(engine))

	s.AddTool(mcp.NewTool("get_collection",
		mcp.WithDescription("Retrieve a collection and all its saved requests by name or ID."),
		mcp.WithString("name",
			mcp.Description("Collection name"),
		),
		mcp.WithString("id",
			mcp.Description("Collection ID (alternative to name)"),
		),
	), handleGetCollection(engine))

	// ── Invocation ────────────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("invoke_unary",
		mcp.WithDescription("Invoke a unary (or server-streaming) RPC and return the response. The active environment's headers are prepended automatically."),
		mcp.WithString("method_path",
			mcp.Description("Full method path, e.g. \"com.example.Greeter/SayHello\""),
			mcp.Required(),
		),
		mcp.WithString("request_json",
			mcp.Description("JSON body for the request message. Use get_request_schema to discover available fields. Defaults to \"{}\" if omitted."),
		),
		mcp.WithNumber("timeout_seconds",
			mcp.Description("Request timeout in seconds (default: 30)"),
		),
	), handleInvokeUnary(engine))

	s.AddTool(mcp.NewTool("invoke_saved_request",
		mcp.WithDescription("Execute a single named saved request from a collection. The active environment's headers are prepended automatically."),
		mcp.WithString("collection_name",
			mcp.Description("Collection name (use list_collections to see options)"),
		),
		mcp.WithString("collection_id",
			mcp.Description("Collection ID (alternative to collection_name)"),
		),
		mcp.WithString("request_name",
			mcp.Description("Name of the saved request to run"),
		),
		mcp.WithString("request_id",
			mcp.Description("ID of the saved request (alternative to request_name)"),
		),
	), handleInvokeSavedRequest(engine))

	// ── Regression testing ────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("run_collection",
		mcp.WithDescription("Run all saved requests in a collection and return a structured pass/fail report. A request passes when the gRPC status code is OK (0). Use this to orchestrate regression tests across one or more services."),
		mcp.WithString("collection_name",
			mcp.Description("Collection name (use list_collections to see options)"),
		),
		mcp.WithString("collection_id",
			mcp.Description("Collection ID (alternative to collection_name)"),
		),
		mcp.WithBoolean("stop_on_failure",
			mcp.Description("Stop running after the first failed request (default: false)"),
		),
	), handleRunCollection(engine))

	stdio := server.NewStdioServer(s)
	stdio.SetErrorLogger(log.New(os.Stderr, "", 0))
	if err := stdio.Listen(ctx, os.Stdin, os.Stdout); err != nil {
		log.Fatalf("MCP server error: %v", err)
	}
}
