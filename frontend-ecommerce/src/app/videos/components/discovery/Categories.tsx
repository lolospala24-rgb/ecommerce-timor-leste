'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useVideos } from '@/hooks/useVideos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  Film,
  Palette,
  Droplets,
  Scissors,
  SprayCan,
  Gem,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  count: number;
  color: string;
  gradient: string;
}

const categories: Category[] = [
  {
    id: 'beauty',
    name: 'Beauty',
    icon: Sparkles,
    count: 234,
    color: 'text-pink-400',
    gradient: 'from-pink-500/20 to-purple-500/20',
  },
  {
    id: 'skincare',
    name: 'Skincare',
    icon: Droplets,
    count: 189,
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: 'makeup',
    name: 'Makeup',
    icon: Palette,
    count: 156,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-orange-500/20',
  },
  {
    id: 'haircare',
    name: 'Haircare',
    icon: Scissors,
    count: 98,
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-yellow-500/20',
  },
  {
    id: 'bodycare',
    name: 'Bodycare',
    icon: SprayCan,
    count: 67,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    id: 'perfumes',
    name: 'Perfumes',
    icon: Gem,
    count: 45,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-indigo-500/20',
  },
  {
    id: 'wellness',
    name: 'Wellness',
    icon: Heart,
    count: 78,
    color: 'text-red-400',
    gradient: 'from-red-500/20 to-pink-500/20',
  },
];

interface CategoriesProps {
  className?: string;
  showAll?: boolean;
  onCategorySelect?: (categoryId: string) => void;
}

export function Categories({ className, showAll = false, onCategorySelect }: CategoriesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    onCategorySelect?.(categoryId);
  };

  const displayCategories = showAll ? categories : categories.slice(0, 6);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
          Categories
        </h3>
        {!showAll && (
          <Link
            href="/videos/categories"
            className="text-xs text-[#6366F1] hover:underline flex items-center gap-0.5"
          >
            View All
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {displayCategories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCategoryClick(category.id)}
            className={cn(
              'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              selectedCategory === category.id
                ? 'bg-[#6366F1]/20 text-white border border-[#6366F1]/30'
                : 'bg-[#151515] text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C] border border-[rgba(255,255,255,0.05)]'
            )}
          >
            <div className={cn('flex-shrink-0', category.color)}>
              <category.icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium flex-1 text-left">{category.name}</span>
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px]',
                selectedCategory === category.id
                  ? 'bg-[#6366F1]/20 text-[#6366F1]'
                  : 'bg-[#1C1C1C] text-[#A3A3A3]'
              )}
            >
              {category.count}
            </Badge>

            {/* Hover gradient background */}
            <div
              className={cn(
                'absolute inset-0 rounded-lg bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
                category.gradient
              )}
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}