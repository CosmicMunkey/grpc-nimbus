import { FieldSchema } from '../../types';

export type FormVal = Record<string, unknown>;

// Walk the form value tree and collect all populated field paths for field masks.
// Emits only the populated leaf paths (or top-level repeated/map paths).
// Per AIP-134, paths use the snake_case proto field name (f.name), NOT the camelCase
// JSON property name (f.jsonName). Form values are still accessed via f.jsonName.
// Skips fields at their default proto3 values (e.g. false, 0, default enum) unless includeDefaults is true.
export function collectPopulatedPaths(
  formValue: Record<string, unknown>,
  fields: FieldSchema[],
  prefix = '',
  visited = new Set<string>(),
  includeDefaults = false,
): string[] {
  const paths: string[] = [];
  for (const f of fields) {
    if (f.isFieldMask) continue;
    const val = formValue[f.jsonName]; // form values are keyed by camelCase jsonName
    if (val === null || val === undefined) continue;

    const isFilled = (() => {
      if (f.isRepeated) return Array.isArray(val) && val.length > 0;
      if (f.isMap) return typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0;

      if (includeDefaults) {
        return typeof val === 'string' ? val !== ''
          : Array.isArray(val) ? val.length > 0
          : typeof val === 'object' && !Array.isArray(val) ? Object.keys(val).length > 0
          : true;
      }

      switch (f.type) {
        case 'bool':
          return val === true;
        case 'string':
        case 'bytes':
          return val !== '';
        case 'int32':
        case 'int64':
        case 'uint32':
        case 'uint64':
        case 'float':
        case 'double':
          return val !== 0 && val !== '0';
        case 'enum': {
          const defaultEnum = f.enumValues?.[0]?.name;
          return val !== '' && val !== defaultEnum;
        }
        case 'message':
          return typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0;
        default:
          return true;
      }
    })();

    if (!isFilled) continue;
    // AIP-134: FieldMask paths must use the snake_case proto field name, not the camelCase JSON name.
    const path = prefix ? `${prefix}.${f.name}` : f.name;
    if (f.type === 'message' && f.fields && val && typeof val === 'object' && !Array.isArray(val) && !visited.has(path)) {
      visited.add(path);
      paths.push(...collectPopulatedPaths(val as Record<string, unknown>, f.fields, path, visited, includeDefaults));
    } else {
      paths.push(path);
    }
  }
  return [...new Set(paths)];
}


export function fieldMaskPathsFromValue(v: unknown): string[] {
  if (typeof v === 'string') {
    return v.split(',').map(path => path.trim()).filter(Boolean);
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return [];

  return Array.isArray((v as FormVal).paths)
    ? ((v as FormVal).paths as unknown[])
      .filter((path): path is string => typeof path === 'string')
      .map(path => path.trim())
      .filter(Boolean)
    : [];
}

function serializeValue(v: unknown, fields?: FieldSchema[]): unknown {
  if (v === null || v === undefined) return undefined;
  if (Array.isArray(v)) {
    return v.map(item => serializeValue(item)).filter(item => item !== undefined);
  }
  if (typeof v === 'object') {
    const obj = v as FormVal;

    if (fields) {
      const out: FormVal = {};
      for (const field of fields) {
        const raw = obj[field.jsonName];
        const serialized = field.isFieldMask
          ? serializeFieldMask(raw)
          : serializeValue(raw, field.type === 'message' ? field.fields : undefined);
        if (serialized !== undefined) out[field.jsonName] = serialized;
      }
      return out;
    }

    const out: FormVal = {};
    for (const [k, val] of Object.entries(obj)) {
      const serialized = serializeValue(val);
      if (serialized !== undefined) out[k] = serialized;
    }
    return out;
  }
  return v;
}

// serializeFieldMask converts the editor's internal { paths: string[] } value
// into the JSON object format that grpcurl's jsonpb decoder expects.
// grpcurl uses github.com/golang/protobuf/jsonpb which does NOT implement the
// protobuf JSON FieldMask spec (comma-separated string); instead it treats
// FieldMask as a plain message and requires { "paths": ["field1", "field2"] }.
function serializeFieldMask(v: unknown): { paths: string[] } | undefined {
  const paths = fieldMaskPathsFromValue(v);
  return paths.length === 0 ? undefined : { paths };
}

export function toJson(form: FormVal, fields?: FieldSchema[]): string {
  const cleaned = serializeValue(form, fields) as FormVal | undefined;
  if (!cleaned || Object.keys(cleaned).length === 0) return '{}';
  return JSON.stringify(cleaned, null, 2);
}

export function fromJson(json: string): FormVal {
  try {
    const v = JSON.parse(json);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as FormVal;
  } catch {
    // ignore invalid JSON and fall back to an empty form
  }
  return {};
}
