// The fixed, curated set of Lolospala icon keys an admin can pick from when
// iconType = LIBRARY (never arbitrary internet icons). This list is the
// validation source of truth (see CreateQuickMenuItemDto's @IsIn) — the
// actual icon components live frontend-side (lib/quickMenuIcons.ts, Lucide
// icons already used consistently across the whole app), since a backend
// service has no business rendering React components.
export const QUICK_MENU_ICON_KEYS = [
  'all-products',
  'local-products',
  'promotions',
  'become-seller',
  'categories',
  'flash-sale',
  'new-arrivals',
  'support',
  'orders',
  'seller',
  'marketplace',
  'shopping',
  'delivery',
] as const;

export type QuickMenuIconKey = (typeof QUICK_MENU_ICON_KEYS)[number];
