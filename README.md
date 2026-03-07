# GRPC Nimbus

A cross-platform desktop gRPC client with first-class support for **protoset files**, built on [Wails v2](https://wails.io) (Go + React). Ships as a single native binary for macOS, Windows, and Linux.

---

## Why GRPC Nimbus?

Most gRPC tools (Insomnia, Postman, BloomRPC, grpc-client-cli) focus on loading raw `.proto` source files. In many teams the build pipeline emits **compiled `.protoset` files** — binary FileDescriptorSet bundles that encode the full schema without requiring all imported `.proto` sources to be present. GRPC Nimbus makes these first-class citizens.

| Feature | grpc-nimbus | grpcui | grpcurl | Postman |
|---|---|---|---|---|
| Protoset file loading | ✅ | ✅ | ✅ | ❌ |
| Visual form builder | ✅ | ✅ | ❌ | ✅ |
| Server reflection | ✅ | ✅ | ✅ | ✅ |
| Saved collections | ✅ | ❌ | ❌ | ✅ |
| Portable export (bundled protosets) | ✅ | ❌ | ❌ | ❌ |
| Native desktop binary | ✅ | ❌ | ❌ | ✅ |
| Streaming (client/server/bidi) | ✅ | ✅ | ✅ | ✅ |
| Environment variables | ✅ | ❌ | ❌ | ✅ |

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

### Collections & history
- Save any request to a named collection (create new or add to existing)
- Collections persist across restarts; load a saved request in one click
- **Portable export** — exporting a collection embeds all referenced protoset files as base64 so the `.json` bundle can be shared with a colleague and imported on any machine, no separate file transfer needed
- Per-session request history ring-buffer for quick replay

### Environments
- Define named environments with `KEY=value` variables
- Reference them in request bodies and metadata with `{{VAR_NAME}}`
- Switch environments from the connection bar

### Connections
- Plain-text or TLS connections
- Connection config (host:port, TLS mode) saved and restored automatically
- Last-loaded protoset / proto files restored on next launch

### Streaming
- Unary, server-streaming, client-streaming, and bidirectional streaming
- Live event log in the response panel with a stop button

---

## Building from source

### Prerequisites
| Tool | Version |
|---|---|
| Go | 1.21+ |
| Node.js | 18+ |
| Wails CLI | v2.x (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`) |

On macOS you also need Xcode Command Line Tools (`xcode-select --install`).  
On Linux you need `libgtk-3-dev`, `libwebkit2gtk-4.0-dev`, and `pkg-config`.  
On Windows you need the WebView2 runtime (ships with Windows 11; downloadable for Windows 10).

### Build

```bash
git clone https://github.com/your-org/grpc-nimbus
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

## Project structure

```
grpc-nimbus/
├── main.go                   # Wails entry point, app menu
├── app.go                    # All backend methods bound to the frontend
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Root layout, menu event listeners
│   │   ├── components/
│   │   │   ├── ConnectionBar/    # Host, TLS, environment selector
│   │   │   ├── ProtosetLoader/   # Protoset / proto / reflection loader
│   │   │   ├── RequestBuilder/   # FormBuilder (type-aware field editors)
│   │   │   ├── RequestPanel/     # Form + JSON + Metadata tabs, Send button
│   │   │   ├── ResponsePanel/    # Response viewer, streaming log, history
│   │   │   └── Sidebar/          # Service tree, collections panel
│   │   └── store/
│   │       └── appStore.ts       # Zustand store, all frontend state
└── internal/
    ├── grpc/
    │   ├── protoset.go       # Descriptor loading (.protoset, .proto, reflection)
    │   ├── invoker.go        # Unary and streaming invocation
    │   ├── client.go         # gRPC connection management
    │   └── schema.go         # Proto → FieldSchema tree for the form builder
    └── storage/
        ├── collections.go    # Collection CRUD + portable export/import
        ├── environments.go   # Environment variable CRUD
        ├── history.go        # Request history ring-buffer
        └── settings.go       # App settings persistence (last paths, connection)
```

---

## License

[MIT](LICENSE)
