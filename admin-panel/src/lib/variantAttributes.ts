// Single source of truth for variant-attribute logic shared between
// VariantManager (editing an existing product's live variants via the API)
// and StagedVariantManager (staging variants in-memory while a product is
// still being created). Both need the exact same canonicalization/
// combination rules — previously each file hand-copied its own identical
// implementation.

export const MANY_COMBINATIONS_WARNING_THRESHOLD = 50;

// Order-independent, case-insensitive canonicalization — mirrors the
// backend's duplicate-combination check (products.service.ts
// canonicalizeVariantAttributes) exactly, so the admin sees the same "this
// combination already exists" verdict before submitting that they'd get
// from the API, instead of finding out only after a round trip.
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

// Cartesian product across every attribute row, deduped within the batch
// (the same value entered twice in one row must not produce two identical
// combinations). Returns [] when no row has both a key and at least one
// value — callers show their own "enter at least one attribute" toast for
// that case, since the toast copy differs slightly between callers.
export function generateAttributeCombinations(
  rows: GeneratorAttributeRow[],
): Record<string, string>[] {
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

// A/E/I/O/U-free short code from an attribute value, used only as a
// human-readable SKU suggestion the admin can still edit before saving —
// never the backend's actual SKU-generation algorithm (see
// products.service.ts generateVariantSku for that).
export function slugifyVariantValue(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'X';
}
