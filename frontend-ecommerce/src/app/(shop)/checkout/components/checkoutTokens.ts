/**
 * Design tokens for the checkout redesign — scoped to this flow's own
 * widgets only (plain hex, not the sitewide shadcn --primary token in
 * globals.css). Same pattern as
 * `components/products/detail/productDetailTokens.ts`.
 */
export const checkoutColors = {
  background: '#F4F6F3',
  surface: '#FFFFFF',
  textPrimary: '#142019',
  textSecondary: '#56635B',
  bodyText: '#2A3830',
  brandGreen: '#17703F',
  greenTint: '#E3F1E8',
  greenTintText: '#0F5530',
  savingsBg: '#FDEEE6',
  savingsText: '#93330B',
  border: '#DDE3DE',
  divider: '#EEF1EE',
  inactiveRing: '#C9D1CB',
  dashedBorder: '#9FB5A6',
} as const;

export const checkoutRadius = {
  card: 16,
  input: 14,
  iconTile: 12,
} as const;
