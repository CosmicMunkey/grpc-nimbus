import { create } from 'zustand';
import {
  Collection,
  ConnectionConfig,
  Environment,
  FieldSchema,
  HistoryEntry,
  InvokeRequest,
  InvokeResponse,
  LoadedState,
  MetadataEntry,
  MethodInfo,
  ServiceInfo,
  StreamEvent,
  Tab,
} from '../types';

// Wails injects window.go at runtime. Stubs keep TypeScript happy in development.
declare global {
  interface Window {
    go: {
      main: {
        App: {
          Connect(cfg: ConnectionConfig): Promise<void>;
          Disconnect(): Promise<void>;
          LoadProtosets(paths: string[]): Promise<ServiceInfo[]>;
          LoadProtoFiles(importPaths: string[], protoFiles: string[]): Promise<ServiceInfo[]>;
          LoadViaReflection(): Promise<ServiceInfo[]>;
          GetServices(): Promise<ServiceInfo[]>;
          InvokeUnary(req: InvokeRequest): Promise<InvokeResponse>;
          InvokeStream(req: InvokeRequest): Promise<void>;
          CancelStream(): Promise<void>;
          ListCollections(): Promise<Collection[]>;
          SaveCollection(col: Collection): Promise<void>;
          DeleteCollection(id: string): Promise<void>;
          GetCollection(id: string): Promise<Collection>;
          ExportCollection(id: string, destPath: string): Promise<void>;
          ImportCollection(srcPath: string): Promise<Collection>;
          PickProtosetFiles(): Promise<string[]>;
          PickProtoFiles(): Promise<string[]>;
          PickImportFile(): Promise<string>;
          PickExportPath(defaultName: string): Promise<string>;
          ListEnvironments(): Promise<Environment[]>;
          SaveEnvironment(env: Environment): Promise<void>;
          DeleteEnvironment(id: string): Promise<void>;
          SetActiveEnvironment(id: string): Promise<void>;
          GetHistory(methodPath: string): Promise<HistoryEntry[]>;
          ClearHistory(methodPath: string): Promise<void>;
          GetRequestSchema(methodPath: string): Promise<FieldSchema[]>;
          ClearLoadedProtos(): Promise<void>;
          ReloadProtos(): Promise<ServiceInfo[]>;
          RemoveProtoPath(path: string): Promise<ServiceInfo[]>;
          GetLoadedState(): Promise<LoadedState>;
          GetConnectionState(): Promise<string>;
        };
      };
    };
  }
}

export const api = {
  connect: (cfg: ConnectionConfig) => window.go.main.App.Connect(cfg),
  disconnect: () => window.go.main.App.Disconnect(),
  loadProtosets: (paths: string[]) => window.go.main.App.LoadProtosets(paths),
  loadProtoFiles: (importPaths: string[], protoFiles: string[]) =>
    window.go.main.App.LoadProtoFiles(importPaths, protoFiles),
  loadViaReflection: () => window.go.main.App.LoadViaReflection(),
  getServices: () => window.go.main.App.GetServices(),
  invokeUnary: (req: InvokeRequest) => window.go.main.App.InvokeUnary(req),
  invokeStream: (req: InvokeRequest) => window.go.main.App.InvokeStream(req),
  cancelStream: () => window.go.main.App.CancelStream(),
  listCollections: () => window.go.main.App.ListCollections(),
  saveCollection: (col: Collection) => window.go.main.App.SaveCollection(col),
  deleteCollection: (id: string) => window.go.main.App.DeleteCollection(id),
  getCollection: (id: string) => window.go.main.App.GetCollection(id),
  exportCollection: (id: string, destPath: string) =>
    window.go.main.App.ExportCollection(id, destPath),
  importCollection: (srcPath: string) => window.go.main.App.ImportCollection(srcPath),
  pickProtosetFiles: () => window.go.main.App.PickProtosetFiles(),
  pickProtoFiles: () => window.go.main.App.PickProtoFiles(),
  pickImportFile: () => window.go.main.App.PickImportFile(),
  pickExportPath: (name: string) => window.go.main.App.PickExportPath(name),
  listEnvironments: () => window.go.main.App.ListEnvironments(),
  saveEnvironment: (env: Environment) => window.go.main.App.SaveEnvironment(env),
  deleteEnvironment: (id: string) => window.go.main.App.DeleteEnvironment(id),
  setActiveEnvironment: (id: string) => window.go.main.App.SetActiveEnvironment(id),
  getHistory: (methodPath: string) => window.go.main.App.GetHistory(methodPath),
  clearHistory: (methodPath: string) => window.go.main.App.ClearHistory(methodPath),
  getRequestSchema: (methodPath: string) => window.go.main.App.GetRequestSchema(methodPath),
  clearLoadedProtos: () => window.go.main.App.ClearLoadedProtos(),
  reloadProtos: () => window.go.main.App.ReloadProtos(),
  removeProtoPath: (path: string) => window.go.main.App.RemoveProtoPath(path),
  getLoadedState: () => window.go.main.App.GetLoadedState(),
  getConnectionState: (): Promise<string> => window.go.main.App.GetConnectionState(),
};

// ─── Tab helpers ──────────────────────────────────────────────────────────────

let _tabSeq = 0;

// Module-level handle so polling survives re-renders
let _connPollInterval: ReturnType<typeof setInterval> | null = null;

function startConnPoll() {
  if (_connPollInterval) return;
  _connPollInterval = setInterval(async () => {
    try {
      const raw = await api.getConnectionState();
      const status = raw as AppState['connectionStatus'];
      useAppStore.setState({ connectionStatus: status });
    } catch {
      // backend unavailable — leave status unchanged
    }
  }, 2000);
}

function stopConnPoll() {
  if (_connPollInterval) {
    clearInterval(_connPollInterval);
    _connPollInterval = null;
  }
}
function newTabId() { return `tab-${Date.now()}-${++_tabSeq}`; }

export function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: newTabId(),
    label: 'New Request',
    savedRequestId: null,
    savedRequestName: null,
    selectedMethod: null,
    requestJson: '{}',
    requestMetadata: [],
    requestSchema: [],
    response: null,
    streamMessages: [],
    isInvoking: false,
    isStreaming: false,
    invokeError: null,
    history: [],
    timeoutSeconds: 0,
    ...overrides,
  };
}

function patchTab(tabs: Tab[], id: string, patch: Partial<Tab>): Tab[] {
  return tabs.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

const INITIAL_TAB = makeTab();

// ─── App State ────────────────────────────────────────────────────────────────

interface AppState {
  // Connection
  connectionConfig: ConnectionConfig;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'idle' | 'connecting' | 'ready' | 'transient_failure';
  connectionError: string | null;
  setConnectionConfig: (cfg: Partial<ConnectionConfig>) => void;
  connect: () => Promise<void>;
  disconnect: () => void;

  // Startup state restoration
  restoreLoadedState: () => Promise<void>;

  // Descriptor sources
  services: ServiceInfo[];
  protosetPaths: string[];
  loadMode: string;
  loadProtosets: (paths: string[]) => Promise<void>;
  loadProtoFiles: (importPaths: string[], protoFiles: string[]) => Promise<void>;
  loadViaReflection: () => Promise<void>;
  clearLoadedProtos: () => Promise<void>;
  reloadProtos: () => Promise<void>;
  removeProtoPath: (path: string) => Promise<void>;

  // Tabs
  tabs: Tab[];
  activeTabId: string;
  streamingTabId: string | null;
  newTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  duplicateTab: (id: string) => void;
  openMethodInNewTab: (method: MethodInfo, requestJson?: string, metadata?: MetadataEntry[], savedRequestId?: string, savedRequestName?: string) => void;

  // Per-tab actions (operate on the active tab)
  selectMethod: (method: MethodInfo | null) => void;
  setRequestJson: (json: string) => void;
  setRequestMetadata: (md: MetadataEntry[]) => void;
  setTimeoutSeconds: (t: number) => void;
  loadRequestSchema: (methodPath: string) => Promise<void>;
  invoke: () => Promise<void>;
  appendStreamEvent: (evt: StreamEvent) => void;
  clearStream: () => void;
  cancelStream: () => void;
  loadHistory: (methodPath: string) => Promise<void>;
  clearHistory: (methodPath: string) => Promise<void>;
  restoreFromHistory: (entry: HistoryEntry) => void;

  // Collections
  collections: Collection[];
  loadCollections: () => Promise<void>;
  saveToCollection: (collectionId: string, name: string) => Promise<void>;
  updateSavedRequest: () => Promise<void>;
  renameRequest: (tabId: string, newName: string) => Promise<void>;
  renameCollectionRequest: (collectionId: string, requestId: string, newName: string) => Promise<void>;
  deleteRequest: (collectionId: string, requestId: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  exportCollection: (id: string) => Promise<void>;
  importCollection: () => Promise<void>;

  // Environments
  environments: Environment[];
  activeEnvironmentId: string;
  loadEnvironments: () => Promise<void>;
  saveEnvironment: (env: Environment) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  setActiveEnvironment: (id: string) => Promise<void>;
}

// Convenience hook: returns the currently active tab's state.
// Components should use this instead of reading the flat store fields directly.
export const useActiveTab = (): Tab =>
  useAppStore((s) => s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0]);

export const useAppStore = create<AppState>((set, get) => ({
  // ── Connection ──────────────────────────────────────────────────────────────
  connectionConfig: { target: 'localhost:50051', tls: 'none' },
  isConnected: false,
  connectionStatus: 'disconnected',
  connectionError: null,

  setConnectionConfig: (cfg) =>
    set((s) => ({ connectionConfig: { ...s.connectionConfig, ...cfg } })),

  connect: async () => {
    const { connectionConfig } = get();
    try {
      await api.connect(connectionConfig);
      set({ isConnected: true, connectionStatus: 'connecting', connectionError: null });
      startConnPoll();
    } catch (e: unknown) {
      set({ isConnected: false, connectionStatus: 'disconnected', connectionError: e instanceof Error ? e.message : String(e) });
    }
  },

  disconnect: () => {
    stopConnPoll();
    api.disconnect().catch(() => {});
    set({ isConnected: false, connectionStatus: 'disconnected' });
  },

  // ── Startup restore ─────────────────────────────────────────────────────────
  restoreLoadedState: async () => {
    try {
      const state = await api.getLoadedState();
      if (!state) return;
      if (state.lastTarget) {
        set((s) => ({
          connectionConfig: {
            ...s.connectionConfig,
            target: state.lastTarget,
            tls: (state.lastTLS as ConnectionConfig['tls']) || 'none',
          },
        }));
      }
      if (state.services?.length) {
        set({ services: state.services, protosetPaths: state.loadedPaths ?? [], loadMode: state.loadMode ?? '' });
      }
    } catch { /* non-fatal */ }
  },

  // ── Descriptor sources ──────────────────────────────────────────────────────
  services: [],
  protosetPaths: [],
  loadMode: '',

  loadProtosets: async (paths) => {
    const services = await api.loadProtosets(paths);
    set({ services, protosetPaths: paths, loadMode: 'protoset' });
  },

  loadProtoFiles: async (importPaths, protoFiles) => {
    const services = await api.loadProtoFiles(importPaths, protoFiles);
    set({ services, protosetPaths: protoFiles, loadMode: 'proto' });
  },

  loadViaReflection: async () => {
    const services = await api.loadViaReflection();
    set({ services, protosetPaths: [], loadMode: 'reflection' });
  },

  clearLoadedProtos: async () => {
    await api.clearLoadedProtos();
    const blankTabPatch: Partial<Tab> = {
      selectedMethod: null, requestSchema: [], requestJson: '{}',
      response: null, streamMessages: [], isInvoking: false, isStreaming: false, invokeError: null,
    };
    set((s) => ({
      services: [], protosetPaths: [], loadMode: '',
      tabs: s.tabs.map((t) => ({ ...t, ...blankTabPatch })),
    }));
  },

  reloadProtos: async () => {
    const services = await api.reloadProtos();
    if (services?.length) set({ services });
  },

  removeProtoPath: async (path) => {
    const services = await api.removeProtoPath(path);
    const remaining = get().protosetPaths.filter((p) => p !== path);
    set({ services: services ?? [], protosetPaths: remaining });
    if (!(services ?? []).length) {
      const blankTabPatch: Partial<Tab> = {
        selectedMethod: null, requestSchema: [], requestJson: '{}',
        response: null, streamMessages: [], isInvoking: false, isStreaming: false, invokeError: null,
      };
      set((s) => ({ loadMode: '', tabs: s.tabs.map((t) => ({ ...t, ...blankTabPatch })) }));
    }
  },

  // ── Tabs ────────────────────────────────────────────────────────────────────
  tabs: [INITIAL_TAB],
  activeTabId: INITIAL_TAB.id,
  streamingTabId: null,

  newTab: () => {
    const tab = makeTab();
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  closeTab: (id) => {
    set((s) => {
      const remaining = s.tabs.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fresh = makeTab();
        return { tabs: [fresh], activeTabId: fresh.id };
      }
      const newActive = s.activeTabId === id
        ? (remaining[remaining.length - 1]?.id ?? remaining[0].id)
        : s.activeTabId;
      return { tabs: remaining, activeTabId: newActive };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  duplicateTab: (id) => {
    const src = get().tabs.find((t) => t.id === id);
    if (!src) return;
    const dup = makeTab({
      label: src.label,
      selectedMethod: src.selectedMethod,
      requestJson: src.requestJson,
      requestMetadata: [...src.requestMetadata],
      requestSchema: src.requestSchema,
      timeoutSeconds: src.timeoutSeconds,
    });
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      const tabs = [...s.tabs];
      tabs.splice(idx + 1, 0, dup);
      return { tabs, activeTabId: dup.id };
    });
  },

  openMethodInNewTab: (method, requestJson = '{}', metadata = [], savedRequestId, savedRequestName) => {
    const { tabs, activeTabId } = get();

    // If this saved request is already open in a tab, just focus it.
    if (savedRequestId) {
      const existing = tabs.find((t) => t.savedRequestId === savedRequestId);
      if (existing) {
        set({ activeTabId: existing.id });
        return;
      }
    }

    // Reuse a pristine blank tab rather than opening a redundant one.
    const active = tabs.find((t) => t.id === activeTabId);
    const label = savedRequestName ?? method.methodName;
    const patch: Partial<Tab> = {
      selectedMethod: method, label,
      savedRequestId: savedRequestId ?? null,
      savedRequestName: savedRequestName ?? null,
      requestJson, requestMetadata: metadata,
      response: null, streamMessages: [], history: [],
      requestSchema: [], isInvoking: false, isStreaming: false, invokeError: null,
    };
    if (active && !active.selectedMethod) {
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, patch) }));
      get().loadRequestSchema(method.fullName).catch(() => {});
      return;
    }
    const tab = makeTab(patch);
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    get().loadRequestSchema(method.fullName).catch(() => {});
  },

  // ── Per-tab actions ──────────────────────────────────────────────────────────
  selectMethod: (method) => {
    const { activeTabId } = get();
    set((s) => ({
      tabs: patchTab(s.tabs, activeTabId, {
        selectedMethod: method,
        label: method?.methodName ?? 'New Request',
        savedRequestId: null,
        savedRequestName: null,
        response: null, requestJson: '{}', streamMessages: [], history: [],
        requestSchema: [], isInvoking: false, isStreaming: false, invokeError: null,
      }),
    }));
    if (method) get().loadRequestSchema(method.fullName).catch(() => {});
  },

  setRequestJson: (json) => {
    const { activeTabId } = get();
    set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { requestJson: json }) }));
  },

  setRequestMetadata: (md) => {
    const { activeTabId } = get();
    set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { requestMetadata: md }) }));
  },

  setTimeoutSeconds: (t) => {
    const { activeTabId } = get();
    set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { timeoutSeconds: t }) }));
  },

  loadRequestSchema: async (methodPath) => {
    const { activeTabId } = get();
    try {
      const schema = await api.getRequestSchema(methodPath);
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { requestSchema: schema ?? [] }) }));
    } catch {
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { requestSchema: [] }) }));
    }
  },

  invoke: async () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab?.selectedMethod) return;
    const { selectedMethod, requestJson, requestMetadata, timeoutSeconds } = tab;

    set((s) => ({
      tabs: patchTab(s.tabs, activeTabId, {
        isInvoking: true, invokeError: null, response: null, streamMessages: [],
      }),
    }));

    try {
      if (selectedMethod.serverStreaming || selectedMethod.clientStreaming) {
        set((s) => ({
          tabs: patchTab(s.tabs, activeTabId, { isStreaming: true, isInvoking: false }),
          streamingTabId: activeTabId,
        }));
        await api.invokeStream({ methodPath: selectedMethod.fullName, requestJson, metadata: requestMetadata, timeoutSeconds });
      } else {
        const resp = await api.invokeUnary({ methodPath: selectedMethod.fullName, requestJson, metadata: requestMetadata, timeoutSeconds });
        set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { response: resp, isInvoking: false }) }));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      set((s) => ({
        tabs: patchTab(s.tabs, activeTabId, { invokeError: msg, isInvoking: false, isStreaming: false }),
        streamingTabId: null,
      }));
    }
  },

  appendStreamEvent: (evt) => {
    const { streamingTabId } = get();
    if (!streamingTabId) return;
    const isDone = evt.type === 'trailer' || evt.type === 'error';
    set((s) => {
      const streamTab = s.tabs.find((t) => t.id === streamingTabId);
      if (!streamTab) return {};
      const patch: Partial<Tab> = {
        streamMessages: [...streamTab.streamMessages, evt],
        isStreaming: !isDone,
      };
      if (evt.type === 'error') patch.invokeError = evt.error ?? null;
      return {
        tabs: patchTab(s.tabs, streamingTabId, patch),
        streamingTabId: isDone ? null : streamingTabId,
      };
    });
  },

  clearStream: () => {
    const { activeTabId } = get();
    set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { streamMessages: [], isStreaming: false }) }));
  },

  cancelStream: () => {
    api.cancelStream().catch(() => {});
    const id = get().streamingTabId ?? get().activeTabId;
    set((s) => ({
      tabs: patchTab(s.tabs, id, { isStreaming: false }),
      streamingTabId: null,
    }));
  },

  loadHistory: async (methodPath) => {
    const { activeTabId } = get();
    try {
      const entries = await api.getHistory(methodPath);
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { history: entries ?? [] }) }));
    } catch {
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { history: [] }) }));
    }
  },

  clearHistory: async (methodPath) => {
    const { activeTabId } = get();
    await api.clearHistory(methodPath);
    set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { history: [] }) }));
  },

  restoreFromHistory: (entry) => {
    const { activeTabId } = get();
    set((s) => ({
      tabs: patchTab(s.tabs, activeTabId, {
        requestJson: entry.requestJson,
        requestMetadata: entry.metadata ?? [],
      }),
    }));
  },

  // ── Collections ─────────────────────────────────────────────────────────────
  collections: [],

  loadCollections: async () => {
    try {
      const cols = await api.listCollections();
      set({ collections: cols ?? [] });
    } catch { set({ collections: [] }); }
  },

  saveToCollection: async (collectionId, name) => {
    const { tabs, activeTabId, connectionConfig, collections, protosetPaths } = get();
    const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
    const { selectedMethod, requestJson, requestMetadata } = tab;
    if (!selectedMethod) return;
    const now = new Date().toISOString();
    const newReqId = crypto.randomUUID();
    const req = {
      id: newReqId, name, collectionId,
      methodPath: selectedMethod.fullName, requestJson,
      metadata: requestMetadata, connection: connectionConfig,
      createdAt: now, updatedAt: now,
    };
    let col = collections.find((c) => c.id === collectionId);
    if (!col) {
      col = { id: collectionId, name: collectionId, description: '', protosetPaths, requests: [], createdAt: now, updatedAt: now };
    }
    await api.saveCollection({ ...col, requests: [...(col.requests ?? []), req], updatedAt: now });
    await get().loadCollections();
    // Link this tab to the newly saved request.
    set((s) => ({
      tabs: patchTab(s.tabs, activeTabId, { savedRequestId: newReqId, savedRequestName: name, label: name }),
    }));
  },

  updateSavedRequest: async () => {
    const { tabs, activeTabId, collections, connectionConfig } = get();
    const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
    const { savedRequestId, selectedMethod, requestJson, requestMetadata } = tab;
    if (!savedRequestId || !selectedMethod) return;
    const col = collections.find((c) => c.requests?.some((r) => r.id === savedRequestId));
    if (!col) return;
    const now = new Date().toISOString();
    const updatedRequests = col.requests.map((r) =>
      r.id === savedRequestId
        ? { ...r, requestJson, metadata: requestMetadata, connection: connectionConfig, updatedAt: now }
        : r
    );
    await api.saveCollection({ ...col, requests: updatedRequests, updatedAt: now });
    await get().loadCollections();
  },

  deleteRequest: async (collectionId, requestId) => {
    const { collections } = get();
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;
    const now = new Date().toISOString();
    const updatedRequests = col.requests.filter((r) => r.id !== requestId);
    await api.saveCollection({ ...col, requests: updatedRequests, updatedAt: now });
    await get().loadCollections();
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.savedRequestId === requestId ? { ...t, savedRequestId: null, savedRequestName: null } : t
      ),
    }));
  },

  renameRequest: async (tabId, newName) => {
    const name = newName.trim();
    if (!name) return;
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab) return;
    set((s) => ({ tabs: patchTab(s.tabs, tabId, { label: name, savedRequestName: name }) }));
    if (tab.savedRequestId) {
      await get().renameCollectionRequest('', tab.savedRequestId, name);
    }
  },

  renameCollectionRequest: async (collectionId, requestId, newName) => {
    const name = newName.trim();
    if (!name) return;
    const { collections } = get();
    // collectionId is optional — search all collections if not provided
    const col = collectionId
      ? collections.find((c) => c.id === collectionId)
      : collections.find((c) => c.requests?.some((r) => r.id === requestId));
    if (!col) return;
    const now = new Date().toISOString();
    const updatedRequests = col.requests.map((r) =>
      r.id === requestId ? { ...r, name, updatedAt: now } : r
    );
    await api.saveCollection({ ...col, requests: updatedRequests, updatedAt: now });
    await get().loadCollections();
    // Keep any linked open tabs in sync
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.savedRequestId === requestId ? { ...t, savedRequestName: name, label: name } : t
      ),
    }));
  },

  deleteCollection: async (id) => {
    await api.deleteCollection(id);
    await get().loadCollections();
  },

  exportCollection: async (id) => {
    const col = get().collections.find((c) => c.id === id);
    const defaultName = `${col?.name ?? id}.json`;
    const destPath = await api.pickExportPath(defaultName);
    if (destPath) await api.exportCollection(id, destPath);
  },

  importCollection: async () => {
    const srcPath = await api.pickImportFile();
    if (srcPath) {
      await api.importCollection(srcPath);
      await get().loadCollections();
    }
  },

  // ── Environments ────────────────────────────────────────────────────────────
  environments: [],
  activeEnvironmentId: '',

  loadEnvironments: async () => {
    try {
      const envs = await api.listEnvironments();
      set({ environments: envs ?? [] });
    } catch { set({ environments: [] }); }
  },

  saveEnvironment: async (env) => {
    await api.saveEnvironment(env);
    await get().loadEnvironments();
  },

  deleteEnvironment: async (id) => {
    await api.deleteEnvironment(id);
    if (get().activeEnvironmentId === id) await get().setActiveEnvironment('');
    await get().loadEnvironments();
  },

  setActiveEnvironment: async (id) => {
    await api.setActiveEnvironment(id);
    set({ activeEnvironmentId: id });
  },
}));
