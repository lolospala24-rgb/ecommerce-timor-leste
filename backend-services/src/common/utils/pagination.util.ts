/**
 * Parses a `limit` query param into a bounded integer, so an unauthenticated
 * client can't force an expensive query with e.g. `?limit=999999999`
 * (or crash it with a non-numeric value flowing straight into Prisma's
 * `take:`). Mirrors the `@Min(1) @Max(100)` bound already enforced by
 * `FilterProductDto.limit` for the main product-listing endpoint, applied
 * here to the many secondary endpoints that parse `limit` by hand instead
 * of through a validated DTO.
 */
export function clampLimit(raw: string | undefined, defaultValue: number, max = 100): number {
  const parsed = raw ? parseInt(raw, 10) : defaultValue;
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, max);
}
