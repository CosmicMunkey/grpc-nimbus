// Type definitions that mirror the Go structs exposed by Wails bindings.

export interface MetadataEntry {
  key: string;
  value: string;
}

export interface ConnectionConfig {
  target: string;
  tls: 'none' | 'system' | 'insecure_skip' | 'custom_ca';
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
}

export interface MethodInfo {
  fullName: string;
  serviceName: string;
  methodName: string;
  clientStreaming: boolean;
  serverStreaming: boolean;
  inputType: string;
  outputType: string;
  requestSchema: string;
}

export interface ServiceInfo {
  name: string;
  methods: MethodInfo[];
}

export interface InvokeRequest {
  methodPath: string;
  requestJson: string;
  metadata: MetadataEntry[];
  timeoutSeconds: number;
}

export interface InvokeResponse {
  responseJson: string;
  status: string;
  statusCode: number;
  statusMessage: string;
  headers: MetadataEntry[];
  trailers: MetadataEntry[];
  durationMs: number;
  streaming?: boolean;
  error?: string;
}

export interface StreamEvent {
  type: 'message' | 'header' | 'trailer' | 'error';
  json?: string;
  metadata?: MetadataEntry[];
  status?: string;
  statusCode?: number;
  error?: string;
}

export interface SavedRequest {
  id: string;
  name: string;
  collectionId: string;
  methodPath: string;
  requestJson: string;
  metadata: MetadataEntry[];
  connection: ConnectionConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  protosetPaths: string[];
  requests: SavedRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  methodPath: string;
  requestJson: string;
  metadata: MetadataEntry[];
  response?: InvokeResponse;
  invokedAt: string;
}
