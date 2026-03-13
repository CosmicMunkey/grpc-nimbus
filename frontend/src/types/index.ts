// Type definitions that mirror the Go structs exposed by Wails bindings.

export interface MetadataEntry {
  key: string;
  value: string;
}

export interface ConnectionConfig {
  target: string;
  tls: 'none' | 'system' | 'insecure_skip';
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
  sourceFile?: string;
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
  headers: { key: string; value: string }[];
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

export interface EnumValue {
  name: string;
  number: number;
}

export interface FieldSchema {
  name: string;
  jsonName: string;
  number: number;
  type: 'string' | 'bytes' | 'bool' | 'int32' | 'int64' | 'uint32' | 'uint64' | 'float' | 'double' | 'enum' | 'message' | 'map';
  isRepeated: boolean;
  isMap: boolean;
  oneofName?: string;
  enumValues?: EnumValue[];
  fields?: FieldSchema[];
  mapKeyType?: string;
  mapValueType?: string;
  mapValueFields?: FieldSchema[];
}

export interface LoadedState {
  services: ServiceInfo[];
  loadedPaths: string[];
  loadMode: 'protoset' | 'proto' | 'reflection' | '';
  lastTarget: string;
  lastTLS: string;
}

// Represents one open request tab — all per-request state is scoped here.
export interface Tab {
  id: string;
  label: string;
  /** ID of the SavedRequest this tab was opened from, or null if unsaved. */
  savedRequestId: string | null;
  /** Display name of the linked SavedRequest (used in tab label + save button). */
  savedRequestName: string | null;
  selectedMethod: MethodInfo | null;
  requestJson: string;
  requestMetadata: MetadataEntry[];
  requestSchema: FieldSchema[];
  response: InvokeResponse | null;
  streamMessages: StreamEvent[];
  isInvoking: boolean;
  isStreaming: boolean;
  invokeError: string | null;
  history: HistoryEntry[];
  timeoutSeconds: number;
}
