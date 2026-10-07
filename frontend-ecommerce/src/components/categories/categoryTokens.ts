/**
 * Design tokens for the Categories redesign (All Categories + Category
 * Detail) — same scoped-hex pattern as productListTokens.ts, reused
 * directly so both screens share one palette with Product List/Cart/Checkout.
 */
export const categoryColors = {
  background: '#F4F6F3',
  surface: '#FFFFFF',
  textPrimary: '#142019',
  textSecondary: '#56635B',
  textBody: '#2A3830',
  brandGreen: '#17703F',
  greenTint: '#E3F1E8',
  greenTintText: '#0F5530',
  orange: '#B4410F',
  orangeTint: '#FDEEE6',
  star: '#C27803',
  border: '#DDE3DE',
  borderLight: '#E4E9E5',
  divider: '#EEF1EE',
} as const;

export interface CategoryColorPair {
  tint: string;
  icon: string;
}

const FALLBACK_PALETTE: CategoryColorPair[] = [
  { tint: '#E3F1E8', icon: '#17703F' },
  { tint: '#E6F0FA', icon: '#1F5FA8' },
  { tint: '#FBE7EF', icon: '#A3214F' },
  { tint: '#FFF4DC', icon: '#9A5B00' },
  { tint: '#F1EAFB', icon: '#6B3FB8' },
  { tint: '#FDEEE6', icon: '#B4410F' },
];

// The API has no color fields on Category — this keyword map mirrors
// getCategoryIcon's matching (same real category names), pairing each with
// the tint/icon-color spec gave by example. Anything unmatched cycles
// through FALLBACK_PALETTE by id, so every category still gets a distinct,
// stable pair rather than all sharing one default.
const CATEGORY_COLOR_RULES: { match: RegExp; pair: CategoryColorPair }[] = [
  { match: /local/i, pair: { tint: '#E8F4EA', icon: '#2E7D32' } },
  { match: /health|beauty|sa[uú]de|beleza/i, pair: { tint: '#FDEEE6', icon: '#B4410F' } },
  { match: /fashion|cloth|apparel|ropa|moda/i, pair: { tint: '#FBE7EF', icon: '#A3214F' } },
  { match: /electronic|eletr[oó]nika/i, pair: { tint: '#E6F0FA', icon: '#1F5FA8' } },
  { match: /food|drink|ai-han|hemu/i, pair: { tint: '#FFF4DC', icon: '#9A5B00' } },
  { match: /auto|vehicle|ve[ií]culu|motor|kareta/i, pair: { tint: '#E3F1E8', icon: '#17703F' } },
  { match: /home|living|furniture|kitchen|kozinha|uma/i, pair: { tint: '#F1EAFB', icon: '#6B3FB8' } },
];

export function getCategoryColorPair(name: string, id: number): CategoryColorPair {
  const matched = CATEGORY_COLOR_RULES.find((entry) => entry.match.test(name));
  if (matched) return matched.pair;
  return FALLBACK_PALETTE[id % FALLBACK_PALETTE.length];
}
