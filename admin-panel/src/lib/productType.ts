export interface ProductTypeFieldDefinition {
  key: string;
  label: string;
  /** Suggested option values for this field (e.g. Size -> ["S","M","L"]),
   *  set via VariantFieldsEditor. Undefined/empty for fields with no
   *  suggestions defined yet — never enforced, purely a pre-fill aid for
   *  Generate Variants and the Add Variant form. */
  values?: string[];
}

export function parseProductTypeFields(value: unknown): ProductTypeFieldDefinition[] {
  if (!value) return [];

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  // A field-name input can end up with a comma-joined value like
  // "Brand,Material,Warranty" (typed as one name instead of using "+ Add
  // field" three times — confirmed live on a real ProductType). Splitting
  // here turns that into three separate suggested chips wherever this is
  // consumed (ProductSpecifications, the seller apps' variant/spec
  // pickers) instead of one garbled one.
  const splitKey = (key: string) => key.split(',').map((k) => k.trim()).filter(Boolean);

  if (Array.isArray(parsed)) {
    return parsed
      .flatMap((entry) => {
        if (typeof entry === 'string' && entry.trim()) {
          return splitKey(entry).map((k) => ({ key: k, label: k }));
        }
        if (entry && typeof entry === 'object') {
          const item = entry as Record<string, unknown>;
          const rawKey = String(item.key ?? item.name ?? item.label ?? '').trim();
          if (!rawKey) return [];
          const rawLabel = String(item.label ?? item.name ?? rawKey).trim();
          const keys = splitKey(rawKey);
          return keys.length > 1 ? keys.map((k) => ({ key: k, label: k })) : [{ key: rawKey, label: rawLabel }];
        }
        return [];
      })
      .filter((entry): entry is ProductTypeFieldDefinition => Boolean(entry));
  }

  if (typeof parsed === 'object' && parsed !== null) {
    // The object shape's value is either the plain old type-marker string
    // ("select", never a human label — see buildFieldsPayload) or, once a
    // field has suggested values attached (see buildVariantFieldsPayload),
    // `{ type: "select", values: string[] }`. Either way the key is what
    // both the badge key and its display label should be.
    return Object.entries(parsed as Record<string, unknown>).flatMap(([key, fieldValue]) => {
      const values =
        fieldValue && typeof fieldValue === 'object' && Array.isArray((fieldValue as any).values)
          ? (fieldValue as any).values.map((v: unknown) => String(v).trim()).filter(Boolean)
          : undefined;
      return splitKey(key).map((k) => ({ key: k, label: k, ...(values && values.length > 0 ? { values } : {}) }));
    });
  }

  return [];
}

export function buildFieldsPayload(fieldNames: string[]): Record<string, string> {
  return fieldNames.reduce<Record<string, string>>((acc, name) => {
    const trimmed = name.trim();
    if (trimmed) acc[trimmed] = 'select';
    return acc;
  }, {});
}

export interface VariantFieldRow {
  key: string;
  /** Comma-separated, matches the same input convention already used by
   *  the Generate Variants dialog (GeneratorAttributeRow.valuesInput). */
  valuesInput: string;
}

// Only fields with at least one suggested value get the richer
// `{type, values}` shape — a field with none stays the plain "select"
// string, so a Product Type that never uses this feature round-trips
// through save/reload byte-identical to before.
export function buildVariantFieldsPayload(rows: VariantFieldRow[]): Record<string, unknown> {
  return rows.reduce<Record<string, unknown>>((acc, row) => {
    const trimmedKey = row.key.trim();
    if (!trimmedKey) return acc;
    const values = Array.from(
      new Set(
        row.valuesInput
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    );
    acc[trimmedKey] = values.length > 0 ? { type: 'select', values } : 'select';
    return acc;
  }, {});
}

export function fieldsToNameList(fields?: unknown): string[] {
  return parseProductTypeFields(fields).map((field) => field.key);
}
