export const VIDEO_CATEGORIES = [
  { label: 'Beauty', value: 'beauty', count: 234 },
  { label: 'Skincare', value: 'skincare', count: 189 },
  { label: 'Makeup', value: 'makeup', count: 156 },
  { label: 'Haircare', value: 'haircare', count: 98 },
  { label: 'Bodycare', value: 'bodycare', count: 67 },
  { label: 'Perfumes', value: 'perfumes', count: 45 },
] as const;

export const TRENDING_CREATORS = [
  { name: 'BeautyByLiha', followers: '89.3K', username: 'beautybyliha' },
  { name: 'GlowWithMia', followers: '45.2K', username: 'glowwithmia' },
  { name: 'SkincareQueen', followers: '32.1K', username: 'skincarequeen' },
] as const;

export const POPULAR_HASHTAGS = [
  '#skincare', '#glowingskin', '#beautytips',
  '#makeup', '#selfcare', '#roveiracosmetics',
] as const;

export const NAV_ITEMS = [
  { icon: 'Home', label: 'For You', href: '/videos' },
  { icon: 'TrendingUp', label: 'Trending', href: '/videos/trending' },
  { icon: 'Users', label: 'Following', href: '/videos/following' },
  { icon: 'Bookmark', label: 'Saved', href: '/videos/saved' },
  { icon: 'Clock', label: 'History', href: '/videos/history' },
] as const;

export const DEFAULT_PAGE_SIZE = 12;
export const FREE_SHIPPING_THRESHOLD = 50;