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

  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => {
        if (typeof entry === 'string' && entry.trim()) {
          return { key: entry.trim(), label: entry.trim() };
        }
        if (entry && typeof entry === 'object') {
          const item = entry as Record<string, unknown>;
          const key = String(item.key ?? item.name ?? item.label ?? '').trim();
          if (!key) return null;
          const label = String(item.label ?? item.name ?? key).trim();
          return { key, label };
        }
        return null;
      })
      .filter((entry): entry is ProductTypeFieldDefinition => entry !== null);
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => ({
      key,
      label: String(value ?? key),
    }));
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
