# GRPC Nimbus

> ⚠️ **This repository is not currently accepting pull requests.** Feel free to open an issue for bug reports or feature suggestions.

A cross-platform desktop gRPC client with first-class support for **protoset files**, built on [Wails v2](https://wails.io) (Go + React). Ships as a single native binary for macOS, Windows, and Linux.

<p align="center">
  <img src="docs/screenshots/screenshot.png" alt="GRPC Nimbus" width="900" />
</p>

---

## Why GRPC Nimbus?

Many teams use build pipelines that emit **compiled `.protoset` files** — binary FileDescriptorSet bundles that encode the full schema without requiring all imported `.proto` sources to be present. GRPC Nimbus makes these first-class citizens alongside raw proto files and server reflection.

## Features at a glance

- **Protoset files** — load compiled `.protoset` FileDescriptorSet bundles; no import paths needed
- **Proto source files** — load raw `.proto` files with automatic import path detection
- **Server reflection** — load the full service tree from a live server, with a cancel button if it takes too long
- **Type-aware form builder** — strings, numbers, booleans, enums, nested messages, repeated fields, maps, and oneof groups
- **JSON editor** — switch between the form and a raw JSON body at any time; both stay in sync
- **Multi-tab interface** — open multiple methods simultaneously, rename tabs with a double-click
- **Saved collections** — save requests by name, organized into collections that persist across restarts
- **Portable export** — exported collections embed all referenced protoset files as base64 so the `.json` bundle works on any machine with no extra files
- **Request history** — expandable per-method history showing the full request, response body, status, headers, and trailers
- **Environments** — define named environments with default gRPC metadata headers; switch from the connection bar
- **Streaming** — unary, server-streaming, client-streaming, and bidirectional; live event log with stop button
- **Resizable layout** — drag to resize the sidebar and request/response panel split; sizes persist across restarts
- **Stale connection detection** — editing the host or TLS mode while connected surfaces a Reconnect button
- **grpcurl tab** — generates the equivalent grpcurl command for any request
- **Themes and font size** — multiple built-in themes, adjustable font size, all persisted
- **Cross-platform** — native desktop binary for macOS (arm64 + amd64), Windows, and Linux

---

## Features

### Proto loading
- **`.protoset` files** — load one or more compiled FileDescriptorSet files; no import paths needed
- **`.proto` source files** — supply import paths and source files directly
- **Server reflection** — connect to a live server that exposes gRPC reflection

### Form builder
Selecting a method populates a **type-aware form** modelled on grpcui:
- String / bytes text inputs
- Numeric inputs (int32/64, uint32/64, float, double) with free-form editing
- Boolean toggles
- Enum drop-downs
- Nested message expansion with +Set / −Remove controls
- Repeated fields with indexed list and Add / Remove buttons
- Map fields with key → value pairs
- Oneof groups with a selector to switch between options

Switch between **Form**, **JSON**, and **Metadata** tabs at any time — the two editors stay in sync.

### Tabs
- Each open request lives in its own tab; open as many as needed
- Tabs can be renamed by double-clicking the tab label
- Closing the last tab opens a fresh blank tab

### Collections & history
- Save any request to a named collection (create new or add to existing)
- Collections persist across restarts; load a saved request in one click
- **Portable export** — exporting a collection embeds all referenced protoset files as base64 so the `.json` bundle can be shared with a colleague and imported on any machine, no separate file transfer needed
- Per-session request history ring-buffer — click any entry to expand and see the full request, response body, status, headers, and trailers

### Environments
- Define named environments with default **gRPC metadata headers** (e.g. `Authorization: Bearer <token>`, `x-api-key: …`)
- Headers are prepended to every request when the environment is active; per-request metadata can still override them
- Switch environments from the connection bar; the active environment is highlighted in green

### Settings
- **Theme** — choose from a set of built-in color themes (accessible via the gear icon in the connection bar)
- **Font size** — Small (14 px), Medium (16 px), or Large (18 px); scales all UI text proportionally
- **Confirm before delete** — toggle whether a confirmation dialog appears when deleting requests, collections, or environments; defaults to on

### Resizable layout
- Drag the divider between the sidebar and request panel to resize the sidebar
- Drag the divider between the request and response panels to adjust the split
- Sizes persist across restarts

### Connection status
- The dot next to the Connect/Disconnect button reflects real gRPC connectivity: gray = disconnected, green = connected, yellow = connecting, red = transient failure
- Editing the host or TLS mode while connected changes the button to **Reconnect**, applying new settings in one click without a manual disconnect first

### Connections
- Plain-text or TLS connections (system CA or skip-verify)
- Connection config (host:port, TLS mode) saved and restored automatically
- Last-loaded protoset / proto files restored on next launch

### Server reflection
- Load the full service tree directly from a live server via gRPC reflection
- A **Cancel** button is shown while reflection is loading so you're never stuck waiting

### Streaming
- Unary, server-streaming, client-streaming, and bidirectional streaming
- Live event log in the response panel with a stop button

---

## macOS: allowing the app to run

macOS Gatekeeper will block GRPC Nimbus from launching because the app is not notarized with an Apple Developer certificate. You'll see a message like *"GRPC Nimbus.app cannot be opened because the developer cannot be verified."*

To clear the quarantine flag, run this once in Terminal after installing the app:

```bash
xattr -dr com.apple.quarantine "/Applications/GRPC Nimbus.app"
```

Then double-click the app as normal. You only need to do this once per installation.

> **Why does this happen?** Apple's Gatekeeper quarantines any app downloaded from the internet that isn't signed and notarized through Apple's paid Developer Program. This is a distribution-time restriction, not a security flaw in the app itself. The command above removes that quarantine attribute.

---

## Usage

### Loading a protoset

1. Open the **ProtoLoader** panel in the sidebar (top section).
2. Choose the **Protoset** tab and click **Load .protoset files…**
3. Select one or more `.protoset` files — services appear in the service tree immediately.

Alternatively, use the **Proto Files** tab to load raw `.proto` sources (specify import paths if needed), or the **Reflect** tab to load from a live server.

### Making a request

1. Click any method in the service tree.
2. The **Form** tab populates with all available request fields.
3. Fill in values (scalar, nested, repeated, map, oneof — all supported).
4. Optionally add metadata/headers in the **Metadata** tab.
5. Press **Send** (or `Cmd/Ctrl+Enter`).
6. The response appears in the right panel. Streaming responses update in real time.

### Saving and exporting

- Click the **Save** button in the request panel toolbar to save the current request to a collection.
- To export: **File → Export Collection…** (or the `⋮` menu on any collection in the sidebar). The exported `.json` bundles the protoset so the recipient needs no extra files.
- To import: **File → Import Collection…** or the **Import collection…** button at the bottom of the collections list.

---

## Building from source

### Dependencies
| Tool | Version |
|---|---|
| Go | 1.21+ |
| Node.js | 18+ |
| Wails CLI | v2.x (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`) |

On macOS you also need Xcode Command Line Tools (`xcode-select --install`).  
On Linux you need `libgtk-3-dev`, `libwebkit2gtk-4.0-dev` (Ubuntu 22.04 / Debian 11 or earlier), and `pkg-config`.  
On Windows you need the WebView2 runtime (ships with Windows 11; downloadable for Windows 10).

### Build

```bash
git clone https://github.com/CosmicMunkey/grpc-nimbus
cd grpc-nimbus
wails build
```

The output binary is placed in `build/bin/`.

### Development mode (hot-reload)

```bash
wails dev
```

This starts the backend in watch mode and opens the UI in a native window with Vite's hot-reload active.

---

## Project structure

```
grpc-nimbus/
├── main.go                   # Wails entry point, app menu
├── app.go                    # App struct, startup/shutdown
├── app_invoke.go             # Invoke / streaming backend methods
├── app_proto.go              # Protoset / proto / reflection loading
├── app_collections.go        # Collection CRUD backend methods
├── app_environments.go       # Environment CRUD backend methods
├── app_history.go            # Request history backend methods
├── app_settings.go           # Settings load/save backend methods
├── app_ui.go                 # Dialog / file-picker helpers
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Root layout, menu event listeners
│   │   ├── components/
│   │   │   ├── ConnectionBar/    # Host, TLS, environment selector
│   │   │   ├── Environments/     # Environment manager + selector
│   │   │   ├── ProtosetLoader/   # Protoset / proto / reflection loader
│   │   │   ├── RequestBuilder/   # FormBuilder (type-aware field editors)
│   │   │   ├── RequestPanel/     # Form + JSON + Metadata tabs, Send button
│   │   │   ├── ResponsePanel/    # Response viewer, streaming log, history
│   │   │   ├── Settings/         # Theme, font size, preferences panel
│   │   │   ├── Sidebar/          # Service tree, collections panel
│   │   │   └── TabBar/           # Tab strip
│   │   └── store/
│   │       └── appStore.ts       # Zustand store, all frontend state
└── internal/
    ├── rpc/
    │   ├── protoset.go       # Descriptor loading (.protoset, .proto, reflection)
    │   ├── invoker.go        # Unary and streaming invocation
    │   ├── client.go         # gRPC connection management
    │   └── schema.go         # Proto → FieldSchema tree for the form builder
    └── storage/
        ├── collections.go    # Collection CRUD + portable export/import
        ├── environments.go   # Environment header CRUD
        ├── history.go        # Request history ring-buffer
        └── settings.go       # App settings persistence (last paths, connection)
```

---

## License

[MIT](LICENSE)
