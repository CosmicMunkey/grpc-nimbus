import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { FieldSchema } from '../../types';
import { useAppStore } from '../../store/appStore';

// ─── Form value types ────────────────────────────────────────────────────────

export type FormVal = Record<string, unknown>;

function isNumericType(t: string) {
  return ['int32', 'int64', 'uint32', 'uint64', 'float', 'double'].includes(t);
}

function defaultFor(schema: FieldSchema): unknown {
  if (schema.isMap) return {};
  if (schema.isRepeated) return [];
  switch (schema.type) {
    case 'bool':   return false;
    case 'bytes':
    case 'string': return '';
    case 'int32': case 'int64': case 'uint32': case 'uint64':
    case 'float':  case 'double': return 0;
    case 'enum':   return schema.enumValues?.[0]?.name ?? '';
    case 'message': return null; // null = absent / not set
    case 'map':    return {};
    default:       return '';
  }
}

function initForm(fields: FieldSchema[], parsed: FormVal = {}): FormVal {
  const v: FormVal = {};
  for (const f of fields) {
    const pv = parsed[f.jsonName];
    if (pv !== undefined) {
      v[f.jsonName] = pv;
    } else {
      v[f.jsonName] = defaultFor(f);
    }
  }
  return v;
}

// Serialize form value to JSON, omitting null values (absent fields)
function serialize(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (Array.isArray(v)) {
    return v.map(serialize).filter(x => x !== undefined);
  }
  if (typeof v === 'object') {
    const out: FormVal = {};
    for (const [k, val] of Object.entries(v as FormVal)) {
      const s = serialize(val);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return v;
}

export function toJson(form: FormVal): string {
  const cleaned = serialize(form) as FormVal | undefined;
  if (!cleaned || Object.keys(cleaned).length === 0) return '{}';
  return JSON.stringify(cleaned, null, 2);
}

export function fromJson(json: string): FormVal {
  try {
    const v = JSON.parse(json);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as FormVal;
  } catch { /* ignore */ }
  return {};
}

// ─── Type badge ──────────────────────────────────────────────────────────────

function TypeBadge({ schema }: { schema: FieldSchema }) {
  let label: string;
  let cls: string;
  if (schema.isMap) {
    label = `map<${schema.mapKeyType ?? '?'},${schema.mapValueType ?? '?'}>`;
    cls = 'text-cyan-400 bg-cyan-900/20';
  } else if (schema.isRepeated) {
    label = `[]${schema.type}`;
    cls = 'text-blue-300 bg-blue-900/20';
  } else {
    label = schema.type;
    cls = ({
      string:  'text-sky-400 bg-sky-900/20',
      bytes:   'text-yellow-400 bg-yellow-900/20',
      bool:    'text-green-400 bg-green-900/20',
      int32:   'text-violet-400 bg-violet-900/20',
      int64:   'text-violet-400 bg-violet-900/20',
      uint32:  'text-violet-400 bg-violet-900/20',
      uint64:  'text-violet-400 bg-violet-900/20',
      float:   'text-fuchsia-400 bg-fuchsia-900/20',
      double:  'text-fuchsia-400 bg-fuchsia-900/20',
      enum:    'text-orange-400 bg-orange-900/20',
      message: 'text-slate-400 bg-slate-800/40',
      map:     'text-cyan-400 bg-cyan-900/20',
    } as Record<string, string>)[schema.type] ?? 'text-slate-400 bg-slate-800/40';
  }
  return (
    <span className={`shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}

// ─── Scalar editors ──────────────────────────────────────────────────────────

const inputCls = 'flex-1 min-w-0 bg-[#0d1117] border border-[#2d3748] rounded px-2 py-0.5 text-xs text-[#e2e8f0] placeholder-[#4a5568] outline-none focus:border-[#e94560] font-mono';

function StringEditor({ value, onChange }: { value: unknown; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      className={inputCls}
      placeholder='""'
    />
  );
}

function BytesEditor({ value, onChange }: { value: unknown; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      className={inputCls}
      placeholder="base64"
    />
  );
}

function NumberEditor({ value, onChange, type }: { value: unknown; onChange: (v: number) => void; type: string }) {
  const isFloat = type === 'float' || type === 'double';
  const num = typeof value === 'number' ? value : 0;
  return (
    <input
      type="number"
      step={isFloat ? 'any' : '1'}
      value={num}
      onChange={e => {
        const n = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        onChange(isNaN(n) ? 0 : n);
      }}
      className={inputCls}
    />
  );
}

function BoolEditor({ value, onChange }: { value: unknown; onChange: (v: boolean) => void }) {
  const checked = value === true;
  return (
    <div className="flex items-center gap-2">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-[#e94560]' : 'bg-[#2d3748]'
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-xs text-[#94a3b8]">{checked ? 'true' : 'false'}</span>
    </div>
  );
}

function EnumEditor({ schema, value, onChange }: { schema: FieldSchema; value: unknown; onChange: (v: string) => void }) {
  const current = typeof value === 'string' ? value : (schema.enumValues?.[0]?.name ?? '');
  return (
    <select
      value={current}
      onChange={e => onChange(e.target.value)}
      className="flex-1 min-w-0 bg-[#0d1117] border border-[#2d3748] rounded px-2 py-0.5 text-xs text-[#e2e8f0] outline-none focus:border-[#e94560]"
    >
      {(schema.enumValues ?? []).map(ev => (
        <option key={ev.name} value={ev.name}>{ev.name} ({ev.number})</option>
      ))}
    </select>
  );
}

// ─── Message editor (nested, recursive) ──────────────────────────────────────

interface MessageEditorProps {
  fields: FieldSchema[];
  value: FormVal;
  onChange: (v: FormVal) => void;
  depth?: number;
}

function MessageEditor({ fields, value, onChange, depth = 0 }: MessageEditorProps) {
  if (!fields || fields.length === 0) {
    return (
      <textarea
        value={typeof value === 'object' ? JSON.stringify(value, null, 2) : '{}'}
        onChange={e => { try { onChange(JSON.parse(e.target.value)); } catch { /* ignore */ } }}
        rows={3}
        className="w-full bg-[#0d1117] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-[#e2e8f0] outline-none focus:border-[#e94560] resize-none"
        placeholder="{}"
      />
    );
  }

  // Group oneof fields
  const oneofGroups: Record<string, FieldSchema[]> = {};
  const regularFields: FieldSchema[] = [];
  for (const f of fields) {
    if (f.oneofName) {
      (oneofGroups[f.oneofName] ??= []).push(f);
    } else {
      regularFields.push(f);
    }
  }

  const handleChange = (jsonName: string, newVal: unknown) => {
    onChange({ ...value, [jsonName]: newVal });
  };

  const handleOneofChange = (groupName: string, chosenField: FieldSchema, newVal: unknown) => {
    const group = oneofGroups[groupName];
    const updates: FormVal = {};
    for (const f of group) {
      updates[f.jsonName] = f.jsonName === chosenField.jsonName ? newVal : null;
    }
    onChange({ ...value, ...updates });
  };

  // Which oneof names we've already rendered (to avoid duplication)
  const renderedOneofs = new Set<string>();

  const allToRender = [...regularFields];
  for (const f of fields) {
    if (f.oneofName && !renderedOneofs.has(f.oneofName)) {
      renderedOneofs.add(f.oneofName);
      allToRender.push({ ...f, _oneofGroup: f.oneofName } as FieldSchema & { _oneofGroup: string });
    }
  }

  return (
    <div className="space-y-1">
      {regularFields.map(f => (
        <FieldRow
          key={f.jsonName}
          schema={f}
          value={value[f.jsonName]}
          onChange={(v) => handleChange(f.jsonName, v)}
          depth={depth}
        />
      ))}
      {Object.entries(oneofGroups).map(([groupName, groupFields]) => (
        <OneofGroup
          key={groupName}
          name={groupName}
          fields={groupFields}
          value={value}
          onChange={(updates) => onChange({ ...value, ...updates })}
          depth={depth}
        />
      ))}
    </div>
  );
}

// ─── Oneof group ─────────────────────────────────────────────────────────────

function OneofGroup({
  name, fields, value, onChange, depth,
}: {
  name: string;
  fields: FieldSchema[];
  value: FormVal;
  onChange: (updates: FormVal) => void;
  depth: number;
}) {
  // Figure out which field (if any) is currently set
  const activeField = fields.find(f => value[f.jsonName] !== null && value[f.jsonName] !== undefined);
  const [selected, setSelected] = useState<string>(activeField?.jsonName ?? fields[0]?.jsonName ?? '');

  const handleSelect = (jsonName: string) => {
    setSelected(jsonName);
    const updates: FormVal = {};
    for (const f of fields) {
      updates[f.jsonName] = f.jsonName === jsonName ? defaultFor(f) : null;
    }
    onChange(updates);
  };

  const selectedField = fields.find(f => f.jsonName === selected);

  return (
    <div className="border border-[#2d3748] rounded overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-0.5 bg-[#1a1a2e] text-[10px] text-[#94a3b8]">
        <span className="text-[#4a5568] font-medium">oneof</span>
        <span className="text-[#e94560]">{name}</span>
        <select
          value={selected}
          onChange={e => handleSelect(e.target.value)}
          className="ml-auto bg-[#0d1117] border border-[#2d3748] rounded px-1 py-px text-[10px] text-[#e2e8f0] outline-none focus:border-[#e94560]"
        >
          {fields.map(f => (
            <option key={f.jsonName} value={f.jsonName}>{f.name}</option>
          ))}
        </select>
      </div>
      {selectedField && (
        <div className="p-2">
          <FieldRow
            schema={selectedField}
            value={value[selectedField.jsonName]}
            onChange={(v) => {
              const updates: FormVal = {};
              for (const f of fields) {
                updates[f.jsonName] = f.jsonName === selectedField.jsonName ? v : null;
              }
              onChange(updates);
            }}
            depth={depth}
            hideLabel
          />
        </div>
      )}
    </div>
  );
}

// ─── Repeated editor ─────────────────────────────────────────────────────────

function RepeatedEditor({
  schema, value, onChange, depth,
}: {
  schema: FieldSchema;
  value: unknown[];
  onChange: (v: unknown[]) => void;
  depth: number;
}) {
  const elementSchema: FieldSchema = { ...schema, isRepeated: false };
  const addItem = () => onChange([...value, defaultFor(elementSchema)]);
  const removeItem = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const updateItem = (i: number, v: unknown) => onChange(value.map((item, idx) => idx === i ? v : item));

  return (
    <div className="w-full space-y-1">
      {value.map((item, i) => (
        <div key={i} className="flex items-start gap-1">
          <span className="text-[10px] text-[#4a5568] font-mono mt-1 w-5 shrink-0 text-right">{i}</span>
          <div className="flex-1 min-w-0">
            <FieldEditor
              schema={elementSchema}
              value={item}
              onChange={v => updateItem(i, v)}
              depth={depth}
            />
          </div>
          <button
            onClick={() => removeItem(i)}
            className="shrink-0 mt-0.5 text-[#4a5568] hover:text-[#e94560] p-0.5 rounded"
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#e2e8f0] px-1.5 py-0.5 rounded hover:bg-[#1e2132]"
      >
        <Plus size={10} /> Add item
      </button>
    </div>
  );
}

// ─── Map editor ──────────────────────────────────────────────────────────────

function MapEditor({
  schema, value, onChange, depth,
}: {
  schema: FieldSchema;
  value: FormVal;
  onChange: (v: FormVal) => void;
  depth: number;
}) {
  const entries = Object.entries(value);

  const valueSchema: FieldSchema = {
    name: 'value',
    jsonName: 'value',
    number: 0,
    type: (schema.mapValueType ?? 'string') as FieldSchema['type'],
    isRepeated: false,
    isMap: false,
    fields: schema.mapValueFields,
    enumValues: schema.enumValues,
  };

  const addEntry = () => {
    const key = `key${entries.length + 1}`;
    onChange({ ...value, [key]: defaultFor(valueSchema) });
  };

  const removeEntry = (key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: _, ...rest } = value;
    onChange(rest);
  };

  const updateKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [oldKey]: val, ...rest } = value;
    onChange({ ...rest, [newKey]: val });
  };

  const updateValue = (key: string, val: unknown) => onChange({ ...value, [key]: val });

  return (
    <div className="w-full space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-start gap-1">
          <input
            value={k}
            onChange={e => updateKey(k, e.target.value)}
            className="w-24 bg-[#0d1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs font-mono text-[#e94560] placeholder-[#4a5568] outline-none focus:border-[#e94560]"
            placeholder="key"
          />
          <span className="text-[#4a5568] text-xs mt-0.5">→</span>
          <div className="flex-1 min-w-0">
            <FieldEditor
              schema={valueSchema}
              value={v}
              onChange={nv => updateValue(k, nv)}
              depth={depth}
            />
          </div>
          <button
            onClick={() => removeEntry(k)}
            className="shrink-0 mt-0.5 text-[#4a5568] hover:text-[#e94560] p-0.5 rounded"
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <button
        onClick={addEntry}
        className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#e2e8f0] px-1.5 py-0.5 rounded hover:bg-[#1e2132]"
      >
        <Plus size={10} /> Add entry
      </button>
    </div>
  );
}

// ─── Inline message editor ────────────────────────────────────────────────────

function InlineMessageEditor({
  schema, value, onChange, depth,
}: {
  schema: FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  depth: number;
}) {
  const isIncluded = value !== null && value !== undefined;
  const [expanded, setExpanded] = useState(isIncluded);

  const include = () => {
    const defaults = initForm(schema.fields ?? [], {});
    onChange(defaults);
    setExpanded(true);
  };

  const exclude = () => {
    onChange(null);
    setExpanded(false);
  };

  if (!isIncluded) {
    return (
      <button
        onClick={include}
        className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#e2e8f0] px-2 py-0.5 rounded border border-dashed border-[#2d3748] hover:border-[#4a5568]"
      >
        <Plus size={10} /> Set
      </button>
    );
  }

  const nested = (typeof value === 'object' && !Array.isArray(value) && value !== null)
    ? value as FormVal
    : {};

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-0.5 text-[#94a3b8] hover:text-[#e2e8f0]"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="text-xs text-[#4a5568]">{expanded ? 'collapse' : 'expand'}</span>
        </button>
        <button
          onClick={exclude}
          className="ml-auto text-[#4a5568] hover:text-[#e94560] p-0.5 rounded"
          title="Remove field"
        >
          <X size={11} />
        </button>
      </div>
      {expanded && (
        <div className="mt-1 pl-3 border-l-2 border-[#2d3748]">
          <MessageEditor
            fields={schema.fields ?? []}
            value={nested}
            onChange={v => onChange(v)}
            depth={depth + 1}
          />
        </div>
      )}
    </div>
  );
}

// ─── Field editor ─────────────────────────────────────────────────────────────

interface FieldEditorProps {
  schema: FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  depth: number;
}

function FieldEditor({ schema, value, onChange, depth }: FieldEditorProps) {
  if (schema.isMap) {
    const mapVal = (typeof value === 'object' && !Array.isArray(value) && value !== null)
      ? value as FormVal : {};
    return <MapEditor schema={schema} value={mapVal} onChange={onChange} depth={depth} />;
  }

  if (schema.isRepeated) {
    const arr = Array.isArray(value) ? value : [];
    return <RepeatedEditor schema={schema} value={arr} onChange={onChange} depth={depth} />;
  }

  switch (schema.type) {
    case 'string':  return <StringEditor  value={value} onChange={onChange as (v: string) => void} />;
    case 'bytes':   return <BytesEditor   value={value} onChange={onChange as (v: string) => void} />;
    case 'bool':    return <BoolEditor    value={value} onChange={onChange as (v: boolean) => void} />;
    case 'int32': case 'int64': case 'uint32': case 'uint64': case 'float': case 'double':
      return <NumberEditor value={value} type={schema.type} onChange={onChange as (v: number) => void} />;
    case 'enum':
      return <EnumEditor schema={schema} value={value} onChange={onChange as (v: string) => void} />;
    case 'message':
      return <InlineMessageEditor schema={schema} value={value} onChange={onChange} depth={depth} />;
    default:
      return <StringEditor value={value} onChange={onChange as (v: string) => void} />;
  }
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({
  schema, value, onChange, depth, hideLabel,
}: {
  schema: FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  depth: number;
  hideLabel?: boolean;
}) {
  const isComplex = schema.type === 'message' || schema.isRepeated || schema.isMap;

  if (isComplex) {
    return (
      <div className="py-0.5">
        {!hideLabel && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-mono text-[#e2e8f0]">{schema.name}</span>
            <TypeBadge schema={schema} />
            {schema.oneofName && (
              <span className="text-[9px] text-[#4a5568]">oneof:{schema.oneofName}</span>
            )}
          </div>
        )}
        <div className={hideLabel ? '' : 'pl-2'}>
          <FieldEditor schema={schema} value={value} onChange={onChange} depth={depth} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-0.5 min-h-[28px]">
      {!hideLabel && (
        <div className="flex items-center gap-1.5 w-40 shrink-0">
          <span className="text-xs font-mono text-[#e2e8f0] truncate">{schema.name}</span>
          <TypeBadge schema={schema} />
        </div>
      )}
      <FieldEditor schema={schema} value={value} onChange={onChange} depth={depth} />
    </div>
  );
}

// ─── Main FormBuilder component ───────────────────────────────────────────────

export default function FormBuilder() {
  const { requestSchema, requestJson, setRequestJson } = useAppStore();

  const [formValue, setFormValue] = useState<FormVal>({});
  const lastFormJson = useRef<string>('{}');

  // Re-initialize when schema changes (method switch)
  useEffect(() => {
    if (requestSchema.length === 0) {
      setFormValue({});
      lastFormJson.current = '{}';
      return;
    }
    const parsed = fromJson(requestJson);
    const init = initForm(requestSchema, parsed);
    setFormValue(init);
    const json = toJson(init);
    lastFormJson.current = json;
    if (json !== requestJson) setRequestJson(json);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSchema]);

  // Sync form → requestJson whenever formValue changes
  useEffect(() => {
    const json = toJson(formValue);
    if (json === lastFormJson.current) return;
    lastFormJson.current = json;
    setRequestJson(json);
  }, [formValue, setRequestJson]);

  // Sync requestJson → form if it changed from outside (e.g. user edited JSON tab)
  useEffect(() => {
    if (requestJson === lastFormJson.current) return;
    const parsed = fromJson(requestJson);
    const merged = initForm(requestSchema, parsed);
    lastFormJson.current = requestJson;
    setFormValue(merged);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestJson]);

  const handleFieldChange = useCallback((jsonName: string, newVal: unknown) => {
    setFormValue(prev => ({ ...prev, [jsonName]: newVal }));
  }, []);

  if (requestSchema.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#4a5568] text-xs select-none">
        No schema available — load a protoset first
      </div>
    );
  }

  // Group top-level oneof fields
  const oneofGroups: Record<string, FieldSchema[]> = {};
  const regularFields: FieldSchema[] = [];
  for (const f of requestSchema) {
    if (f.oneofName) {
      (oneofGroups[f.oneofName] ??= []).push(f);
    } else {
      regularFields.push(f);
    }
  }

  return (
    <div className="p-3 space-y-1 overflow-y-auto h-full">
      {regularFields.map(f => (
        <FieldRow
          key={f.jsonName}
          schema={f}
          value={formValue[f.jsonName]}
          onChange={v => handleFieldChange(f.jsonName, v)}
          depth={0}
        />
      ))}
      {Object.entries(oneofGroups).map(([groupName, groupFields]) => (
        <OneofGroup
          key={groupName}
          name={groupName}
          fields={groupFields}
          value={formValue}
          onChange={updates => setFormValue(prev => ({ ...prev, ...updates }))}
          depth={0}
        />
      ))}
    </div>
  );
}
