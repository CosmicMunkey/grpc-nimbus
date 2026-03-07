import { create } from 'zustand';
import {
  Collection,
  ConnectionConfig,
  InvokeRequest,
  InvokeResponse,
  MetadataEntry,
  MethodInfo,
  ServiceInfo,
} from '../types';

// We call Wails backend via the global `window.go` object injected at runtime.
// Type stubs are declared below so TypeScript is happy during development.
declare global {
  interface Window {
    go: {
      main: {
        App: {
          Connect(cfg: ConnectionConfig): Promise<void>;
          Disconnect(): Promise<void>;
          LoadProtosets(paths: string[]): Promise<ServiceInfo[]>;
          GetServices(): Promise<ServiceInfo[]>;
          InvokeUnary(req: InvokeRequest): Promise<InvokeResponse>;
          ListCollections(): Promise<Collection[]>;
          SaveCollection(col: Collection): Promise<void>;
          DeleteCollection(id: string): Promise<void>;
          GetCollection(id: string): Promise<Collection>;
        };
      };
    };
  }
}

// Convenience wrappers so components don't reach into window.go directly.
export const api = {
  connect: (cfg: ConnectionConfig) => window.go.main.App.Connect(cfg),
  disconnect: () => window.go.main.App.Disconnect(),
  loadProtosets: (paths: string[]) => window.go.main.App.LoadProtosets(paths),
  getServices: () => window.go.main.App.GetServices(),
  invokeUnary: (req: InvokeRequest) => window.go.main.App.InvokeUnary(req),
  listCollections: () => window.go.main.App.ListCollections(),
  saveCollection: (col: Collection) => window.go.main.App.SaveCollection(col),
  deleteCollection: (id: string) => window.go.main.App.DeleteCollection(id),
  getCollection: (id: string) => window.go.main.App.GetCollection(id),
};

// ─── App State ───────────────────────────────────────────────────────────────

interface AppState {
  // Connection
  connectionConfig: ConnectionConfig;
  isConnected: boolean;
  connectionError: string | null;
  setConnectionConfig: (cfg: Partial<ConnectionConfig>) => void;
  connect: () => Promise<void>;
  disconnect: () => void;

  // Protoset / services
  services: ServiceInfo[];
  protosetPaths: string[];
  loadProtosets: (paths: string[]) => Promise<void>;

  // Selected method
  selectedMethod: MethodInfo | null;
  selectMethod: (method: MethodInfo) => void;

  // Request state
  requestJson: string;
  requestMetadata: MetadataEntry[];
  timeoutSeconds: number;
  setRequestJson: (json: string) => void;
  setRequestMetadata: (md: MetadataEntry[]) => void;
  setTimeoutSeconds: (t: number) => void;

  // Response state
  response: InvokeResponse | null;
  isInvoking: boolean;
  invokeError: string | null;
  invoke: () => Promise<void>;

  // Collections
  collections: Collection[];
  loadCollections: () => Promise<void>;
  saveToCollection: (collectionId: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Connection defaults
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
      const msg = e instanceof Error ? e.message : String(e);
      set({ isConnected: false, connectionError: msg });
    }
  },

  disconnect: () => {
    api.disconnect().catch(() => {});
    set({ isConnected: false });
  },

  // Protoset / services
  services: [],
  protosetPaths: [],

  loadProtosets: async (paths) => {
    try {
      const services = await api.loadProtosets(paths);
      set({ services, protosetPaths: paths });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(msg);
    }
  },

  // Selected method
  selectedMethod: null,
  selectMethod: (method) => set({ selectedMethod: method, response: null, requestJson: '{}' }),

  // Request
  requestJson: '{}',
  requestMetadata: [],
  timeoutSeconds: 0,
  setRequestJson: (json) => set({ requestJson: json }),
  setRequestMetadata: (md) => set({ requestMetadata: md }),
  setTimeoutSeconds: (t) => set({ timeoutSeconds: t }),

  // Response
  response: null,
  isInvoking: false,
  invokeError: null,

  invoke: async () => {
    const { selectedMethod, requestJson, requestMetadata, timeoutSeconds } = get();
    if (!selectedMethod) return;
    set({ isInvoking: true, invokeError: null, response: null });
    try {
      const resp = await api.invokeUnary({
        methodPath: selectedMethod.fullName,
        requestJson,
        metadata: requestMetadata,
        timeoutSeconds,
      });
      set({ response: resp, isInvoking: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ invokeError: msg, isInvoking: false });
    }
  },

  // Collections
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
    const { selectedMethod, requestJson, requestMetadata, connectionConfig, collections } = get();
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
      col = {
        id: collectionId,
        name: collectionId,
        description: '',
        protosetPaths: get().protosetPaths,
        requests: [],
        createdAt: now,
        updatedAt: now,
      };
    }
    const updated: Collection = { ...col, requests: [...col.requests, req], updatedAt: now };
    await api.saveCollection(updated);
    await get().loadCollections();
  },

  deleteCollection: async (id) => {
    await api.deleteCollection(id);
    await get().loadCollections();
  },
}));
