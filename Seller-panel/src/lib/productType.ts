export interface ProductTypeFieldDefinition {
  key: string;
  label: string;
}

// A ProductType's `fields`/`specFields` is stored as `{ fieldName: "select" }`
// — the key is the real field name, the value is always the literal type
// marker "select" (admin-panel's buildFieldsPayload never writes anything
// else). Mirrors admin-panel/src/lib/productType.ts exactly so both apps
// agree on the same contract.
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

  // Same comma-confusion bug as variant attributes (see VariantManager's
  // openEdit): an admin typing "Brand,Material,Warranty" into one field-name
  // box produces a single literal key instead of three. Splitting here
  // turns that into three separate suggested chips instead of one garbled
  // one — read-only for display, doesn't touch the stored ProductType.
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
          // A multi-name key never has a meaningful single label to split
          // in parallel — fall back to using each name as its own label.
          return keys.length > 1 ? keys.map((k) => ({ key: k, label: k })) : [{ key: rawKey, label: rawLabel }];
        }
        return [];
      })
      .filter((entry): entry is ProductTypeFieldDefinition => Boolean(entry));
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return Object.keys(parsed as Record<string, unknown>).flatMap((key) =>
      splitKey(key).map((k) => ({ key: k, label: k })),
    );
  }

  return [];
}
