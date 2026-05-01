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
import { ThemeId, ThemeTokens, CustomThemeEntry, applyTheme, applyFontSize, resolveTheme, isColorDark, isBuiltinTheme, THEMES, DEFAULT_CUSTOM_THEME } from '../themes';

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
          GetUserSettings(): Promise<{
            confirmDeletes: boolean;
            timestampInputLocal: boolean;
            confirmClearHistory?: boolean;
            theme: string;
            customThemes?: CustomThemeEntry[];
            activeCustomThemeId?: string;
            fontSize?: number;
            responseWordWrap?: boolean;
            responseIndent?: number;
            sidebarWidth?: number;
            panelSplit?: number;
            defaultTimeoutSeconds?: number;
            historyLimit?: number;
            autoConnectOnStartup?: boolean;
            allowShellCommands?: boolean;
            maxStreamMessages?: number;
            defaultMetadata?: MetadataEntry[];
          }>;
          SaveUserSettings(s: {
            confirmDeletes: boolean;
            timestampInputLocal: boolean;
            confirmClearHistory: boolean;
            theme: string;
            customThemes: CustomThemeEntry[];
            activeCustomThemeId: string;
            fontSize: number;
            responseWordWrap: boolean;
            responseIndent: number;
            sidebarWidth: number;
            panelSplit: number;
            defaultTimeoutSeconds: number;
            historyLimit: number;
            autoConnectOnStartup: boolean;
            allowShellCommands: boolean;
            maxStreamMessages: number;
            defaultMetadata: MetadataEntry[];
          }): Promise<void>;
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
  saveUserSettings: (s: {
    confirmDeletes: boolean; timestampInputLocal: boolean; confirmClearHistory: boolean;
    theme: string; customThemes: CustomThemeEntry[]; activeCustomThemeId: string;
    fontSize: number; responseWordWrap: boolean; responseIndent: number;
    sidebarWidth: number; panelSplit: number;
    defaultTimeoutSeconds: number; historyLimit: number; autoConnectOnStartup: boolean;
    allowShellCommands: boolean;
    maxStreamMessages: number; defaultMetadata: MetadataEntry[];
  }): Promise<void> => window.go.main.App.SaveUserSettings(s),
};

// Persist all user settings from the current store state.
function saveAllSettings(s: Pick<AppState,
  'confirmDeletes' | 'timestampInputLocal' | 'confirmClearHistory' |
  'theme' | 'customThemes' | 'activeCustomThemeId' |
  'fontSize' | 'responseWordWrap' | 'responseIndent' |
  'sidebarWidth' | 'panelSplit' |
  'defaultTimeoutSeconds' | 'historyLimit' | 'autoConnectOnStartup' |
  'allowShellCommands' |
  'maxStreamMessages' | 'defaultMetadata'
>) {
  api.saveUserSettings({
    confirmDeletes: s.confirmDeletes,
    timestampInputLocal: s.timestampInputLocal,
    confirmClearHistory: s.confirmClearHistory,
    theme: s.theme,
    customThemes: s.customThemes,
    activeCustomThemeId: s.activeCustomThemeId,
    fontSize: s.fontSize,
    responseWordWrap: s.responseWordWrap,
    responseIndent: s.responseIndent,
    sidebarWidth: s.sidebarWidth,
    panelSplit: s.panelSplit,
    defaultTimeoutSeconds: s.defaultTimeoutSeconds,
    historyLimit: s.historyLimit,
    autoConnectOnStartup: s.autoConnectOnStartup,
    allowShellCommands: s.allowShellCommands,
    maxStreamMessages: s.maxStreamMessages,
    defaultMetadata: s.defaultMetadata,
  }).catch(() => {});
}

// ─── Tab helpers ──────────────────────────────────────────────────────────────

let _tabSeq = 0;
type ConnectionStatus = 'disconnected' | 'idle' | 'connecting' | 'ready' | 'transient_failure';

const CONNECTION_STATUS_SET: ReadonlySet<ConnectionStatus> = new Set([
  'disconnected',
  'idle',
  'connecting',
  'ready',
  'transient_failure',
]);

function normalizeConnectionStatus(status: unknown): ConnectionStatus {
  return typeof status === 'string' && CONNECTION_STATUS_SET.has(status as ConnectionStatus)
    ? (status as ConnectionStatus)
    : 'disconnected';
}

// Module-level handle so polling survives re-renders
let _connPollInterval: ReturnType<typeof setInterval> | null = null;

function startConnPoll() {
  if (_connPollInterval) return;
  _connPollInterval = setInterval(async () => {
    try {
      const raw = await api.getConnectionState();
      const status = normalizeConnectionStatus(raw);
      useAppStore.setState({ connectionStatus: status, isConnected: status !== 'disconnected' });
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

function normalizeMetadataEntries(entries: unknown): MetadataEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries.reduce<MetadataEntry[]>((acc, entry) => {
    if (!entry || typeof entry !== 'object') return acc;
    const key = 'key' in entry && typeof entry.key === 'string' ? entry.key.trim() : '';
    if (!key) return acc;
    const value = 'value' in entry && typeof entry.value === 'string' ? entry.value : '';
    acc.push({ key, value });
    return acc;
  }, []);
}

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === 'string');
}

function normalizeConnectionConfig(config: unknown): ConnectionConfig {
  const raw = config && typeof config === 'object' ? (config as Partial<ConnectionConfig>) : {};
  const tls: ConnectionConfig['tls'] =
    raw.tls === 'system' || raw.tls === 'none' ? raw.tls : 'none';
  return {
    target: typeof raw.target === 'string' ? raw.target : '',
    tls,
    ...(typeof raw.clientCert === 'string' ? { clientCert: raw.clientCert } : {}),
    ...(typeof raw.clientKey === 'string' ? { clientKey: raw.clientKey } : {}),
  };
}

function normalizeInvokeResponse(response: InvokeResponse): InvokeResponse {
  return {
    ...response,
    responseJson: typeof response.responseJson === 'string' ? response.responseJson : '',
    status: typeof response.status === 'string' ? response.status : '',
    statusCode: typeof response.statusCode === 'number' ? response.statusCode : 0,
    statusMessage: typeof response.statusMessage === 'string' ? response.statusMessage : '',
    headers: normalizeMetadataEntries(response.headers),
    trailers: normalizeMetadataEntries(response.trailers),
    durationMs: typeof response.durationMs === 'number' ? response.durationMs : 0,
    ...(typeof response.error === 'string' ? { error: response.error } : {}),
    ...(typeof response.streaming === 'boolean' ? { streaming: response.streaming } : {}),
  };
}

function normalizeHistoryEntries(entries: HistoryEntry[]): HistoryEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ({
    ...entry,
    requestJson: typeof entry.requestJson === 'string' ? entry.requestJson : '{}',
    metadata: normalizeMetadataEntries(entry.metadata),
    response: entry.response ? normalizeInvokeResponse(entry.response) : undefined,
    invokedAt: typeof entry.invokedAt === 'string' ? entry.invokedAt : new Date(0).toISOString(),
  }));
}

function normalizeSavedRequest(request: SavedRequest): SavedRequest {
  return {
    ...request,
    methodPath: typeof request.methodPath === 'string' ? request.methodPath : '',
    requestJson: typeof request.requestJson === 'string' ? request.requestJson : '{}',
    metadata: normalizeMetadataEntries(request.metadata),
    connection: normalizeConnectionConfig(request.connection),
  };
}

function normalizeCollection(collection: Collection): Collection {
  return {
    ...collection,
    protosetPaths: normalizeStringArray(collection.protosetPaths),
    protoFilePaths: normalizeStringArray(collection.protoFilePaths),
    protoImportPaths: normalizeStringArray(collection.protoImportPaths),
    requests: Array.isArray(collection.requests) ? collection.requests.map(normalizeSavedRequest) : [],
  };
}

function normalizeCollections(collections: Collection[]): Collection[] {
  if (!Array.isArray(collections)) return [];
  return collections.map(normalizeCollection);
}

function normalizeEnvironment(environment: Environment): Environment {
  return {
    ...environment,
    headers: normalizeMetadataEntries(environment.headers),
  };
}

function normalizeEnvironments(environments: Environment[]): Environment[] {
  if (!Array.isArray(environments)) return [];
  return environments.map(normalizeEnvironment);
}

function normalizeStreamEvent(event: unknown): StreamEvent | null {
  if (!event || typeof event !== 'object') return null;
  const e = event as Record<string, unknown>;
  const type = e.type;
  if (type !== 'message' && type !== 'header' && type !== 'trailer' && type !== 'error') {
    return null;
  }

  const normalized: StreamEvent = { type };
  if (typeof e.json === 'string') normalized.json = e.json;
  if (typeof e.status === 'string') normalized.status = e.status;
  if (type === 'trailer' && typeof normalized.status !== 'string') normalized.status = 'OK';
  if (typeof e.statusCode === 'number') normalized.statusCode = e.statusCode;
  if (type === 'trailer' && typeof normalized.statusCode !== 'number') normalized.statusCode = 0;
  if (typeof e.error === 'string') normalized.error = e.error;
  if (type === 'header' || type === 'trailer') normalized.metadata = normalizeMetadataEntries(e.metadata);
  return normalized;
}

const INITIAL_TAB = makeTab();

// ─── App State ────────────────────────────────────────────────────────────────

interface AppState {
  // Connection
  connectionConfig: ConnectionConfig;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  setConnectionConfig: (cfg: Partial<ConnectionConfig>) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

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
  closeTab: (id: string) => Promise<void>;
  closeAllTabs: () => Promise<void>;
  setActiveTab: (id: string) => void;
  duplicateTab: (id: string) => void;
  openMethodInNewTab: (method: MethodInfo, requestJson?: string, metadata?: MetadataEntry[] | null, savedRequestId?: string, savedRequestName?: string) => void;

  // Per-tab actions (operate on the active tab)
  selectMethod: (method: MethodInfo | null) => void;
  setRequestJson: (json: string) => void;
  setRequestMetadata: (md: MetadataEntry[]) => void;
  setTimeoutSeconds: (t: number) => void;
  loadRequestSchema: (methodPath: string) => Promise<void>;
  invoke: () => Promise<void>;
  cancelInvoke: () => Promise<void>;
  appendStreamEvent: (evt: unknown) => void;
  clearStream: () => void;
  cancelStream: () => Promise<void>;
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
  confirmClearHistory: boolean;
  setConfirmClearHistory: (v: boolean) => void;
  timestampInputLocal: boolean;
  setTimestampInputLocal: (v: boolean) => void;
  theme: ThemeId;
  isDark: boolean;
  activeThemeTokens: ThemeTokens;
  customThemes: CustomThemeEntry[];
  activeCustomThemeId: string;
  setTheme: (id: ThemeId, customThemeId?: string) => void;
  forkTheme: (sourceId: string) => void;
  updateCustomTheme: (id: string, tokens: Partial<ThemeTokens>) => void;
  renameCustomTheme: (id: string, name: string) => void;
  deleteCustomTheme: (id: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  responseWordWrap: boolean;
  setResponseWordWrap: (v: boolean) => void;
  responseIndent: number;
  setResponseIndent: (v: number) => void;
  defaultTimeoutSeconds: number;
  setDefaultTimeoutSeconds: (v: number) => void;
  historyLimit: number;
  setHistoryLimit: (v: number) => void;
  autoConnectOnStartup: boolean;
  setAutoConnectOnStartup: (v: boolean) => void;
  allowShellCommands: boolean;
  setAllowShellCommands: (v: boolean) => void;
  maxStreamMessages: number;
  setMaxStreamMessages: (v: number) => void;
  defaultMetadata: MetadataEntry[];
  setDefaultMetadata: (v: MetadataEntry[]) => void;
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

  // Settings panel
  settingsOpen: boolean;
  settingsTarget: string | null;
  openSettings: (tab?: string) => void;
  closeSettings: () => void;
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
    set({ connectionStatus: 'connecting', connectionError: null });
    try {
      await api.connect(connectionConfig);
      const status = normalizeConnectionStatus(await api.getConnectionState().catch(() => 'connecting'));
      set({ isConnected: status !== 'disconnected', connectionStatus: status, connectionError: null });
      startConnPoll();
    } catch (e: unknown) {
      set({ isConnected: false, connectionStatus: 'disconnected', connectionError: e instanceof Error ? e.message : String(e) });
    }
  },

  disconnect: async () => {
    stopConnPoll();
    try {
      await api.disconnect();
    } catch {
      // best-effort disconnect
    }
    set({ isConnected: false, connectionStatus: 'disconnected' });
  },

  // ── Startup restore ─────────────────────────────────────────────────────────
  restoreLoadedState: async () => {
    try {
      const state = await api.getLoadedState();
      if (!state) return;
      if (state.lastTarget) {
        // Normalize lastTLS to allowed values; fallback to 'none' for invalid/removed modes
        const normalizedTls: ConnectionConfig['tls'] = (state.lastTLS === 'system' ? 'system' : 'none');
        set((s) => ({
          connectionConfig: {
            ...s.connectionConfig,
            target: state.lastTarget,
            tls: normalizedTls,
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
      const connState = normalizeConnectionStatus(await api.getConnectionState());
      set({ isConnected: connState !== 'disconnected', connectionStatus: connState });
      if (connState !== 'disconnected') {
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
    const { streamingTabId, tabs } = get();
    if (streamingTabId && tabs.some((t) => t.id === streamingTabId && t.selectedMethod)) {
      await get().cancelStream();
    }
    await api.clearLoadedProtos();
    // Close all tabs that had a method selected (they're all orphaned now)
    set((s) => {
      const orphanedIds = new Set(s.tabs.filter((t) => t.selectedMethod).map((t) => t.id));
      if (orphanedIds.size === 0) {
        return { services: [], protosetPaths: [], loadedProtosetPaths: [], loadedProtoFilePaths: [], protoImportPaths: [], loadMode: '' };
      }
      let remaining = s.tabs.filter((t) => !orphanedIds.has(t.id));
      if (remaining.length === 0) remaining = [makeTab({ timeoutSeconds: s.defaultTimeoutSeconds })];
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

    const current = get();
    const closingIds = new Set(
      current.tabs
        .filter((t) => t.selectedMethod && !validMethods.has(t.selectedMethod.fullName))
        .map((t) => t.id)
    );
    if (current.streamingTabId && closingIds.has(current.streamingTabId)) {
      await get().cancelStream();
    }

    // Apply loaded state and close orphaned tabs in one atomic update
    set((s) => {
      const base = { ...applyLoadedState(state), services: newServices };
      const invalidTabs = s.tabs.filter((t) => t.selectedMethod && !validMethods.has(t.selectedMethod.fullName));
      if (invalidTabs.length === 0) return base;
      const closedIds = new Set(invalidTabs.map((t) => t.id));
      let remaining = s.tabs.filter((t) => !closedIds.has(t.id));
      if (remaining.length === 0) remaining = [makeTab({ timeoutSeconds: s.defaultTimeoutSeconds })];
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
    const tab = makeTab({ timeoutSeconds: get().defaultTimeoutSeconds });
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  closeTab: async (id) => {
    if (get().streamingTabId === id) {
      await get().cancelStream();
    }
    set((s) => {
      const remaining = s.tabs.filter((t) => t.id !== id);
      const clearStreaming = s.streamingTabId === id ? null : s.streamingTabId;
      if (remaining.length === 0) {
        const fresh = makeTab({ timeoutSeconds: s.defaultTimeoutSeconds });
        return { tabs: [fresh], activeTabId: fresh.id, streamingTabId: clearStreaming };
      }
      const newActive = s.activeTabId === id
        ? (remaining[remaining.length - 1]?.id ?? remaining[0].id)
        : s.activeTabId;
      return { tabs: remaining, activeTabId: newActive, streamingTabId: clearStreaming };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  closeAllTabs: async () => {
    if (get().streamingTabId) {
      await get().cancelStream();
    }
    set((s) => {
      const fresh = makeTab({ timeoutSeconds: s.defaultTimeoutSeconds });
      return { tabs: [fresh], activeTabId: fresh.id, streamingTabId: null };
    });
  },

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
    const normalizedRequestJson = typeof requestJson === 'string' ? requestJson : '{}';
    const normalizedMetadata = normalizeMetadataEntries(metadata);
    const patch: Partial<Tab> = {
      selectedMethod: method, label,
      savedRequestId: savedRequestId ?? null,
      savedRequestName: savedRequestName ?? null,
      requestJson: normalizedRequestJson, requestMetadata: normalizedMetadata,
      timeoutSeconds: get().defaultTimeoutSeconds,
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
    set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { requestMetadata: md as MetadataEntry[] }) }));
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
    const { tabs, activeTabId, streamingTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab?.selectedMethod) return;

    if (streamingTabId) {
      const owner = tabs.find((t) => t.id === streamingTabId);
      const msg = owner
        ? `A stream is active in "${owner.label}". Cancel it before sending another request.`
        : 'A stream is already active. Cancel it before sending another request.';
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { invokeError: msg }) }));
      return;
    }

    const { selectedMethod, requestJson, requestMetadata, timeoutSeconds } = tab;
    const metadata = normalizeMetadataEntries(requestMetadata);

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
        await api.invokeStream({ methodPath: selectedMethod.fullName, requestJson, metadata, timeoutSeconds });
      } else {
        const resp = await api.invokeUnary({ methodPath: selectedMethod.fullName, requestJson, metadata, timeoutSeconds });
        set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { response: normalizeInvokeResponse(resp), isInvoking: false }) }));
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
    const normalized = normalizeStreamEvent(evt);
    if (!normalized) return;
    const { streamingTabId } = get();
    if (!streamingTabId) return;
    const isDone = normalized.type === 'trailer' || normalized.type === 'error';
    set((s) => {
      const streamTab = s.tabs.find((t) => t.id === streamingTabId);
      if (!streamTab) return { streamingTabId: null };
      if (!streamTab.selectedMethod || (!streamTab.selectedMethod.serverStreaming && !streamTab.selectedMethod.clientStreaming)) {
        return { streamingTabId: null, tabs: patchTab(s.tabs, streamingTabId, { isStreaming: false }) };
      }
      if (!streamTab.isStreaming && normalized.type !== 'error' && normalized.type !== 'trailer') {
        return {};
      }
      const rawMessages = normalized.type === 'header' && (normalized.metadata?.length ?? 0) === 0
        ? streamTab.streamMessages
        : [...streamTab.streamMessages, normalized];
      const cap = s.maxStreamMessages;
      const nextMessages = cap > 0 && rawMessages.length > cap ? rawMessages.slice(-cap) : rawMessages;
      const patch: Partial<Tab> = {
        streamMessages: nextMessages,
        isStreaming: !isDone,
      };
      if (normalized.type === 'error') patch.invokeError = normalized.error ?? 'Stream ended with an error';
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

  cancelStream: async () => {
    const id = get().streamingTabId;
    if (!id) return;
    try {
      await api.cancelStream();
    } catch {
      // best-effort cancellation
    }
    set((s) => ({
      tabs: patchTab(s.tabs, id, { isStreaming: false }),
      streamingTabId: null,
    }));
  },

  cancelInvoke: async () => {
    const { tabs, activeTabId, streamingTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab?.isInvoking) {
      try {
        await api.cancelUnary();
      } catch {
        // best-effort cancellation
      }
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { isInvoking: false }) }));
    } else if (streamingTabId) {
      await get().cancelStream();
    }
  },

  loadHistory: async (methodPath) => {
    const { activeTabId } = get();
    try {
      const entries = await api.getHistory(methodPath);
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { history: normalizeHistoryEntries(entries ?? []) }) }));
    } catch {
      set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { history: [] }) }));
    }
  },

  clearHistory: async (methodPath) => {
    if (get().confirmClearHistory) {
      const confirmed = await get().showConfirm('Clear history for this method? This cannot be undone.');
      if (!confirmed) return;
    }
    const { activeTabId } = get();
    await api.clearHistory(methodPath);
    set((s) => ({ tabs: patchTab(s.tabs, activeTabId, { history: [] }) }));
  },

  // ── Collections ─────────────────────────────────────────────────────────────
  collections: [],

  loadCollections: async () => {
    try {
      const cols = await api.listCollections();
      set({ collections: normalizeCollections(cols ?? []) });
    } catch { set({ collections: [] }); }
  },

  loadCollectionDescriptors: async (collection) => {
    const normalized = normalizeCollection(collection);
    const { loadedProtosetPaths, loadedProtoFilePaths, protoImportPaths } = get();
    const needsProtosets = normalized.protosetPaths.length > 0
      && !includesAll(loadedProtosetPaths, normalized.protosetPaths);
    const needsProtoFiles = normalized.protoFilePaths.length > 0
      && (!includesAll(loadedProtoFilePaths, normalized.protoFilePaths)
        || !includesAll(protoImportPaths, normalized.protoImportPaths));

    if (needsProtosets) {
      await get().loadProtosets(normalized.protosetPaths);
    }
    if (needsProtoFiles) {
      await get().loadProtoFiles(normalized.protoImportPaths, normalized.protoFilePaths);
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
      metadata: normalizeMetadataEntries(requestMetadata), connection: normalizeConnectionConfig(connectionConfig),
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
    const normalizedRequest = normalizeSavedRequest(request);
    let method = findMethodByPath(get().services, normalizedRequest.methodPath);
    if (!method) {
      await get().loadCollectionDescriptors(collection);
      method = findMethodByPath(get().services, normalizedRequest.methodPath);
    }
    if (!method) return;
    get().openMethodInNewTab(method, normalizedRequest.requestJson, normalizedRequest.metadata, normalizedRequest.id, normalizedRequest.name);
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
        ? {
            ...r,
            requestJson,
            metadata: normalizeMetadataEntries(requestMetadata),
            connection: normalizeConnectionConfig(connectionConfig),
            updatedAt: now,
          }
        : r
    );
    await api.saveCollection({ ...col, requests: updatedRequests, updatedAt: now });
    await get().loadCollections();
  },

  deleteRequest: async (collectionId, requestId) => {
    if (get().confirmDeletes) {
      const confirmed = await get().showConfirm('Delete this saved request? This cannot be undone.');
      if (!confirmed) return;
    }
    const { collections } = get();
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;
    const now = new Date().toISOString();
    const updatedRequests = col.requests.filter((r) => r.id !== requestId);
    await api.saveCollection({ ...col, requests: updatedRequests, updatedAt: now });
    await get().loadCollections();
    const linkedTab = get().tabs.find((t) => t.savedRequestId === requestId);
    if (linkedTab) await get().closeTab(linkedTab.id);
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
    if (get().confirmDeletes) {
      const confirmed = await get().showConfirm(`Delete collection "${col?.name ?? id}"? This cannot be undone.`);
      if (!confirmed) return;
    }
    const requestIds = new Set((col?.requests ?? []).map((r) => r.id));
    const streamOwner = get().tabs.find((t) => t.id === get().streamingTabId);
    if (streamOwner?.savedRequestId && requestIds.has(streamOwner.savedRequestId)) {
      await get().cancelStream();
    }
    await api.deleteCollection(id);
    await get().loadCollections();
    // Batch-close all linked tabs in a single state update
    set((s) => {
      const closedIds = new Set(
        s.tabs.filter((t) => t.savedRequestId && requestIds.has(t.savedRequestId)).map((t) => t.id)
      );
      if (closedIds.size === 0) return {};
      let remaining = s.tabs.filter((t) => !closedIds.has(t.id));
      if (remaining.length === 0) remaining = [makeTab({ timeoutSeconds: s.defaultTimeoutSeconds })];
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
      const imported = normalizeCollection(await api.importCollection(srcPath));
      await get().loadCollections();
      await get().loadCollectionDescriptors(imported);
    }
  },

  // ── Environments ────────────────────────────────────────────────────────────
  environments: [],
  activeEnvironmentId: '',

  loadEnvironments: async () => {
    try {
      const envs = await api.listEnvironments();
      set({ environments: normalizeEnvironments(envs ?? []) });
    } catch { set({ environments: [] }); }
  },

  saveEnvironment: async (env) => {
    await api.saveEnvironment(normalizeEnvironment(env));
    await get().loadEnvironments();
    // If the saved environment is currently active and has a target, keep the
    // connection bar in sync so the URL/TLS fields reflect the saved values.
    if (get().activeEnvironmentId === env.id && env.target) {
      set((s) => ({
        connectionConfig: {
          ...s.connectionConfig,
          target: env.target!,
          ...(env.tls ? { tls: env.tls as ConnectionConfig['tls'] } : {}),
        },
      }));
    }
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
  confirmClearHistory: false,
  timestampInputLocal: false,
  theme: 'nimbus' as ThemeId,
  isDark: true,
  activeThemeTokens: THEMES.nimbus,
  customThemes: [],
  activeCustomThemeId: '',
  fontSize: 16,
  responseWordWrap: true,
  responseIndent: 2,
  defaultTimeoutSeconds: 0,
  historyLimit: 50,
  autoConnectOnStartup: false,
  allowShellCommands: false,
  maxStreamMessages: 200,
  defaultMetadata: [],
  confirmDialog: null,
  settingsOpen: false,
  settingsTarget: null,
  openSettings: (tab) => set({ settingsOpen: true, settingsTarget: tab ?? null }),
  closeSettings: () => set({ settingsOpen: false, settingsTarget: null }),

  // ── Layout ──────────────────────────────────────────────────────────────
  sidebarWidth: 256,
  panelSplit: 0.5,

  loadUserSettings: async () => {
    try {
      const s = await api.getUserSettings();
      const rawTheme = s.theme as string;
      const themeId: ThemeId = (isBuiltinTheme(rawTheme) || rawTheme === 'custom') ? rawTheme as ThemeId : 'nimbus';
      const customThemes: CustomThemeEntry[] = s.customThemes ?? [];
      const activeCustomThemeId = s.activeCustomThemeId ?? '';
      const activeTokens = customThemes.find((t) => t.id === activeCustomThemeId)?.tokens ?? {};
      const fontSize = s.fontSize ?? 16;
      const sidebarWidth = s.sidebarWidth ?? 256;
      const panelSplit = s.panelSplit ?? 0.5;
      const resolved = resolveTheme(themeId, activeTokens);
      set({
        confirmDeletes: s.confirmDeletes,
        confirmClearHistory: s.confirmClearHistory ?? false,
        timestampInputLocal: s.timestampInputLocal ?? false,
        theme: themeId,
        isDark: isColorDark(resolved.bg),
        activeThemeTokens: resolved,
        customThemes,
        activeCustomThemeId,
        fontSize,
        responseWordWrap: s.responseWordWrap ?? true,
        responseIndent: s.responseIndent ?? 2,
        sidebarWidth,
        panelSplit,
        defaultTimeoutSeconds: s.defaultTimeoutSeconds ?? 0,
        historyLimit: s.historyLimit ?? 50,
        autoConnectOnStartup: s.autoConnectOnStartup ?? false,
        allowShellCommands: s.allowShellCommands ?? false,
        maxStreamMessages: s.maxStreamMessages ?? 200,
        defaultMetadata: s.defaultMetadata ?? [],
      });
      applyTheme(resolved);
      applyFontSize(fontSize);
    } catch { /* use defaults */ }
  },

  setConfirmDeletes: (v) => {
    set({ confirmDeletes: v });
    saveAllSettings(get());
  },

  setConfirmClearHistory: (v) => {
    set({ confirmClearHistory: v });
    saveAllSettings(get());
  },

  setTimestampInputLocal: (v) => {
    set({ timestampInputLocal: v });
    saveAllSettings(get());
  },

  setTheme: (id, customThemeId?) => {
    const { customThemes } = get();
    const activeId = id === 'custom' ? (customThemeId ?? get().activeCustomThemeId) : '';
    const activeTokens = activeId ? (customThemes.find((t) => t.id === activeId)?.tokens ?? {}) : {};
    const resolved = resolveTheme(id, activeTokens);
    set({ theme: id, isDark: isColorDark(resolved.bg), activeThemeTokens: resolved, activeCustomThemeId: activeId });
    applyTheme(resolved);
    saveAllSettings(get());
  },

  forkTheme: (sourceId) => {
    const { customThemes } = get();
    const sourceTokens: Partial<ThemeTokens> = (() => {
      // Check if sourceId is a built-in preset
      if (sourceId in THEMES) return { ...THEMES[sourceId as keyof typeof THEMES] };
      // Otherwise find in custom themes list
      return { ...(customThemes.find((t) => t.id === sourceId)?.tokens ?? DEFAULT_CUSTOM_THEME) };
    })();
    const sourceName = (() => {
      if (sourceId in THEMES) {
        const labels: Record<string, string> = {
          nimbus: 'Nimbus', dark: 'Dark', light: 'Light',
          deuteranopia: 'Deuteranopia', tritanopia: 'Tritanopia', highcontrast: 'High Contrast',
        };
        return labels[sourceId] ?? sourceId;
      }
      return customThemes.find((t) => t.id === sourceId)?.name ?? 'Theme';
    })();
    const newId = crypto.randomUUID();
    const newEntry: CustomThemeEntry = { id: newId, name: `${sourceName} copy`, tokens: sourceTokens };
    const updated = [...customThemes, newEntry];
    const resolved = resolveTheme('custom', sourceTokens);
    set({ customThemes: updated, theme: 'custom', activeCustomThemeId: newId, isDark: isColorDark(resolved.bg), activeThemeTokens: resolved });
    applyTheme(resolved);
    saveAllSettings(get());
  },

  updateCustomTheme: (id, tokens) => {
    const { customThemes, activeCustomThemeId, theme } = get();
    const updated = customThemes.map((t) => t.id === id ? { ...t, tokens } : t);
    set({ customThemes: updated });
    // Re-apply if this is the active theme
    if (theme === 'custom' && activeCustomThemeId === id) {
      const resolved = resolveTheme('custom', tokens);
      set({ isDark: isColorDark(resolved.bg), activeThemeTokens: resolved });
      applyTheme(resolved);
    }
    saveAllSettings(get());
  },

  renameCustomTheme: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({ customThemes: s.customThemes.map((t) => t.id === id ? { ...t, name: trimmed } : t) }));
    saveAllSettings(get());
  },

  deleteCustomTheme: (id) => {
    const { customThemes, activeCustomThemeId } = get();
    const updated = customThemes.filter((t) => t.id !== id);
    // If the deleted theme was active, fall back to nimbus
    if (activeCustomThemeId === id) {
      const resolved = resolveTheme('nimbus');
      set({ customThemes: updated, theme: 'nimbus', activeCustomThemeId: '', isDark: isColorDark(resolved.bg), activeThemeTokens: resolved });
      applyTheme(resolved);
    } else {
      set({ customThemes: updated });
    }
    saveAllSettings(get());
  },

  setFontSize: (size) => {
    set({ fontSize: size });
    applyFontSize(size);
    saveAllSettings(get());
  },

  setResponseWordWrap: (v) => {
    set({ responseWordWrap: v });
    saveAllSettings(get());
  },

  setResponseIndent: (v) => {
    set({ responseIndent: v });
    saveAllSettings(get());
  },

  setDefaultTimeoutSeconds: (v) => {
    set({ defaultTimeoutSeconds: v });
    saveAllSettings(get());
  },

  setHistoryLimit: (v) => {
    set({ historyLimit: v });
    saveAllSettings(get());
  },

  setAutoConnectOnStartup: (v) => {
    set({ autoConnectOnStartup: v });
    saveAllSettings(get());
  },

  setAllowShellCommands: (v) => {
    set({ allowShellCommands: v });
    saveAllSettings(get());
  },

  setMaxStreamMessages: (v) => {
    set({ maxStreamMessages: v });
    saveAllSettings(get());
  },

  setDefaultMetadata: (v) => {
    set({ defaultMetadata: v });
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
