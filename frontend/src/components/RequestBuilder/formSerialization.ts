import { FieldSchema } from '../../types';

export type FormVal = Record<string, unknown>;

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

function serializeFieldMask(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const trimmed = v.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  const paths = fieldMaskPathsFromValue(v);

  if (paths.length === 0) return undefined;
  return paths.join(',');
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
