/**
 * Design tokens for the cart redesign — scoped to this screen's own
 * widgets only (plain hex, not the sitewide shadcn --primary token in
 * globals.css). Same pattern as the product detail and checkout token
 * files.
 */
export const cartColors = {
  background: '#F4F6F3',
  surface: '#FFFFFF',
  textPrimary: '#142019',
  textSecondary: '#56635B',
  bodyText: '#2A3830',
  brandGreen: '#17703F',
  greenTint: '#E3F1E8',
  savingsText: '#93330B',
  savingsTint: '#FDEEE6',
  badgeOrange: '#B4410F',
  border: '#DDE3DE',
  divider: '#EEF1EE',
  disabledBg: '#DDE3DE',
  disabledText: '#56635B',
} as const;

export const cartRadius = {
  card: 16,
  image: 12,
  stepper: 12,
  button: 14,
} as const;
