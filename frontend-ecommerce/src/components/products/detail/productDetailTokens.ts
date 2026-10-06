/**
 * Design tokens for the mobile Product Detail redesign — scoped to this
 * screen's own widgets only (plain hex, not the sitewide shadcn --primary
 * token in globals.css, same one-off-hex pattern SearchAiBar.tsx already
 * uses). Do not reuse these outside `components/products/detail/`.
 */
export const productDetailColors = {
  background: '#F4F6F3',
  surface: '#FFFFFF',
  textPrimary: '#142019',
  textSecondary: '#56635B',
  bodyText: '#2A3830',
  brandGreen: '#17703F',
  greenTint: '#E3F1E8',
  discount: '#B4410F',
  star: '#C27803',
  starEmpty: '#D5DBD6',
  border: '#DDE3DE',
  divider: '#EEF1EE',
} as const;

export const productDetailRadius = {
  chip: 999,
  buttonSm: 12,
  card: 16,
  sheet: 28,
} as const;
