# GRPC Nimbus

> ⚠️ **This repository is not currently accepting pull requests.** Feel free to open an issue for bug reports or feature suggestions.

A cross-platform desktop gRPC client with first-class support for **protoset files**, built on [Wails v2](https://wails.io) (Go + React).

<p align="center">
  <img src="docs/screenshots/screenshot.png" alt="GRPC Nimbus" width="900" />
</p>

---

## Install

**macOS (Homebrew)**

```bash
brew install --cask CosmicMunkey/tap/grpc-nimbus
```

**Direct downloads**

Visit the [Releases page](https://github.com/CosmicMunkey/grpc-nimbus/releases/latest) to download for macOS (Apple Silicon / Intel), Windows, or Linux.

---

## macOS: allowing the app to run

macOS Gatekeeper will block the app from launching because it isn't notarized. Run this once in Terminal after installing:

```bash
xattr -dr com.apple.quarantine "/Applications/GRPC Nimbus.app"
```

---

## Features

- Load schemas from **protoset files**, raw **`.proto` sources**, or live **server reflection**
- Type-aware **form builder** — scalars, enums, nested messages, repeated fields, maps, oneof
- Switch freely between the form and a raw **JSON editor**
- **Environments** — switch server configs (host, TLS, default metadata) with one click; metadata values support `${ENV_VAR}` and `$(shell command)` interpolation
- **Collections** — save and organize requests; export as a portable `.json` bundle that embeds the protoset so teammates can import and run it on any machine
- Full **streaming** support — server, client, and bidirectional
- **grpcurl** command generator for any request
- Themes, custom color themes, and colorblind-friendly presets
- **MCP server** — drive grpc-nimbus from an AI assistant (`go install github.com/CosmicMunkey/grpc-nimbus/cmd/mcp-server@latest`)

---

## Building from source

### Dependencies

| Tool | Version |
|---|---|
| Go | 1.21+ |
| Node.js | 24.x |
| Wails CLI | v2.12.0 (`go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0`) |

On macOS you also need Xcode Command Line Tools (`xcode-select --install`).  
On Windows you need the WebView2 runtime (ships with Windows 11; downloadable for Windows 10).

On Linux, install GCC, pkg-config, and GTK/WebKit dev libraries:

| Distro | Command |
|---|---|
| Ubuntu 20.04 / 22.04, Debian 11 | `sudo apt install gcc pkg-config libgtk-3-dev libwebkit2gtk-4.0-dev` |
| Ubuntu 24.04+, Debian 12 | `sudo apt install gcc pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev` |
| Fedora / RHEL | `sudo dnf install gcc pkg-config gtk3-devel webkit2gtk4.1-devel` |
| Arch Linux | `sudo pacman -S base-devel gtk3 webkit2gtk` |

### Build

```bash
git clone https://github.com/CosmicMunkey/grpc-nimbus
cd grpc-nimbus
wails build
```

Output is placed in `build/bin/`. For development with hot-reload: `wails dev`.

### MCP server

```bash
go install github.com/CosmicMunkey/grpc-nimbus/cmd/mcp-server@latest
```

The MCP binary has no UI dependency — pure Go, no Wails or WebView2 required.

---

## MCP Server

`grpc-nimbus-mcp` is a standalone [Model Context Protocol](https://modelcontextprotocol.io) server that lets any MCP-compatible AI assistant (Claude Desktop, Cursor, VS Code Copilot, etc.) drive gRPC requests programmatically. It reads the same config directory as the desktop app so all saved environments and collections are immediately available.

### Available tools

| Tool | Description |
|------|-------------|
| `connect` | Connect to a gRPC server (target, TLS mode, optional mTLS cert/key) |
| `connect_with_environment` | Connect using a saved environment's target and TLS, and activate it so its headers apply |
| `disconnect` | Close the current connection |
| `get_connection_state` | Return connectivity state |
| `list_environments` | List all saved environments (name, target, TLS, active status, header count) |
| `set_active_environment` | Activate a saved environment by name or ID |
| `load_protoset` | Load a `.protoset` file by path |
| `load_via_reflection` | Discover services via server reflection |
| `list_services` | List all loaded services and methods |
| `get_request_schema` | Get the JSON field schema for a method's input message |
| `list_collections` | List saved request collections |
| `get_collection` | Get a collection and all its saved requests |
| `invoke_unary` | Invoke any unary RPC with a JSON request body |
| `invoke_saved_request` | Run a single named saved request from a collection |
| `run_collection` | Run all requests in a collection and return a pass/fail report |

### Typical workflow

1. `connect_with_environment` — connect and activate saved headers
2. `load_via_reflection` or `load_protoset` — discover services
3. `invoke_unary` or `run_collection` — call RPCs or run a saved collection as a regression suite

### Registration

**Claude Desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "grpc-nimbus": {
      "command": "grpc-nimbus-mcp"
    }
  }
}
```

**Cursor / VS Code** — add to `.cursor/mcp.json` or `.vscode/mcp.json`:

```json
{
  "servers": {
    "grpc-nimbus": {
      "type": "stdio",
      "command": "grpc-nimbus-mcp"
    }
  }
}
```

---

## License

[MIT](LICENSE)
