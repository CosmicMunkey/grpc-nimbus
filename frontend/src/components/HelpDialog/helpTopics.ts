export type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'note'; text: string };

export interface HelpTopic {
  id: string;
  title: string;
  keywords: string[];
  content: ContentBlock[];
}

export const helpTopics: HelpTopic[] = [
  {
    id: 'overview',
    title: 'Overview',
    keywords: ['overview', 'intro', 'introduction', 'welcome', 'about', 'start', 'getting started'],
    content: [
      { type: 'paragraph', text: 'GRPC Nimbus is a desktop gRPC client built for teams that work with compiled protoset files, raw .proto sources, or live server reflection. It runs entirely offline — no accounts, no cloud.' },
      { type: 'heading', text: 'Getting Started' },
      { type: 'bullets', items: [
        'Connect — enter a host:port in the connection bar and click Connect.',
        'Load descriptors — use the sidebar to load a .protoset file, .proto sources, or pull the schema via server reflection.',
        'Pick a method — browse services and methods in the sidebar, click one to open it in a tab.',
        'Build your request — fill in the form or switch to the JSON editor, then click Send.',
        'Save requests — bookmark anything to a Collection; export as a portable bundle to share with teammates.',
      ]},
      { type: 'heading', text: 'Key Concepts' },
      { type: 'bullets', items: [
        'Tabs — each open method gets its own independent tab with its own request and response state.',
        'Environments — store a target URL, TLS mode, and auth headers per environment (dev, staging, prod).',
        'Collections — saved requests grouped by name; portable across machines when exported.',
        'History — every request is automatically logged for review.',
      ]},
      { type: 'note', text: 'Press Cmd/Ctrl+Shift+/ to open this dialog from anywhere in the app.' },
    ],
  },
  {
    id: 'proto-loading',
    title: 'Loading Proto Descriptors',
    keywords: ['proto', 'protoset', 'reflection', 'descriptor', 'load', 'import', 'pb', 'bin'],
    content: [
      { type: 'paragraph', text: 'Before you can browse services or invoke methods, you need to load a service schema. GRPC Nimbus supports three descriptor sources that can be combined freely.' },
      { type: 'heading', text: 'Protoset Files (.protoset / .pb)' },
      { type: 'paragraph', text: 'A compiled FileDescriptorSet bundle — the easiest option. No import paths needed; the entire schema is self-contained in one file. Most CI pipelines can emit one with protoc --descriptor_set_out.' },
      { type: 'heading', text: 'Proto Source Files (.proto)' },
      { type: 'paragraph', text: 'Load raw .proto files directly. Import paths are detected automatically from common ancestor directories — you usually just select all the .proto files you need and let the app figure out the root.' },
      { type: 'heading', text: 'Server Reflection' },
      { type: 'paragraph', text: 'Connects to a live gRPC server and downloads the full service tree on demand. The server must have the reflection service enabled. Use the cancel button if it takes too long.' },
      { type: 'note', text: 'Multiple sources can be active at the same time. Loaded files are remembered and restored automatically on next launch.' },
    ],
  },
  {
    id: 'form-builder',
    title: 'Request Form Builder',
    keywords: ['form', 'json', 'request', 'field', 'nested', 'repeated', 'map', 'oneof', 'enum', 'bytes'],
    content: [
      { type: 'paragraph', text: 'Selecting a method auto-populates a type-aware form based on the message schema. You can work in Form view or JSON view — switch freely and both stay in sync.' },
      { type: 'heading', text: 'Supported Field Types' },
      { type: 'bullets', items: [
        'Scalars — strings, numbers, booleans with appropriate inputs.',
        'Nested messages — expand inline; as deeply nested as the schema requires.',
        'Repeated fields — Add / Remove buttons to manage variable-length lists.',
        'Map fields — key/value pair rows with Add / Remove.',
        'Oneof groups — a selector chooses the active field; only one variant is sent.',
        'Enums — rendered as dropdowns showing all defined values.',
        'Bytes — accepts base64-encoded input.',
      ]},
      { type: 'heading', text: 'JSON View' },
      { type: 'paragraph', text: 'Switch to JSON to hand-edit the full request body. The editor validates against the schema and syncs back to the form when you switch views. Useful for pasting in test payloads.' },
      { type: 'note', text: 'Leaving a field blank omits it from the request, which is standard proto3 zero-value behavior.' },
    ],
  },
  {
    id: 'invoke',
    title: 'Invoking an RPC',
    keywords: ['invoke', 'send', 'request', 'unary', 'stream', 'rpc', 'call', 'run'],
    content: [
      { type: 'paragraph', text: 'Click Send (or press Enter when focused in the JSON editor) to invoke a RPC. The response panel shows the result, status code, latency, and any response metadata.' },
      { type: 'heading', text: 'Unary RPCs' },
      { type: 'paragraph', text: 'A single request produces a single response. The response body is shown as formatted JSON. Status 0 (OK) is shown in green; any error code in red with a message.' },
      { type: 'heading', text: 'Streaming RPCs' },
      { type: 'paragraph', text: 'For server-streaming, client-streaming, and bidirectional methods, the response panel switches to a live event log. Each event is timestamped as it arrives. Use the Stop button to cancel.' },
      { type: 'heading', text: 'Request Metadata' },
      { type: 'paragraph', text: 'Add per-request gRPC metadata (headers) in the Metadata tab below the form. Environment-level headers are always prepended; per-request headers are appended and can override them.' },
    ],
  },
  {
    id: 'streaming',
    title: 'Streaming RPCs',
    keywords: ['stream', 'streaming', 'server', 'client', 'bidi', 'bidirectional', 'event', 'cancel', 'stop'],
    content: [
      { type: 'paragraph', text: 'GRPC Nimbus supports all four gRPC interaction patterns.' },
      { type: 'heading', text: 'RPC Types' },
      { type: 'bullets', items: [
        'Unary — single request, single response.',
        'Server-streaming — single request, stream of responses.',
        'Client-streaming — stream of requests, single response.',
        'Bidirectional — concurrent streams of requests and responses.',
      ]},
      { type: 'heading', text: 'Live Event Log' },
      { type: 'paragraph', text: 'When a streaming RPC is active the response panel shows events as they arrive, each with a timestamp and collapsible JSON body. The log accumulates until the stream closes or you stop it.' },
      { type: 'note', text: 'Only one stream can be active per tab at a time. Closing a tab with an active stream cancels it automatically.' },
    ],
  },
  {
    id: 'collections',
    title: 'Collections & Saved Requests',
    keywords: ['collection', 'save', 'saved', 'request', 'export', 'import', 'portable', 'share'],
    content: [
      { type: 'paragraph', text: "Collections let you save and organize requests for reuse. They're especially useful for regression testing and sharing with teammates." },
      { type: 'heading', text: 'Saving a Request' },
      { type: 'paragraph', text: "Click the bookmark icon or press Cmd/Ctrl+S to save the current tab's request. Give it a name and choose or create a collection." },
      { type: 'heading', text: 'Opening a Saved Request' },
      { type: 'paragraph', text: 'Click any saved request in the Collections sidebar tab. The app reloads the associated descriptor sources automatically before restoring the method and payload.' },
      { type: 'heading', text: 'Portable Export / Import' },
      { type: 'paragraph', text: "Exporting a collection (Cmd/Ctrl+E) embeds the protoset directly into the .json bundle so it's fully self-contained — no separate proto files needed." },
      { type: 'note', text: 'Share the exported .json with a teammate and they can import it (Cmd/Ctrl+I) and run requests immediately, even without access to your servers.' },
    ],
  },
  {
    id: 'history',
    title: 'Request History',
    keywords: ['history', 'recent', 'past', 'log', 'expand'],
    content: [
      { type: 'paragraph', text: 'Every request you send is automatically logged. History is stored locally and persists across restarts.' },
      { type: 'heading', text: 'Viewing History' },
      { type: 'paragraph', text: 'Open the History tab in the sidebar. Entries are sorted newest-first. Click any entry to expand it and see the full request payload, response body, status code, latency, and metadata.' },
    ],
  },
  {
    id: 'environments',
    title: 'Environments',
    keywords: ['environment', 'env', 'header', 'metadata', 'auth', 'token', 'api-key', 'target', 'url', 'tls'],
    content: [
      { type: 'paragraph', text: 'Environments let you switch between server configurations (dev, staging, prod) with a single click. Each stores a target URL, TLS mode, and default gRPC metadata headers.' },
      { type: 'heading', text: 'Creating an Environment' },
      { type: 'paragraph', text: 'Click the environment selector in the connection bar and choose New Environment. Set the name, host:port, TLS mode, and any headers to apply to every request.' },
      { type: 'heading', text: 'Headers & Auth' },
      { type: 'paragraph', text: 'Add an Authorization header with a Bearer token or API key. Environment headers are prepended to every request automatically. Per-request metadata is appended afterward and can override them.' },
      { type: 'note', text: 'Switching environments instantly reconnects using the new settings — no need to manually update the connection bar.' },
    ],
  },
  {
    id: 'connection',
    title: 'Connection & TLS',
    keywords: ['connect', 'disconnect', 'tls', 'ssl', 'plaintext', 'secure', 'certificate', 'host', 'port', 'reconnect'],
    content: [
      { type: 'paragraph', text: 'Enter a host:port in the connection bar at the top of the window and choose a TLS mode before connecting.' },
      { type: 'heading', text: 'TLS Modes' },
      { type: 'bullets', items: [
        'Plaintext — no encryption. For local development or internal networks.',
        'TLS (system CA) — encrypts and verifies the server certificate against your OS trust store.',
      ]},
      { type: 'heading', text: 'Connection Status' },
      { type: 'paragraph', text: 'The status dot next to the host reflects real gRPC connectivity: green = connected, yellow = idle, red = error with details in a tooltip.' },
      { type: 'note', text: 'Changing the host or TLS mode while connected shows a Reconnect button — click it to apply new settings in one step.' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Themes',
    keywords: ['settings', 'theme', 'color', 'dark', 'light', 'nimbus', 'font', 'size', 'zoom', 'confirm', 'delete'],
    content: [
      { type: 'paragraph', text: 'Open Settings with the gear icon in the bottom-left corner. All changes take effect immediately and persist across restarts.' },
      { type: 'heading', text: 'Appearance' },
      { type: 'bullets', items: [
        'Theme — Dark, Light, or Nimbus (a softer blue-gray light theme).',
        'Font size — adjust editor and UI font size. Also controllable with Cmd/Ctrl+Plus / Minus / 0.',
      ]},
      { type: 'heading', text: 'Behavior' },
      { type: 'bullets', items: [
        'Confirm deletes — toggle whether removing saved requests shows a confirmation dialog.',
        'Timestamp format — show request timestamps in local time or UTC.',
      ]},
    ],
  },
  {
    id: 'tabs',
    title: 'Tabs',
    keywords: ['tab', 'tabs', 'new tab', 'close tab', 'rename', 'switch', 'ctrl+t', 'cmd+t'],
    content: [
      { type: 'paragraph', text: 'Each open method lives in its own tab with independent request state, response, and streaming connection. Work on several methods side-by-side without them interfering.' },
      { type: 'heading', text: 'Tab Controls' },
      { type: 'bullets', items: [
        'Cmd/Ctrl+T — open a new tab.',
        'Cmd/Ctrl+W — close the current tab.',
        'Ctrl+Alt+Tab — switch to next tab.',
        'Ctrl+Shift+Tab — switch to previous tab.',
        'Double-click a tab label — rename it.',
      ]},
      { type: 'note', text: 'Closing a tab that has an active streaming RPC automatically cancels the stream.' },
    ],
  },
  {
    id: 'keyboard',
    title: 'Keyboard Shortcuts',
    keywords: ['keyboard', 'shortcut', 'hotkey', 'keybinding', 'cmd', 'ctrl'],
    content: [
      { type: 'heading', text: 'Tabs' },
      { type: 'bullets', items: [
        'Cmd/Ctrl+T — new tab',
        'Cmd/Ctrl+W — close tab',
        'Ctrl+Alt+Tab — next tab',
        'Ctrl+Shift+Tab — previous tab',
      ]},
      { type: 'heading', text: 'Collections' },
      { type: 'bullets', items: [
        'Cmd/Ctrl+I — import collection',
        'Cmd/Ctrl+E — export collection',
      ]},
      { type: 'heading', text: 'View' },
      { type: 'bullets', items: [
        'Cmd/Ctrl+Plus — zoom in',
        'Cmd/Ctrl+Minus — zoom out',
        'Cmd/Ctrl+0 — reset zoom',
      ]},
      { type: 'heading', text: 'Help' },
      { type: 'bullets', items: [
        'Cmd/Ctrl+Shift+/ — open this documentation',
      ]},
    ],
  },
  {
    id: 'mcp',
    title: 'MCP Server (AI Integration)',
    keywords: ['mcp', 'ai', 'llm', 'claude', 'cursor', 'automation', 'regression', 'test', 'grpc-nimbus-mcp'],
    content: [
      { type: 'paragraph', text: 'GRPC Nimbus ships a standalone MCP (Model Context Protocol) server that lets AI assistants like Claude, Cursor, or any MCP-compatible tool drive gRPC requests programmatically.' },
      { type: 'heading', text: 'Building the MCP Server' },
      { type: 'code', text: 'make mcp' },
      { type: 'paragraph', text: 'This produces a binary at bin/grpc-nimbus-mcp. Register it as a stdio MCP server in your AI tool\'s config.' },
      { type: 'heading', text: 'What the AI Can Do' },
      { type: 'bullets', items: [
        'Load protosets and connect to gRPC servers.',
        'List available services and methods.',
        'Invoke RPCs and read structured responses.',
        'Switch between saved environments.',
        'Run saved collection requests as a regression test suite.',
        'Save new requests to collections.',
      ]},
      { type: 'note', text: 'Enables end-to-end AI-orchestrated testing of multiple services using your existing saved config — no scripting required.' },
    ],
  },
];
