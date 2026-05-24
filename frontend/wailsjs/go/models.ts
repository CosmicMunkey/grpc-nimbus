export namespace logger {
	
	export class Entry {
	    level: number;
	    timestamp: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new Entry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.level = source["level"];
	        this.timestamp = source["timestamp"];
	        this.message = source["message"];
	    }
	}

}

export namespace main {
	
	export class CustomThemeEntry {
	    id: string;
	    name: string;
	    tokens: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new CustomThemeEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.tokens = source["tokens"];
	    }
	}
	export class LoadedState {
	    services: rpc.ServiceInfo[];
	    loadedPaths: string[];
	    loadedProtosets: string[];
	    loadedProtoFiles: string[];
	    loadMode: string;
	    protoImportPaths: string[];
	    lastTarget: string;
	    lastTLS: string;
	    activeEnvironmentId: string;
	
	    static createFrom(source: any = {}) {
	        return new LoadedState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.services = this.convertValues(source["services"], rpc.ServiceInfo);
	        this.loadedPaths = source["loadedPaths"];
	        this.loadedProtosets = source["loadedProtosets"];
	        this.loadedProtoFiles = source["loadedProtoFiles"];
	        this.loadMode = source["loadMode"];
	        this.protoImportPaths = source["protoImportPaths"];
	        this.lastTarget = source["lastTarget"];
	        this.lastTLS = source["lastTLS"];
	        this.activeEnvironmentId = source["activeEnvironmentId"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UserSettings {
	    confirmDeletes: boolean;
	    timestampInputLocal: boolean;
	    confirmClearHistory: boolean;
	    themeBadge: string;
	    theme: string;
	    customThemes: CustomThemeEntry[];
	    activeCustomThemeId: string;
	    fontSize: number;
	    responseWordWrap: boolean;
	    responseIndent: number;
	    emitDefaults: boolean;
	    envSortByCreated: boolean;
	    sidebarWidth: number;
	    panelSplit: number;
	    defaultTimeoutSeconds: number;
	    historyLimit: number;
	    autoConnectOnStartup: boolean;
	    allowShellCommands: boolean;
	    inheritShellEnv: boolean;
	    maxStreamMessages: number;
	    defaultMetadata: rpc.MetadataEntry[];
	    showDebugIndicator: boolean;
	    windowWidth: number;
	    windowHeight: number;
	    windowX: number;
	    windowY: number;
	
	    static createFrom(source: any = {}) {
	        return new UserSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.confirmDeletes = source["confirmDeletes"];
	        this.timestampInputLocal = source["timestampInputLocal"];
	        this.confirmClearHistory = source["confirmClearHistory"];
	        this.themeBadge = source["themeBadge"];
	        this.theme = source["theme"];
	        this.customThemes = this.convertValues(source["customThemes"], CustomThemeEntry);
	        this.activeCustomThemeId = source["activeCustomThemeId"];
	        this.fontSize = source["fontSize"];
	        this.responseWordWrap = source["responseWordWrap"];
	        this.responseIndent = source["responseIndent"];
	        this.emitDefaults = source["emitDefaults"];
	        this.envSortByCreated = source["envSortByCreated"];
	        this.sidebarWidth = source["sidebarWidth"];
	        this.panelSplit = source["panelSplit"];
	        this.defaultTimeoutSeconds = source["defaultTimeoutSeconds"];
	        this.historyLimit = source["historyLimit"];
	        this.autoConnectOnStartup = source["autoConnectOnStartup"];
	        this.allowShellCommands = source["allowShellCommands"];
	        this.inheritShellEnv = source["inheritShellEnv"];
	        this.maxStreamMessages = source["maxStreamMessages"];
	        this.defaultMetadata = this.convertValues(source["defaultMetadata"], rpc.MetadataEntry);
	        this.showDebugIndicator = source["showDebugIndicator"];
	        this.windowWidth = source["windowWidth"];
	        this.windowHeight = source["windowHeight"];
	        this.windowX = source["windowX"];
	        this.windowY = source["windowY"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace rpc {
	
	export class ConnectionConfig {
	    target: string;
	    tls: string;
	    clientCert: string;
	    clientKey: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.target = source["target"];
	        this.tls = source["tls"];
	        this.clientCert = source["clientCert"];
	        this.clientKey = source["clientKey"];
	    }
	}
	export class EnumValue {
	    name: string;
	    number: number;
	
	    static createFrom(source: any = {}) {
	        return new EnumValue(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.number = source["number"];
	    }
	}
	export class FieldSchema {
	    name: string;
	    jsonName: string;
	    number: number;
	    type: string;
	    isRepeated: boolean;
	    isMap: boolean;
	    oneofName?: string;
	    enumValues?: EnumValue[];
	    fields?: FieldSchema[];
	    mapKeyType?: string;
	    mapValueType?: string;
	    mapValueFields?: FieldSchema[];
	
	    static createFrom(source: any = {}) {
	        return new FieldSchema(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.jsonName = source["jsonName"];
	        this.number = source["number"];
	        this.type = source["type"];
	        this.isRepeated = source["isRepeated"];
	        this.isMap = source["isMap"];
	        this.oneofName = source["oneofName"];
	        this.enumValues = this.convertValues(source["enumValues"], EnumValue);
	        this.fields = this.convertValues(source["fields"], FieldSchema);
	        this.mapKeyType = source["mapKeyType"];
	        this.mapValueType = source["mapValueType"];
	        this.mapValueFields = this.convertValues(source["mapValueFields"], FieldSchema);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MetadataEntry {
	    key: string;
	    value: string;
	
	    static createFrom(source: any = {}) {
	        return new MetadataEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	    }
	}
	export class InvokeRequest {
	    methodPath: string;
	    requestJson: string;
	    metadata: MetadataEntry[];
	    timeoutSeconds: number;
	    emitDefaults: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InvokeRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.methodPath = source["methodPath"];
	        this.requestJson = source["requestJson"];
	        this.metadata = this.convertValues(source["metadata"], MetadataEntry);
	        this.timeoutSeconds = source["timeoutSeconds"];
	        this.emitDefaults = source["emitDefaults"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class InvokeResponse {
	    responseJson: string;
	    status: string;
	    statusCode: number;
	    statusMessage: string;
	    headers: MetadataEntry[];
	    trailers: MetadataEntry[];
	    durationMs: number;
	    error?: string;
	    streaming?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InvokeResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.responseJson = source["responseJson"];
	        this.status = source["status"];
	        this.statusCode = source["statusCode"];
	        this.statusMessage = source["statusMessage"];
	        this.headers = this.convertValues(source["headers"], MetadataEntry);
	        this.trailers = this.convertValues(source["trailers"], MetadataEntry);
	        this.durationMs = source["durationMs"];
	        this.error = source["error"];
	        this.streaming = source["streaming"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class MethodInfo {
	    fullName: string;
	    serviceName: string;
	    methodName: string;
	    clientStreaming: boolean;
	    serverStreaming: boolean;
	    inputType: string;
	    outputType: string;
	    requestSchema: string;
	
	    static createFrom(source: any = {}) {
	        return new MethodInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.fullName = source["fullName"];
	        this.serviceName = source["serviceName"];
	        this.methodName = source["methodName"];
	        this.clientStreaming = source["clientStreaming"];
	        this.serverStreaming = source["serverStreaming"];
	        this.inputType = source["inputType"];
	        this.outputType = source["outputType"];
	        this.requestSchema = source["requestSchema"];
	    }
	}
	export class ServiceInfo {
	    name: string;
	    methods: MethodInfo[];
	    sourceFile?: string;
	    unresolvable?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ServiceInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.methods = this.convertValues(source["methods"], MethodInfo);
	        this.sourceFile = source["sourceFile"];
	        this.unresolvable = source["unresolvable"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace storage {
	
	export class SavedRequest {
	    id: string;
	    name: string;
	    collectionId: string;
	    methodPath: string;
	    requestJson: string;
	    metadata: rpc.MetadataEntry[];
	    connection: rpc.ConnectionConfig;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new SavedRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.collectionId = source["collectionId"];
	        this.methodPath = source["methodPath"];
	        this.requestJson = source["requestJson"];
	        this.metadata = this.convertValues(source["metadata"], rpc.MetadataEntry);
	        this.connection = this.convertValues(source["connection"], rpc.ConnectionConfig);
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Collection {
	    id: string;
	    name: string;
	    description: string;
	    protosetPaths: string[];
	    protoFilePaths?: string[];
	    protoImportPaths?: string[];
	    requests: SavedRequest[];
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Collection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.protosetPaths = source["protosetPaths"];
	        this.protoFilePaths = source["protoFilePaths"];
	        this.protoImportPaths = source["protoImportPaths"];
	        this.requests = this.convertValues(source["requests"], SavedRequest);
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EnvHeader {
	    key: string;
	    value: string;
	
	    static createFrom(source: any = {}) {
	        return new EnvHeader(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	    }
	}
	export class Environment {
	    id: string;
	    name: string;
	    target?: string;
	    tls?: string;
	    headers?: EnvHeader[];
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Environment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.target = source["target"];
	        this.tls = source["tls"];
	        this.headers = this.convertValues(source["headers"], EnvHeader);
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HistoryEntry {
	    id: string;
	    methodPath: string;
	    requestJson: string;
	    metadata: rpc.MetadataEntry[];
	    response?: rpc.InvokeResponse;
	    invokedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new HistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.methodPath = source["methodPath"];
	        this.requestJson = source["requestJson"];
	        this.metadata = this.convertValues(source["metadata"], rpc.MetadataEntry);
	        this.response = this.convertValues(source["response"], rpc.InvokeResponse);
	        this.invokedAt = source["invokedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

