import slugify from 'slugify';

// Mirrors backend-services/src/common/utils/slug.util.ts exactly, so what
// the admin sees here is what actually gets saved — the backend is still
// the source of truth (it re-sanitizes and guarantees uniqueness with a
// -2, -3, ... suffix on save), this is just an accurate live preview.
export function previewSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true }).substring(0, 50);
}
