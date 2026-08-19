import slugify from 'slugify';

const SLUGIFY_OPTIONS = { lower: true, strict: true, trim: true };

/**
 * Turn a name into a clean, URL-safe slug base (lowercase, hyphenated,
 * no special characters). Does not guarantee uniqueness — see
 * generateUniqueSlug for that.
 */
export function generateSlugBase(value: string): string {
  return slugify(value, SLUGIFY_OPTIONS).substring(0, 50);
}

/**
 * Appends -2, -3, ... to a slug base until `isTaken` reports it's free.
 * `isTaken` should check the same scope the caller will actually insert
 * into (e.g. exclude the current row's own id on an update).
 */
export async function generateUniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (await isTaken(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
