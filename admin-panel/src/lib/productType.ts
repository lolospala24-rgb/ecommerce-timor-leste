export interface ProductTypeFieldDefinition {
  key: string;
  label: string;
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
    // The object shape is `{ fieldName: fieldType }` (see
    // buildFieldsPayload — the value is always a type marker like
    // "select", never a human label), so the key is what both the badge
    // key and its display label should be.
    return Object.keys(parsed as Record<string, unknown>).flatMap((key) =>
      splitKey(key).map((k) => ({ key: k, label: k })),
    );
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

export function fieldsToNameList(fields?: unknown): string[] {
  return parseProductTypeFields(fields).map((field) => field.key);
}
