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
};

// ─── App State ────────────────────────────────────────────────────────────────

interface AppState {
  // Connection
  connectionConfig: ConnectionConfig;
  isConnected: boolean;
  connectionError: string | null;
  setConnectionConfig: (cfg: Partial<ConnectionConfig>) => void;
  connect: () => Promise<void>;
  disconnect: () => void;

  // Startup state restoration
  restoreLoadedState: () => Promise<void>;

  // Descriptor sources
  services: ServiceInfo[];
  protosetPaths: string[];
  loadMode: string; // "protoset", "proto", "reflection", or ""
  loadProtosets: (paths: string[]) => Promise<void>;
  loadProtoFiles: (importPaths: string[], protoFiles: string[]) => Promise<void>;
  loadViaReflection: () => Promise<void>;
  clearLoadedProtos: () => Promise<void>;
  reloadProtos: () => Promise<void>;
  removeProtoPath: (path: string) => Promise<void>;

  // Selected method
  selectedMethod: MethodInfo | null;
  selectMethod: (method: MethodInfo | null) => void;

  // Request schema (for form builder)
  requestSchema: FieldSchema[];
  loadRequestSchema: (methodPath: string) => Promise<void>;

  // Request state
  requestJson: string;
  requestMetadata: MetadataEntry[];
  timeoutSeconds: number;
  setRequestJson: (json: string) => void;
  setRequestMetadata: (md: MetadataEntry[]) => void;
  setTimeoutSeconds: (t: number) => void;

  // Response state (unary)
  response: InvokeResponse | null;
  isInvoking: boolean;
  invokeError: string | null;
  invoke: () => Promise<void>;

  // Streaming state
  streamMessages: StreamEvent[];
  isStreaming: boolean;
  appendStreamEvent: (evt: StreamEvent) => void;
  clearStream: () => void;
  cancelStream: () => void;

  // Collections
  collections: Collection[];
  loadCollections: () => Promise<void>;
  saveToCollection: (collectionId: string, name: string) => Promise<void>;
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

  // History
  history: HistoryEntry[];
  loadHistory: (methodPath: string) => Promise<void>;
  clearHistory: (methodPath: string) => Promise<void>;
  restoreFromHistory: (entry: HistoryEntry) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Connection ──────────────────────────────────────────────────────────────
  connectionConfig: { target: 'localhost:50051', tls: 'none' },
  isConnected: false,
  connectionError: null,

  setConnectionConfig: (cfg) =>
    set((s) => ({ connectionConfig: { ...s.connectionConfig, ...cfg } })),

  connect: async () => {
    const { connectionConfig } = get();
    try {
      await api.connect(connectionConfig);
      set({ isConnected: true, connectionError: null });
    } catch (e: unknown) {
      set({ isConnected: false, connectionError: e instanceof Error ? e.message : String(e) });
    }
  },

  disconnect: () => {
    api.disconnect().catch(() => {});
    set({ isConnected: false });
  },

  // ── Startup restore ─────────────────────────────────────────────────────────
  restoreLoadedState: async () => {
    try {
      const state = await api.getLoadedState();
      if (!state) return;

      // Restore connection config if a target was saved
      if (state.lastTarget) {
        set((s) => ({
          connectionConfig: {
            ...s.connectionConfig,
            target: state.lastTarget,
            tls: (state.lastTLS as ConnectionConfig['tls']) || 'none',
          },
        }));
      }

      // Restore services if the backend auto-loaded protoset/proto files
      if (state.services?.length) {
        set({
          services: state.services,
          protosetPaths: state.loadedPaths ?? [],
          loadMode: state.loadMode ?? '',
        });
      }
    } catch {
      // Non-fatal — app works fine without restored state
    }
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
    set({
      services: [],
      protosetPaths: [],
      loadMode: '',
      selectedMethod: null,
      requestSchema: [],
      requestJson: '{}',
      streamMessages: [],
    });
  },

  reloadProtos: async () => {
    const services = await api.reloadProtos();
    if (services?.length) set({ services });
  },

  removeProtoPath: async (path) => {
    const services = await api.removeProtoPath(path);
    const { protosetPaths } = get();
    const remaining = protosetPaths.filter((p) => p !== path);
    set({ services: services ?? [], protosetPaths: remaining });
    if ((services ?? []).length === 0) {
      set({ selectedMethod: null, requestSchema: [], requestJson: '{}', streamMessages: [], loadMode: '' });
    }
  },

  // ── Selected method ─────────────────────────────────────────────────────────
  selectedMethod: null,
  selectMethod: (method) => {
    set({ selectedMethod: method, response: null, requestJson: '{}', streamMessages: [], history: [], requestSchema: [] });
    if (method) {
      get().loadRequestSchema(method.fullName).catch(() => {});
    }
  },

  // ── Request schema ──────────────────────────────────────────────────────────
  requestSchema: [],
  loadRequestSchema: async (methodPath) => {
    try {
      const schema = await api.getRequestSchema(methodPath);
      set({ requestSchema: schema ?? [] });
    } catch {
      set({ requestSchema: [] });
    }
  },

  // ── Request ─────────────────────────────────────────────────────────────────
  requestJson: '{}',
  requestMetadata: [],
  timeoutSeconds: 0,
  setRequestJson: (json) => set({ requestJson: json }),
  setRequestMetadata: (md) => set({ requestMetadata: md }),
  setTimeoutSeconds: (t) => set({ timeoutSeconds: t }),

  // ── Unary response ──────────────────────────────────────────────────────────
  response: null,
  isInvoking: false,
  invokeError: null,

  invoke: async () => {
    const { selectedMethod, requestJson, requestMetadata, timeoutSeconds } = get();
    if (!selectedMethod) return;
    set({ isInvoking: true, invokeError: null, response: null, streamMessages: [] });
    try {
      if (selectedMethod.serverStreaming) {
        // Server-streaming: use streaming path via Wails events
        set({ isStreaming: true, isInvoking: false });
        await api.invokeStream({ methodPath: selectedMethod.fullName, requestJson, metadata: requestMetadata, timeoutSeconds });
      } else {
        const resp = await api.invokeUnary({
          methodPath: selectedMethod.fullName,
          requestJson,
          metadata: requestMetadata,
          timeoutSeconds,
        });
        set({ response: resp, isInvoking: false });
      }
    } catch (e: unknown) {
      set({ invokeError: e instanceof Error ? e.message : String(e), isInvoking: false, isStreaming: false });
    }
  },

  // ── Streaming ───────────────────────────────────────────────────────────────
  streamMessages: [],
  isStreaming: false,

  appendStreamEvent: (evt) => {
    if (evt.type === 'trailer') {
      set((s) => ({ streamMessages: [...s.streamMessages, evt], isStreaming: false }));
    } else if (evt.type === 'error') {
      set((s) => ({ streamMessages: [...s.streamMessages, evt], isStreaming: false, invokeError: evt.error ?? null }));
    } else {
      set((s) => ({ streamMessages: [...s.streamMessages, evt] }));
    }
  },

  clearStream: () => set({ streamMessages: [], isStreaming: false }),

  cancelStream: () => {
    api.cancelStream().catch(() => {});
    set({ isStreaming: false });
  },

  // ── Collections ─────────────────────────────────────────────────────────────
  collections: [],

  loadCollections: async () => {
    try {
      const cols = await api.listCollections();
      set({ collections: cols ?? [] });
    } catch {
      set({ collections: [] });
    }
  },

  saveToCollection: async (collectionId, name) => {
    const { selectedMethod, requestJson, requestMetadata, connectionConfig, collections, protosetPaths } = get();
    if (!selectedMethod) return;
    const now = new Date().toISOString();
    const req = {
      id: crypto.randomUUID(),
      name,
      collectionId,
      methodPath: selectedMethod.fullName,
      requestJson,
      metadata: requestMetadata,
      connection: connectionConfig,
      createdAt: now,
      updatedAt: now,
    };
    let col = collections.find((c) => c.id === collectionId);
    if (!col) {
      col = { id: collectionId, name: collectionId, description: '', protosetPaths, requests: [], createdAt: now, updatedAt: now };
    }
    await api.saveCollection({ ...col, requests: [...(col.requests ?? []), req], updatedAt: now });
    await get().loadCollections();
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
    } catch {
      set({ environments: [] });
    }
  },

  saveEnvironment: async (env) => {
    await api.saveEnvironment(env);
    await get().loadEnvironments();
  },

  deleteEnvironment: async (id) => {
    await api.deleteEnvironment(id);
    if (get().activeEnvironmentId === id) {
      await get().setActiveEnvironment('');
    }
    await get().loadEnvironments();
  },

  setActiveEnvironment: async (id) => {
    await api.setActiveEnvironment(id);
    set({ activeEnvironmentId: id });
  },

  // ── History ─────────────────────────────────────────────────────────────────
  history: [],

  loadHistory: async (methodPath) => {
    try {
      const entries = await api.getHistory(methodPath);
      set({ history: entries ?? [] });
    } catch {
      set({ history: [] });
    }
  },

  clearHistory: async (methodPath) => {
    await api.clearHistory(methodPath);
    set({ history: [] });
  },

  restoreFromHistory: (entry) => {
    set({ requestJson: entry.requestJson, requestMetadata: entry.metadata ?? [] });
  },
}));
