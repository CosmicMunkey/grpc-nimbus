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
  SavedRequest,
  ServiceInfo,
  StreamEvent,
  Tab,
} from '../types';
import { ThemeId, ThemeTokens, applyTheme, applyFontSize, resolveTheme, isColorDark } from '../themes';

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
          CancelUnary(): Promise<void>;
          CancelStream(): Promise<void>;
          CancelReflection(): Promise<void>;
          ListCollections(): Promise<Collection[]>;
          SaveCollection(col: Collection): Promise<void>;
          DeleteCollection(id: string): Promise<void>;
          GetCollection(id: string): Promise<Collection>;
          ExportCollection(id: string, destPath: string): Promise<void>;
          ImportCollection(srcPath: string): Promise<Collection>;
          PickProtosetFiles(): Promise<string[]>;
          PickProtoFiles(): Promise<string[]>;
          PickDirectory(): Promise<string>;
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
          GetUserSettings(): Promise<{ confirmDeletes: boolean; timestampInputLocal: boolean; theme: string; customTheme?: Record<string, string>; fontSize?: number; sidebarWidth?: number; panelSplit?: number }>;
          SaveUserSettings(s: { confirmDeletes: boolean; timestampInputLocal: boolean; theme: string; customTheme?: Record<string, string>; fontSize: number; sidebarWidth: number; panelSplit: number }): Promise<void>;
          GetVersion(): Promise<string>;
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
  cancelUnary: () => window.go.main.App.CancelUnary(),
  cancelStream: () => window.go.main.App.CancelStream(),
  cancelReflection: () => window.go.main.App.CancelReflection(),
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
  getUserSettings: () => window.go.main.App.GetUserSettings(),
  saveUserSettings: (s: { confirmDeletes: boolean; timestampInputLocal: boolean; theme: string; customTheme?: Record<string, string>; fontSize: number; sidebarWidth: number; panelSplit: number }): Promise<void> => window.go.main.App.SaveUserSettings(s),
};

// Persist all user settings from the current store state.
function saveAllSettings(s: Pick<AppState, 'confirmDeletes' | 'timestampInputLocal' | 'theme' | 'customTheme' | 'fontSize' | 'sidebarWidth' | 'panelSplit'>) {
  api.saveUserSettings({
    confirmDeletes: s.confirmDeletes,
    timestampInputLocal: s.timestampInputLocal,
    theme: s.theme,
    customTheme: s.customTheme as Record<string, string>,
    fontSize: s.fontSize,
    sidebarWidth: s.sidebarWidth,
    panelSplit: s.panelSplit,
  }).catch(() => {});
}

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

function applyLoadedState(state?: LoadedState) {
  return {
    services: state?.services ?? [],
    protosetPaths: state?.loadedPaths ?? [],
    loadedProtosetPaths: state?.loadedProtosets ?? [],
    loadedProtoFilePaths: state?.loadedProtoFiles ?? [],
    protoImportPaths: state?.protoImportPaths ?? [],
    loadMode: state?.loadMode ?? '',
  };
}

function findMethodByPath(services: ServiceInfo[], methodPath: string): MethodInfo | null {
  for (const svc of services) {
    const method = svc.methods.find((m) => m.fullName === methodPath);
    if (method) return method;
  }
  return null;
}

function includesAll(current: string[], expected: string[] = []): boolean {
  const loaded = new Set(current);
  return expected.every((value) => loaded.has(value));
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
  loadedProtosetPaths: string[];
  loadedProtoFilePaths: string[];
  protoImportPaths: string[];
  loadMode: string;
  loadProtosets: (paths: string[]) => Promise<void>;
  loadProtoFiles: (importPaths: string[], protoFiles: string[]) => Promise<void>;
  loadViaReflection: () => Promise<void>;
  cancelReflection: () => void;
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
  cancelInvoke: () => void;
  appendStreamEvent: (evt: StreamEvent) => void;
  clearStream: () => void;
  cancelStream: () => void;
  loadHistory: (methodPath: string) => Promise<void>;
  clearHistory: (methodPath: string) => Promise<void>;

  // Collections
  collections: Collection[];
  loadCollections: () => Promise<void>;
  loadCollectionDescriptors: (collection: Collection) => Promise<void>;
  saveToCollection: (collectionId: string, name: string) => Promise<void>;
  openSavedRequest: (collection: Collection, request: SavedRequest) => Promise<void>;
  renameCollection: (collectionId: string, newName: string) => Promise<void>;
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

  // Settings
  confirmDeletes: boolean;
  setConfirmDeletes: (v: boolean) => void;
  timestampInputLocal: boolean;
  setTimestampInputLocal: (v: boolean) => void;
  theme: ThemeId;
  isDark: boolean;
  customTheme: Partial<ThemeTokens>;
  setTheme: (id: ThemeId, custom?: Partial<ThemeTokens>) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  loadUserSettings: () => Promise<void>;

  // Layout
  sidebarWidth: number;
  panelSplit: number;
  setSidebarWidth: (w: number) => void;
  setPanelSplit: (s: number) => void;

  // Confirm dialog (used by all delete operations)
  confirmDialog: { message: string; resolve: (yes: boolean) => void } | null;
  showConfirm: (message: string) => Promise<boolean>;
  resolveConfirm: (yes: boolean) => void;
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
      set(applyLoadedState(state));
      // Restore active environment (loads env list first, then activates)
      if (state.activeEnvironmentId) {
        try {
          await get().loadEnvironments();
          await get().setActiveEnvironment(state.activeEnvironmentId);
        } catch { /* non-fatal — env may have been deleted */ }
      }
    } catch { /* non-fatal */ }
    // If the backend is already connected, start polling
    try {
      const connState = await api.getConnectionState();
      if (connState !== 'disconnected') {
        set({ isConnected: true, connectionStatus: connState as AppState['connectionStatus'] });
        startConnPoll();
      }
    } catch { /* non-fatal */ }
    // Load user preferences in parallel (non-fatal)
    get().loadUserSettings().catch(() => {});
  },

  // ── Descriptor sources ──────────────────────────────────────────────────────
  services: [],
  protosetPaths: [],
  loadedProtosetPaths: [],
  loadedProtoFilePaths: [],
  protoImportPaths: [],
  loadMode: '',

  loadProtosets: async (paths) => {
    await api.loadProtosets(paths);
    const state = await api.getLoadedState();
    set(applyLoadedState(state));
  },

  loadProtoFiles: async (importPaths, protoFiles) => {
    await api.loadProtoFiles(importPaths, protoFiles);
    const state = await api.getLoadedState();
    set(applyLoadedState(state));
  },

  loadViaReflection: async () => {
    await api.loadViaReflection();
    const state = await api.getLoadedState();
    set(applyLoadedState(state));
  },

  cancelReflection: () => {
    api.cancelReflection().catch(() => {});
  },

  clearLoadedProtos: async () => {
    await api.clearLoadedProtos();
    // Close all tabs that had a method selected (they're all orphaned now)
    set((s) => {
      const orphanedIds = new Set(s.tabs.filter((t) => t.selectedMethod).map((t) => t.id));
      if (orphanedIds.size === 0) {
        return { services: [], protosetPaths: [], loadedProtosetPaths: [], loadedProtoFilePaths: [], protoImportPaths: [], loadMode: '' };
      }
      let remaining = s.tabs.filter((t) => !orphanedIds.has(t.id));
      if (remaining.length === 0) remaining = [makeTab()];
      const newActive = orphanedIds.has(s.activeTabId)
        ? remaining[remaining.length - 1].id
        : s.activeTabId;
      const newStreaming = s.streamingTabId && orphanedIds.has(s.streamingTabId) ? null : s.streamingTabId;
      return {
        services: [], protosetPaths: [], loadedProtosetPaths: [], loadedProtoFilePaths: [], protoImportPaths: [], loadMode: '',
        tabs: remaining, activeTabId: newActive, streamingTabId: newStreaming,
      };
    });
  },

  reloadProtos: async () => {
    const services = await api.reloadProtos();
    const state = await api.getLoadedState();
    set({ ...applyLoadedState(state), services: services ?? state?.services ?? [] });
  },

  removeProtoPath: async (path) => {
    const services = await api.removeProtoPath(path);
    const state = await api.getLoadedState();
    const newServices = services ?? state?.services ?? [];

    // Build set of valid methods after removal
    const validMethods = new Set<string>();
    for (const svc of newServices) {
      for (const m of svc.methods ?? []) {
        validMethods.add(m.fullName);
      }
    }

    // Apply loaded state and close orphaned tabs in one atomic update
    set((s) => {
      const base = { ...applyLoadedState(state), services: newServices };
      const invalidTabs = s.tabs.filter((t) => t.selectedMethod && !validMethods.has(t.selectedMethod.fullName));
      if (invalidTabs.length === 0) return base;
      const closedIds = new Set(invalidTabs.map((t) => t.id));
      let remaining = s.tabs.filter((t) => !closedIds.has(t.id));
      if (remaining.length === 0) remaining = [makeTab()];
      const newActive = closedIds.has(s.activeTabId)
        ? remaining[remaining.length - 1].id
        : s.activeTabId;
      const newStreaming = s.streamingTabId && closedIds.has(s.streamingTabId) ? null : s.streamingTabId;
      return { ...base, tabs: remaining, activeTabId: newActive, streamingTabId: newStreaming };
    });
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
      const clearStreaming = s.streamingTabId === id ? null : s.streamingTabId;
      if (remaining.length === 0) {
        const fresh = makeTab();
        return { tabs: [fresh], activeTabId: fresh.id, streamingTabId: clearStreaming };
      }
      const newActive = s.activeTabId === id
        ? (remaining[remaining.length - 1]?.id ?? remaining[0].id)
        : s.activeTabId;
      return { tabs: remaining, activeTabId: newActive, streamingTabId: clearStreaming };
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

  cancelInvoke: () => {
    const { tabs, activeTabId, streamingTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab?.isInvoking) {
      api.cancelUnary().catch(() => {});
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { isInvoking: false }) }));
    } else if (streamingTabId) {
      api.cancelStream().catch(() => {});
      const id = streamingTabId;
      set((s) => ({
        tabs: patchTab(s.tabs, id, { isStreaming: false }),
        streamingTabId: null,
      }));
    }
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

  // ── Collections ─────────────────────────────────────────────────────────────
  collections: [],

  loadCollections: async () => {
    try {
      const cols = await api.listCollections();
      set({ collections: cols ?? [] });
    } catch { set({ collections: [] }); }
  },

  loadCollectionDescriptors: async (collection) => {
    const { loadedProtosetPaths, loadedProtoFilePaths, protoImportPaths } = get();
    const needsProtosets = (collection.protosetPaths?.length ?? 0) > 0
      && !includesAll(loadedProtosetPaths, collection.protosetPaths);
    const needsProtoFiles = (collection.protoFilePaths?.length ?? 0) > 0
      && (!includesAll(loadedProtoFilePaths, collection.protoFilePaths)
        || !includesAll(protoImportPaths, collection.protoImportPaths ?? []));

    if (needsProtosets) {
      await get().loadProtosets(collection.protosetPaths);
    }
    if (needsProtoFiles) {
      await get().loadProtoFiles(collection.protoImportPaths ?? [], collection.protoFilePaths);
    }
  },

  saveToCollection: async (collectionId, name) => {
    const { tabs, activeTabId, connectionConfig, collections, loadedProtosetPaths, loadedProtoFilePaths, protoImportPaths } = get();
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
      col = {
        id: collectionId,
        name: collectionId,
        description: '',
        protosetPaths: loadedProtosetPaths,
        protoFilePaths: loadedProtoFilePaths,
        protoImportPaths,
        requests: [],
        createdAt: now,
        updatedAt: now,
      };
    }
    await api.saveCollection({
      ...col,
      protosetPaths: loadedProtosetPaths,
      protoFilePaths: loadedProtoFilePaths,
      protoImportPaths,
      requests: [...(col.requests ?? []), req],
      updatedAt: now,
    });
    await get().loadCollections();
    // Link this tab to the newly saved request.
    set((s) => ({
      tabs: patchTab(s.tabs, activeTabId, { savedRequestId: newReqId, savedRequestName: name, label: name }),
    }));
  },

  openSavedRequest: async (collection, request) => {
    let method = findMethodByPath(get().services, request.methodPath);
    if (!method) {
      await get().loadCollectionDescriptors(collection);
      method = findMethodByPath(get().services, request.methodPath);
    }
    if (!method) return;
    get().openMethodInNewTab(method, request.requestJson, request.metadata, request.id, request.name);
  },

  renameCollection: async (collectionId, newName) => {
    const name = newName.trim();
    if (!name) return;
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const now = new Date().toISOString();
    await api.saveCollection({ ...col, name, updatedAt: now });
    await get().loadCollections();
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
    const confirmed = await get().showConfirm('Delete this saved request? This cannot be undone.');
    if (!confirmed) return;
    const { collections } = get();
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;
    const now = new Date().toISOString();
    const updatedRequests = col.requests.filter((r) => r.id !== requestId);
    await api.saveCollection({ ...col, requests: updatedRequests, updatedAt: now });
    await get().loadCollections();
    const linkedTab = get().tabs.find((t) => t.savedRequestId === requestId);
    if (linkedTab) get().closeTab(linkedTab.id);
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
    const col = get().collections.find((c) => c.id === id);
    const confirmed = await get().showConfirm(`Delete collection "${col?.name ?? id}"? This cannot be undone.`);
    if (!confirmed) return;
    const requestIds = new Set((col?.requests ?? []).map((r) => r.id));
    await api.deleteCollection(id);
    await get().loadCollections();
    // Batch-close all linked tabs in a single state update
    set((s) => {
      const closedIds = new Set(
        s.tabs.filter((t) => t.savedRequestId && requestIds.has(t.savedRequestId)).map((t) => t.id)
      );
      if (closedIds.size === 0) return {};
      let remaining = s.tabs.filter((t) => !closedIds.has(t.id));
      if (remaining.length === 0) remaining = [makeTab()];
      const newActive = closedIds.has(s.activeTabId)
        ? remaining[remaining.length - 1].id
        : s.activeTabId;
      const newStreaming = s.streamingTabId && closedIds.has(s.streamingTabId) ? null : s.streamingTabId;
      return { tabs: remaining, activeTabId: newActive, streamingTabId: newStreaming };
    });
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
      const imported = await api.importCollection(srcPath);
      await get().loadCollections();
      if (imported) {
        await get().loadCollectionDescriptors(imported);
      }
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
    const env = get().environments.find((e) => e.id === id);
    set((s) => {
      if (!env?.target) return { activeEnvironmentId: id };
      return {
        activeEnvironmentId: id,
        connectionConfig: {
          ...s.connectionConfig,
          target: env.target,
          ...(env.tls ? { tls: env.tls as ConnectionConfig['tls'] } : {}),
        },
      };
    });
  },

  // ── Settings ─────────────────────────────────────────────────────────────
  confirmDeletes: true,
  timestampInputLocal: false,
  theme: 'nimbus' as ThemeId,
  isDark: true,
  customTheme: {},
  fontSize: 16,
  confirmDialog: null,

  // ── Layout ──────────────────────────────────────────────────────────────
  sidebarWidth: 256,
  panelSplit: 0.5,

  loadUserSettings: async () => {
    try {
      const s = await api.getUserSettings();
      const themeId = (s.theme as ThemeId) || 'nimbus';
      const custom = (s.customTheme as Partial<ThemeTokens>) ?? {};
      const fontSize = s.fontSize ?? 14;
      const sidebarWidth = s.sidebarWidth ?? 256;
      const panelSplit = s.panelSplit ?? 0.5;
      set({ confirmDeletes: s.confirmDeletes, timestampInputLocal: s.timestampInputLocal ?? false, theme: themeId, isDark: isColorDark(resolveTheme(themeId, custom).bg), customTheme: custom, fontSize, sidebarWidth, panelSplit });
      applyTheme(resolveTheme(themeId, custom));
      applyFontSize(fontSize);
    } catch { /* use defaults */ }
  },

  setConfirmDeletes: (v) => {
    set({ confirmDeletes: v });
    saveAllSettings(get());
  },

  setTimestampInputLocal: (v) => {
    set({ timestampInputLocal: v });
    saveAllSettings(get());
  },

  setTheme: (id, custom) => {
    const resolved = resolveTheme(id, custom);
    const customTheme = id === 'custom' ? (custom ?? {}) : {};
    set({ theme: id, isDark: isColorDark(resolved.bg), customTheme });
    applyTheme(resolved);
    saveAllSettings(get());
  },

  setFontSize: (size) => {
    set({ fontSize: size });
    applyFontSize(size);
    saveAllSettings(get());
  },

  setSidebarWidth: (w) => {
    set({ sidebarWidth: w });
    saveAllSettings(get());
  },

  setPanelSplit: (s) => {
    set({ panelSplit: s });
    saveAllSettings(get());
  },

  showConfirm: (message) => {
    if (!get().confirmDeletes) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      set({ confirmDialog: { message, resolve } });
    });
  },

  resolveConfirm: (yes) => {
    const dialog = get().confirmDialog;
    set({ confirmDialog: null });
    dialog?.resolve(yes);
  },
}));
