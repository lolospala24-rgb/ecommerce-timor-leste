/**
 * Design tokens for the All Products list/filter redesign — scoped to
 * this screen's own widgets only (plain hex, not the sitewide shadcn
 * --primary token in globals.css). Same pattern as the product detail,
 * checkout, and cart token files.
 */
export const productListColors = {
  background: '#F4F6F3',
  surface: '#FFFFFF',
  textPrimary: '#142019',
  textSecondary: '#56635B',
  brandGreen: '#17703F',
  greenTint: '#E3F1E8',
  greenTintText: '#0F5530',
  orange: '#B4410F',
  border: '#DDE3DE',
  borderLight: '#E4E9E5',
  divider: '#EEF1EE',
  switchOff: '#C9D1CB',
} as const;
