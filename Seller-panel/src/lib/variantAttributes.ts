// Order-independent, case-insensitive canonicalization — mirrors the
// backend's duplicate-combination check (products.service.ts
// canonicalizeVariantAttributes) exactly, so the seller sees the same
// "this combination already exists" verdict before submitting that
// they'd get from the API.
export function canonicalizeAttributes(attrs: Record<string, string>): string {
  return Object.keys(attrs)
    .filter((k) => k.trim())
    .sort()
    .map((k) => `${k.trim().toLowerCase()}=${String(attrs[k]).trim().toLowerCase()}`)
    .join('|');
}

export function formatAttributesLabel(attrs: Record<string, string> | undefined | null): string {
  if (!attrs) return '';
  return Object.values(attrs).filter(Boolean).join(' / ');
}

export interface GeneratorAttributeRow {
  key: string;
  valuesInput: string;
}

// Cartesian product across every attribute row, deduped within the batch.
export function generateAttributeCombinations(rows: GeneratorAttributeRow[]): Record<string, string>[] {
  const validRows = rows
    .map((row) => ({
      key: row.key.trim(),
      values: Array.from(
        new Set(
          row.valuesInput
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ),
    }))
    .filter((row) => row.key && row.values.length > 0);

  if (validRows.length === 0) return [];

  let combinations: Record<string, string>[] = [{}];
  for (const row of validRows) {
    const next: Record<string, string>[] = [];
    for (const existing of combinations) {
      for (const value of row.values) {
        next.push({ ...existing, [row.key]: value });
      }
    }
    combinations = next;
  }

  const seenInBatch = new Set<string>();
  return combinations.filter((combo) => {
    const canonical = canonicalizeAttributes(combo);
    if (seenInBatch.has(canonical)) return false;
    seenInBatch.add(canonical);
    return true;
  });
}

export function slugifyVariantValue(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'X';
}
