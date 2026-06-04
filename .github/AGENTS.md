# GRPC Nimbus Copilot Reference Guide

This document provides comprehensive context for working on gRPC Nimbus, designed for AI agents and developers doing feature enhancements, bug fixes, or refactoring.

---

## Architecture Overview

GRPC Nimbus is a Wails v2 application (Go + React) that provides a cross-platform desktop gRPC client with rich proto schema support.

### High-Level Flow

1. **User connects** → enters `host:port` + TLS mode in connection bar
2. **Loads descriptors** → from `.protoset` files, raw `.proto` sources, or server reflection
3. **Browses services** → sidebar shows loaded gRPC services and methods
4. **Selects method** → opens a tab with a type-aware form builder
5. **Builds request** → form or JSON editor, adds metadata headers, invokes
6. **Sees response** → formatted JSON (unary) or event log (streaming)
7. **Saves for reuse** → bookmarks to collections, exports as portable `.json`

### Codebase Layout

```
grpc-nimbus/
├── main.go                          # Wails app entry, menu setup
├── app.go                           # App struct definition
├── app_*.go                         # Backend API methods (split by concern)
├── version.go                       # Version info
├── window_darwin.go                 # macOS platform-specific code
├── internal/
│   ├── rpc/                         # gRPC engine (connection, invocation)
│   │   ├── client.go               # Connection setup, TLS config
│   │   ├── protoset.go             # Descriptor loading (protosets, proto files, reflection)
│   │   ├── schema.go               # Form schema generation
│   │   ├── invoker.go              # Unary & streaming invocation
│   │   └── *_test.go               # Test fixtures for TLS, reflection, protofiles
│   └── storage/                     # Persistence layer (JSON files)
│       ├── collections.go           # Saved request collections
│       ├── environments.go          # Server configs & metadata
│       ├── history.go               # Request history log
│       └── settings.go              # User preferences
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Root React component
│   │   ├── store/
│   │   │   └── appStore.ts          # Zustand store (global state)
│   │   ├── components/              # UI components
│   │   │   ├── ConnectionBar/
│   │   │   ├── TabBar/
│   │   │   ├── Sidebar/
│   │   │   ├── RequestPanel/
│   │   │   ├── ResponsePanel/
│   │   │   ├── HelpDialog/
│   │   │   ├── Settings/
│   │   │   └── ...
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript types (mirror Go structs)
│   │   └── utils/                   # Helper functions
│   └── package.json
├── cmd/
│   └── mcp-server/                  # Standalone MCP server binary
│       ├── main.go
│       ├── tools.go                 # MCP tool implementations
│       └── *_test.go
└── docs/
    └── screenshots/
```

---

## Backend Architecture

### The App Struct

`app.go` defines the main `App` struct that Wails exposes to the frontend:

```go
type App struct {
    ctx          context.Context
    rpc          *rpc.Engine       // gRPC connection & invocation
    mu           sync.Mutex        // guards rpc and descriptors
    settingsMu   sync.Mutex        // guards settings writes
    settings     *storage.Settings
    history      *storage.History
    collections  *storage.Collections
    environments *storage.Environments
}
```

**Key Invariants:**
- `a.mu` protects all connection and descriptor state. Always acquire before modifying connection or loading descriptors.
- `a.settingsMu` protects settings writes. Use `go a.saveSettings(...)` for non-blocking saves to avoid UI blocking.
- Settings and history are loaded on startup from the OS config directory (`~/.config/grpc-nimbus/` on Linux, `~/Library/Application Support/grpc-nimbus/` on macOS, etc.).

### Backend API Methods (app_*.go)

Methods are split across files by concern. All are callable from the frontend via Wails bindings:

#### `app_invoke.go` — RPC Invocation
- `InvokeUnary(tabID, methodPath, headers, timeout, requestJSON) → ResponseJSON`
- `InvokeStreaming(tabID, methodPath, headers, timeout, requestJSON, streamType)`
- `CancelStream(tabID)`

#### `app_proto.go` — Descriptor Management
- `LoadProtosets(paths) → error`
- `LoadProtoFiles(paths) → error`
- `LoadViaReflection(host, tlsConfig) → error`
- `GetLoadedState() → {services, methods, protosets, protofiles}`
- `RemoveProtosets(ids) → error`
- `RemoveProtoFiles(ids) → error`
- `GetRequestSchema(methodPath) → FormSchema`

#### `app_environments.go` — Environment Management
- `ListEnvironments() → []Environment`
- `SaveEnvironment(env) → error`
- `DeleteEnvironment(id) → error`
- `SetActiveEnvironment(id) → error`
- `GetActiveEnvironment() → Environment`

#### `app_collections.go` — Collections & Saved Requests
- `ListCollections() → []Collection`
- `SaveRequest(collection, request) → error`
- `UpdateRequest(collection, request) → error`
- `DeleteRequest(collection, id) → error`
- `ExportCollection(collection) → []byte` (embedded protoset JSON)
- `ImportCollection(data) → error`

#### `app_history.go` — Request History
- `ListHistory(limit) → []HistoryEntry`
- `ClearHistory() → error`

#### `app_settings.go` — User Settings
- `SaveSettings(settings) → error`
- `LoadSettings() → Settings`

#### `app_ui.go` — UI Events & Menus
- `TriggerMenuHelp()` — emits `menu:help` event
- `TriggerMenuImport()` — emits `menu:import` event
- `TriggerMenuExport()` — emits `menu:export` event
- `SaveWindowState(width, height, x, y) → error`

### internal/rpc — The gRPC Engine

Located in `internal/rpc/`, this package handles all gRPC connection and invocation logic.

#### `client.go` — Connection Management

```go
type Engine struct {
    conn            *grpc.ClientConn  // live connection
    descriptors     *desc.FileDescriptor
    mu              sync.RWMutex
}

type Config struct {
    Target       string    // "host:port"
    TLSMode      TLSMode   // "none" or "system"
}

type TLSMode string
// Values: TLSModeNone, TLSModeSystem
```

**Connection setup:**
- Call `Engine.Connect(config)` to establish a gRPC connection
- For plaintext: unencrypted h2c connection
- For TLS with system CA: standard verification against OS cert store
- Errors returned on connection failure; state persists until next Connect/Disconnect

#### `protoset.go` — Descriptor Loading

Three independent descriptor sources can be loaded and merged:

1. **Protoset files** (`.protoset` / `.pb`)
   - `LoadProtoset(path)` — loads a binary `FileDescriptorSet`
   - No import paths needed; self-contained

2. **Proto files** (`.proto`)
   - `LoadProtoFiles(paths)` — loads raw proto sources
   - Auto-detects import root from common ancestor directory
   - Example: if given `/project/api/foo.proto` and `/project/shared/bar.proto`, detects root as `/project/`

3. **Server reflection**
   - `LoadViaReflection(conn)` — queries live server via gRPC reflection
   - Fetches full service tree on demand
   - Services that can't be resolved shown with `Unresolvable` metadata

**Descriptor composability:**
- Loaded descriptors are merged into one in-memory `FileDescriptor`
- Multiple sources active simultaneously (e.g., local protoset + live reflection)
- Reloading updates in-place; frontend refreshes from `GetLoadedState()`

#### `schema.go` — Request Schema Generation

Converts protobuf message descriptors into a form-builder schema:

```go
type FieldSchema struct {
    Name         string
    Type         string    // "string", "int64", "message", "enum", "bytes", etc.
    Nested       []FieldSchema  // for messages
    Repeated     bool
    Map          *MapSchema
    Enum         []EnumValue
    Oneof        *OneofSchema
    DefaultValue interface{}
}
```

**Key behaviors:**
- Scalars → text/number inputs
- Messages → nested objects (recursively)
- Repeated fields → arrays with add/remove
- Maps → key/value pair rows
- Enums → dropdown from defined values
- Bytes → base64 input
- Oneof → selector for active variant

#### `invoker.go` — RPC Invocation

**Unary RPCs:**
- Serialize request JSON → protobuf using `jsonpb.Unmarshaler`
- Call `grpcurl` or native gRPC client with metadata headers
- Return formatted JSON response + status code

**Streaming RPCs:**
- Types: `SERVER_STREAM`, `CLIENT_STREAM`, `BIDI_STREAM`
- Initialize stream, emit events (timestamp, chunk, status) back to frontend via Wails events
- Frontend buffers events in response panel as they arrive
- Cancel via context or tab close

**Metadata application order:**
1. Default metadata (global headers from settings)
2. Environment metadata (from active environment)
3. Per-request metadata (from current tab)
Later overrides earlier.

### internal/storage — Persistence

Data stored as JSON files in OS config directory. Separate stores for each concern:

#### `collections.go`
```go
type Collection struct {
    ID          string
    Name        string
    Requests    []SavedRequest
}

type SavedRequest struct {
    ID         string
    Name       string
    Method     string
    Headers    map[string]string
    RequestJSON string
    // + descriptor sources (for portable export)
}
```

#### `environments.go`
```go
type Environment struct {
    ID       string
    Name     string
    Target   string  // "host:port"
    TLSMode  string
    Metadata map[string]string
}
```

#### `history.go`
```go
type HistoryEntry struct {
    ID        string
    Timestamp time.Time
    Method    string
    Request   string
    Response  string
    Status    int32
    Latency   time.Duration
}
```

#### `settings.go`
```go
type Settings struct {
    Theme                   string
    FontSize                int
    EmitDefaults            bool
    FieldMaskIncludeDefaults bool
    AllowShellCommands      bool
    InheritShellEnv         bool
    ConfirmDeletes          bool
    TimestampFormat         string
    DefaultMetadata         map[string]string
    // + window position, UI preferences
}
```

---

## Frontend Architecture

### Zustand Store (appStore.ts)

The single source of truth for all client state. Components read from and dispatch actions through the store.

```typescript
type AppState = {
  // Connection state
  host: string
  tlsMode: 'plaintext' | 'system' | 'custom'
  clientCert: string
  clientKey: string
  connectionStatus: 'connected' | 'idle' | 'error'

  // Loaded descriptors
  loadedServices: Service[]
  activeEnvironment: Environment | null

  // Tab management
  tabs: Tab[]
  activeTabId: string

  // Sidebar state
  sidebarTab: 'services' | 'saved'

  // Streaming state
  streamingTabId: string | null
  streamEvents: StreamEvent[]

  // Settings
  settings: Settings
  theme: Theme

  // Actions
  connect: (config) => Promise<void>
  loadProtoset: (path) => Promise<void>
  invokeUnary: (tabId, method, request) => Promise<Response>
  saveRequest: (collection, request) => Promise<void>
  setActiveTab: (tabId) => void
  // ... many more
}
```

**Key patterns:**
- State is loaded on app startup via `GetLoadedState()` call to backend
- Actions are async and often dispatch intermediate state (loading, error, success)
- Wails events (e.g., `stream:event`) trigger state updates
- Components subscribe via `useAppStore()` hook

### Component Structure

#### Root Component (App.tsx)
- Sets up Wails event listeners (connection, menus, streaming)
- Subscribes to store for global state
- Renders layout: ConnectionBar, TabBar, Sidebar, RequestPanel, ResponsePanel

#### ConnectionBar
- Host:port input, TLS mode selector (none or system)
- Active environment badge
- Connect/Reconnect/Disconnect buttons

#### Sidebar
- Services tab: hierarchical service/method browser
- Saved tab: collections and saved requests
- Double-click method to open in new tab

#### TabBar
- Tabs for open methods
- Right-click context menu: rename, close
- New/Close/Next/Previous via keyboard shortcuts

#### RequestPanel
- Form builder for request message (FormBuilder.tsx)
- JSON editor (JsonEditor.tsx, based on CodeMirror)
- Metadata tab for per-request headers
- Send/Cancel button

#### ResponsePanel
- Unary: formatted JSON response + metadata
- Streaming: live event log with collapsible entries
- History tab: past requests and responses
- Status code, latency, connection metadata

#### FormBuilder (FormBuilder.tsx)
- Recursive component for nested messages
- Handles all field types (scalars, nested, repeated, maps, oneofs, enums)
- Syncs with JSON editor when switching views

#### Settings (Settings/SettingsPanel.tsx)
- Appearance: theme, font size, environment sort order
- Requests: emit defaults, field mask options
- Shell & Variables: enable shell commands, inherit environment
- Behavior: confirm deletes, timestamp format
- Global Headers: default metadata for all requests

### Types (types/index.ts)

TypeScript interfaces mirror Go structs exposed via Wails. Keep in sync:

```typescript
interface Tab {
  id: string
  methodPath: string
  method?: Method
  request: RequestState
  response: ResponseState
  streaming?: StreamingState
}

interface Method {
  name: string
  service: string
  input: MessageDescriptor
  output: MessageDescriptor
}

interface RequestState {
  headers: Record<string, string>
  body: any
  formExpanded: boolean
}
```

---

## Development Patterns

### Proto Loading Flow

When user loads descriptors:

1. Frontend calls `LoadProtosets([path1, path2, ...])` or similar
2. Backend acquires `a.mu` lock
3. Calls `engine.LoadProtoset()` which merges into in-memory descriptor set
4. Backend releases lock
5. Frontend calls `GetLoadedState()` to fetch updated services
6. Store updates and UI re-renders

**Key: descriptors persist until explicitly removed or connection changes.**

### Request Invocation Flow

Unary RPC:
1. User fills form, clicks Send
2. Frontend serializes form → JSON
3. Calls `InvokeUnary(tabId, methodPath, headers, timeout, requestJSON)`
4. Backend acquires `a.mu`, prepares gRPC metadata (default + env + per-request)
5. Calls `engine.InvokeUnary()` which serializes JSON → protobuf
6. Executes gRPC call
7. Returns response JSON, status, metadata
8. Frontend updates tab response state

Streaming RPC:
1. User invokes streaming method
2. Frontend calls `InvokeStreaming(tabId, ...)`
3. Backend starts goroutine that:
   - Accepts or sends messages
   - Emits `stream:event` Wails events for each chunk
   - Tracks active stream in store
4. Frontend subscribes to events and buffers them in response panel
5. User clicks Stop → calls `CancelStream(tabId)`
6. Backend context cancellation stops goroutine

### Metadata Header Precedence

When invoking:
1. Load default metadata from settings
2. Load environment metadata (if environment active)
3. Add per-request metadata (from form)
4. Headers are passed to gRPC as metadata context

Later values override earlier ones. This allows:
- Global defaults (e.g., user-agent header)
- Environment-specific headers (e.g., API key per environment)
- Request-specific overrides (e.g., custom header for this call)

### Saving & Exporting

**Saving to collection:**
1. User clicks bookmark icon
2. Enters request name, chooses collection
3. Frontend calls `SaveRequest(collectionId, {method, headers, body})`
4. Backend writes to collections store

**Exporting:**
1. Frontend calls `ExportCollection(collectionId)`
2. Backend bundles: collection JSON + embedded protoset file
3. Returns as single portable `.json` file
4. User can import on another machine

**Importing:**
1. User selects `.json` file
2. Frontend calls `ImportCollection(data)`
3. Backend extracts collection + embedded protoset
4. Loads protoset into descriptors automatically
5. Frontend refreshes from `GetLoadedState()`

### Shell Interpolation

When "Allow shell commands" and "Inherit shell environment" are enabled:

1. Metadata value like `Bearer $(get-token.sh)` is detected
2. Backend spawns subprocess, captures stdout
3. Substitutes `$(...)` with command output
4. Similarly for `${ENV_VAR}` if environment inherited

**Security note:** Only evaluate when explicitly enabled; requires user opt-in.

---

## Testing & Validation

### Go Tests

Run with:
```bash
go test ./...                                        # all tests
go test ./internal/rpc/... -run TestStreaming       # specific test
```

**Test organization:**
- `app_*.go` typically have corresponding `app_*_test.go`
- `internal/rpc/*_test.go` include integration tests with fake gRPC servers

**Key test fixtures:**
- `internal/rpc/tls_test.go` — self-signed cert generation for TLS tests
- `testproto/` — sample `.proto` files for proto loading tests

### Frontend Build & Type Check

```bash
cd frontend && npm run build   # TypeScript type-check + Vite build
```

Ensure:
- TypeScript types match Go structs
- No type errors in components
- Build succeeds

### Manual Testing Flow

1. `make dev` — starts Wails dev server with hot reload
2. Edit a component
3. Save → browser auto-refreshes
4. Test UI behavior

### MCP Server Testing

MCP server is standalone Go binary:

```bash
make mcp                       # build mcp-server binary
grpc-nimbus-mcp               # run it (stdio mode)
```

Test by calling tools programmatically or via AI assistant integration.

---

## Key Conventions & Gotchas

### Mutex Usage

```go
// Wrong: can cause deadlock or race conditions
func (a *App) Bad() {
  a.mu.Lock()
  defer a.mu.Unlock()
  a.rpc.Connect(...)  // now calling other methods that lock a.mu again
}

// Right: only lock during critical sections
func (a *App) Good() {
  a.mu.Lock()
  conn := a.rpc.conn  // read
  a.mu.Unlock()
  conn.Close()        // no lock needed
}
```

- `a.mu` guards: connection, descriptors
- `a.settingsMu` guards: settings writes
- Never call user code (callbacks, etc.) while holding a lock

### Settings Writes Should Not Block UI

```go
// Wrong: blocks UI while saving
func (a *App) SaveSetting(key, value string) error {
  a.settingsMu.Lock()
  a.settings[key] = value
  a.settings.Save()  // slow I/O
  a.settingsMu.Unlock()
  return nil
}

// Right: async write
func (a *App) SaveSetting(key, value string) error {
  a.settingsMu.Lock()
  a.settings[key] = value
  a.settingsMu.Unlock()
  go a.saveSettings(a.settings)  // background
  return nil
}
```

### TypeScript / Go Struct Sync

When adding a field to a Go struct exposed via Wails (e.g., in `App` or `types.go`):
1. Add the field to the Go struct
2. Add corresponding TypeScript type in `frontend/src/types/index.ts`
3. Update any components that reference the struct
4. Test: `npm run build` in frontend/ to type-check

### Reflection vs Protoset Trade-offs

| Aspect | Reflection | Protoset |
|--------|-----------|----------|
| Setup | Server must enable it | Generate with `protoc --descriptor_set_out` |
| Offline | No | Yes |
| Import paths | N/A | Must be correct |
| Live schema | Yes | Static (snapshot) |
| Performance | Slower (network) | Faster (local file) |

### Unresolvable Services

When using reflection, the server might advertise a service that can't be fully resolved (e.g., custom import, nested proto). These are shown in the UI with `Unresolvable` metadata instead of being silently dropped. Attempting to invoke them returns an error.

### Tab State Isolation

Each tab has independent:
- Request state (headers, body, form expansion)
- Response state (last response, latency, status)
- Streaming connection (only one per tab)

Closing a tab with active stream cancels it automatically.

### Proto Import Root Detection

When loading raw `.proto` files, the system auto-detects the import root:

```
Files given: /a/b/foo.proto, /a/c/bar.proto
Common ancestor: /a/
Import statements in foo.proto like "import c/bar.proto" resolve relative to /a/
```

Misconfiguration here causes descriptor load failure. If path detection fails, try selecting a different set of files or using a protoset instead.

### Response JSON Serialization

Default proto3 behavior: zero values omitted from JSON. To include them:
- Enable "Show default field values" in Settings
- Or set `EmitDefaults: true` in code

Field Masks are special: they define which fields to return. When enabled, the form builder shows a Field Mask selector.

---

## Common Tasks

### Adding a New Setting

1. Add field to `storage.Settings` struct
2. Add UI toggle/input in `frontend/src/components/Settings/SettingsPanel.tsx`
3. Add TypeScript type to `frontend/src/types/index.ts`
4. Handle the setting in relevant backend methods
5. Test: settings persist across restarts

### Adding a New Help Topic

1. Add entry to `helpTopics` array in `frontend/src/components/HelpDialog/helpTopics.ts`
2. Include `id`, `title`, `keywords`, and `content` blocks
3. Test search in help dialog
4. `npm run build` to type-check

### Adding a Backend API Method

1. Add method to `App` struct in appropriate `app_*.go` file
2. Method signature must be exportable (uppercase name)
3. Return type must be JSON-serializable
4. Method called from frontend via `window.go.main.App.MethodName()`
5. Add TypeScript binding in `frontend/src/store/appStore.ts`
6. Test: `go test ./...` and `make dev`

### Debugging Streaming Issues

1. Open debug console: View → Debug Console
2. Check browser console for events logged
3. Go side: add logging in `internal/rpc/invoker.go` around `grpcurl` invocation
4. Check Wails event emission: `runtime.EventsEmit(a.ctx, "stream:event", ...)`

### Modifying Help Topics

Edit `frontend/src/components/HelpDialog/helpTopics.ts`:
- Update content blocks (paragraph, heading, bullets, code, note)
- Add/remove keywords for search
- Changes appear immediately in dev mode
- Build and test: `cd frontend && npm run build`

---

## Resources & Links

- **Wails Documentation**: https://wails.io
- **gRPC Go**: https://pkg.go.dev/google.golang.org/grpc
- **Protocol Buffers**: https://developers.google.com/protocol-buffers
- **grpcurl**: https://github.com/fullstorydev/grpcurl
- **Zustand**: https://zustand-demo.vercel.app/
- **React**: https://react.dev
- **Model Context Protocol**: https://modelcontextprotocol.io

---

## Version Info

- **Go**: 1.21+
- **Node.js**: 24.x
- **Wails CLI**: v2.12.0
- **React**: Latest
- **TypeScript**: Latest (via Vite)

