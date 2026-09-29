import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  Store,
  Sparkles,
  Megaphone,
  LayoutGrid,
  Zap,
  Clock,
  Headset,
  ClipboardList,
  ShoppingBag,
  ShoppingCart,
  Truck,
} from 'lucide-react';

// Mirrors QUICK_MENU_ICON_KEYS in backend-services'
// modules/quick-menu/quick-menu.constants.ts — the fixed, curated set of
// Lolospala icons an admin can pick for a Quick Menu item's iconKey (never
// arbitrary internet icons). Keep the two lists in sync: this is the only
// place a key needs a component to actually render.
export interface QuickMenuIconDefinition {
  key: string;
  label: string;
  icon: LucideIcon;
  // Opacity-based background (not solid bg-{color}-100) so each tile still
  // reads correctly in dark mode without a separate dark: override —
  // same convention QuickMenu.tsx's tiles already used before this became
  // data-driven.
  color: string;
}

export const QUICK_MENU_ICON_LIBRARY: QuickMenuIconDefinition[] = [
  { key: 'all-products', label: 'All Products', icon: Boxes, color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  { key: 'local-products', label: 'Local Products', icon: Store, color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  { key: 'promotions', label: 'Promotions', icon: Sparkles, color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400' },
  { key: 'become-seller', label: 'Become a Seller', icon: Megaphone, color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  { key: 'categories', label: 'Categories', icon: LayoutGrid, color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  { key: 'flash-sale', label: 'Flash Sale', icon: Zap, color: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  { key: 'new-arrivals', label: 'New Arrivals', icon: Clock, color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400' },
  { key: 'support', label: 'Support', icon: Headset, color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400' },
  { key: 'orders', label: 'Orders', icon: ClipboardList, color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  { key: 'seller', label: 'Seller', icon: Store, color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' },
  { key: 'marketplace', label: 'Marketplace', icon: ShoppingBag, color: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400' },
  { key: 'shopping', label: 'Shopping', icon: ShoppingCart, color: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  { key: 'delivery', label: 'Delivery', icon: Truck, color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
];

const ICON_BY_KEY = new Map(QUICK_MENU_ICON_LIBRARY.map((def) => [def.key, def]));

// Falls back to the first library entry (all-products) rather than
// rendering nothing — a Quick Menu item should never silently disappear
// just because of an unrecognized/stale iconKey.
export function getQuickMenuIconDefinition(iconKey: string | null | undefined): QuickMenuIconDefinition {
  return (iconKey && ICON_BY_KEY.get(iconKey)) || QUICK_MENU_ICON_LIBRARY[0];
}
