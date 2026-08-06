'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Home,
  TrendingUp,
  Users,
  Bookmark,
  Clock,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

// Constants
const NAV_ITEMS = [
  { icon: Home, label: 'For You', href: '/videos' },
  { icon: TrendingUp, label: 'Trending', href: '/videos/trending' },
  { icon: Users, label: 'Following', href: '/videos/following' },
  { icon: Bookmark, label: 'Saved', href: '/videos/saved' },
  { icon: Clock, label: 'History', href: '/videos/history' },
];

const CATEGORIES = [
  { label: 'Beauty', count: 234, value: 'beauty' },
  { label: 'Skincare', count: 189, value: 'skincare' },
  { label: 'Makeup', count: 156, value: 'makeup' },
  { label: 'Haircare', count: 98, value: 'haircare' },
  { label: 'Bodycare', count: 67, value: 'bodycare' },
  { label: 'Perfumes', count: 45, value: 'perfumes' },
];

const TRENDING_CREATORS = [
  { name: 'BeautyByLiha', followers: '89.3K', username: 'beautybyliha' },
  { name: 'GlowWithMia', followers: '45.2K', username: 'glowwithmia' },
  { name: 'SkincareQueen', followers: '32.1K', username: 'skincarequeen' },
];

const POPULAR_HASHTAGS = [
  '#skincare', '#glowingskin', '#beautytips',
  '#makeup', '#selfcare', '#roveiracosmetics',
];

export function LeftSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/videos?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (href: string) => {
    if (href === '/videos') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden lg:block sticky top-6 transition-all duration-300 w-full',
          isCollapsed ? 'w-16' : 'w-full'
        )}
      >
        <div className="rounded-[24px] border border-white/10 bg-[#111114]/85 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl space-y-4 max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1C1C1C]">
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center w-full p-2 text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] rounded-lg transition-all"
          >
            {isCollapsed ? '→' : '←'}
          </button>

          {/* User Profile */}
          {isAuthenticated && user && (
            <Link
              href="/account/profile"
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl bg-[#151515] border border-[rgba(255,255,255,0.05)] hover:border-[#6366F1]/20 transition-all',
                isCollapsed && 'justify-center'
              )}
            >
              <Avatar className="h-10 w-10 ring-2 ring-[rgba(255,255,255,0.05)]">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-[#A3A3A3] truncate">{user.email}</p>
                </div>
              )}
            </Link>
          )}

          {/* Search */}
          {!isCollapsed && (
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
              <Input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#151515] border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#A3A3A3] focus-visible:ring-[#6366F1]"
              />
            </form>
          )}

          {/* Navigation */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                    active
                      ? 'bg-[#FF3B5C]/10 text-[#FF3B5C]'
                      : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]',
                    isCollapsed && 'justify-center'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {!isCollapsed && (
                    <>
                      <span className="text-sm font-medium">{item.label}</span>
                      {active && (
                        <Badge className="ml-auto bg-[#FF3B5C] text-white text-[10px] px-1.5 py-0 h-4">
                          Live
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Categories */}
          {!isCollapsed && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Categories
                </h3>
                <Link
                  href="/videos/categories"
                  className="text-xs text-[#6366F1] hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-1">
                {CATEGORIES.map((category) => (
                  <Link
                    key={category.value}
                    href={`/videos?category=${category.value}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] transition-all duration-200 group"
                  >
                    <span className="text-sm">{category.label}</span>
                    <Badge
                      variant="secondary"
                      className="bg-[#1C1C1C] text-[#A3A3A3] text-[10px] px-1.5 py-0 h-4"
                    >
                      {category.count}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Trending Creators */}
          {!isCollapsed && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
                  Top Creators
                </h3>
                <Link
                  href="/creators"
                  className="text-xs text-[#6366F1] hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-2">
                {TRENDING_CREATORS.map((creator) => (
                  <Link
                    key={creator.username}
                    href={`/creators/${creator.username}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1C1C1C] transition-all duration-200 group"
                  >
                    <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] flex items-center justify-center text-white text-xs font-bold">
                      {creator.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {creator.name}
                      </p>
                      <p className="text-xs text-[#A3A3A3]">
                        {creator.followers} followers
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#6366F1] hover:text-[#FF3B5C] hover:bg-[#FF3B5C]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Popular Hashtags */}
          {!isCollapsed && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] mb-3">
                Popular Hashtags
              </h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_HASHTAGS.map((tag) => (
                  <Link
                    key={tag}
                    href={`/videos?q=${tag.slice(1)}`}
                    className="px-3 py-1 text-xs bg-[#151515] text-[#A3A3A3] rounded-full hover:bg-[#1C1C1C] hover:text-white transition-all duration-200 border border-[rgba(255,255,255,0.05)]"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Toggle Button */}
      <div className="lg:hidden fixed bottom-6 left-6 z-40">
        <Button
          className="h-14 w-14 rounded-full bg-[#FF3B5C] text-white shadow-2xl shadow-[#FF3B5C]/20"
          onClick={() => setIsMobileOpen(true)}
        >
          <Search className="h-6 w-6" />
        </Button>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#0B0B0D]/80 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed inset-y-0 left-0 z-50 w-80 bg-[#0B0B0D] border-r border-[rgba(255,255,255,0.05)] overflow-y-auto lg:hidden"
            >
              <div className="sticky top-0 z-10 bg-[#0B0B0D]/80 backdrop-blur-sm border-b border-[rgba(255,255,255,0.05)] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-lg">Video Shop</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#A3A3A3] hover:text-white"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 space-y-6">
                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
                  <Input
                    type="text"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#151515] border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#A3A3A3]"
                  />
                </form>

                {/* Navigation */}
                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                          active
                            ? 'bg-[#FF3B5C]/10 text-[#FF3B5C]'
                            : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                {/* Categories */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] mb-3">
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {CATEGORIES.map((category) => (
                      <Link
                        key={category.value}
                        href={`/videos?category=${category.value}`}
                        onClick={() => setIsMobileOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] transition-all duration-200"
                      >
                        <span className="text-sm">{category.label}</span>
                        <Badge
                          variant="secondary"
                          className="bg-[#1C1C1C] text-[#A3A3A3] text-[10px] px-1.5 py-0 h-4"
                        >
                          {category.count}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}