import {
  Smartphone,
  Shirt,
  Home,
  HeartPulse,
  Dumbbell,
  Car,
  BookOpen,
  Blocks,
  MapPin,
  Sprout,
  UtensilsCrossed,
  Package,
  type LucideIcon,
} from 'lucide-react';

// Purely presentational — matched by keyword against the real category
// name, so the icon is a visual aid on top of real category data rather
// than a fabricated field. Anything unmatched falls back to a generic
// package icon.
const CATEGORY_ICON_RULES: { match: RegExp; icon: LucideIcon }[] = [
  { match: /electronic|eletr[oó]nika/i, icon: Smartphone },
  { match: /fashion|cloth|apparel|ropa|moda/i, icon: Shirt },
  { match: /home|living|furniture/i, icon: Home },
  { match: /health|beauty|sa[uú]de|beleza/i, icon: HeartPulse },
  { match: /sport|esporte/i, icon: Dumbbell },
  { match: /auto|vehicle|ve[ií]culu/i, icon: Car },
  { match: /book|station|livru/i, icon: BookOpen },
  { match: /toy|game|brinquedu/i, icon: Blocks },
  { match: /kitchen|hasan/i, icon: UtensilsCrossed },
  { match: /agri|farm/i, icon: Sprout },
  { match: /local/i, icon: MapPin },
];

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICON_RULES.find((entry) => entry.match.test(name))?.icon ?? Package;
}
