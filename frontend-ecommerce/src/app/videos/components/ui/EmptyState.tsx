'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import {
  Search,
  Film,
  Users,
  ShoppingBag,
  Heart,
  Bookmark,
  Clock,
  MessageCircle,
} from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconName?: 'search' | 'film' | 'users' | 'shopping' | 'heart' | 'bookmark' | 'clock' | 'message';
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const iconMap = {
  search: Search,
  film: Film,
  users: Users,
  shopping: ShoppingBag,
  heart: Heart,
  bookmark: Bookmark,
  clock: Clock,
  message: MessageCircle,
};

const sizes = {
  sm: {
    icon: 'h-12 w-12',
    title: 'text-lg',
    description: 'text-sm',
  },
  md: {
    icon: 'h-16 w-16',
    title: 'text-2xl',
    description: 'text-base',
  },
  lg: {
    icon: 'h-20 w-20',
    title: 'text-3xl',
    description: 'text-lg',
  },
};

export function EmptyState({
  title,
  description,
  icon,
  iconName,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const IconComponent = iconName ? iconMap[iconName] : null;
  const sizeClasses = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-[#151515] border border-[rgba(255,255,255,0.05)] min-h-[300px]',
        className
      )}
    >
      <div className={cn(
        'rounded-full bg-[#1C1C1C] flex items-center justify-center mb-4',
        size === 'sm' ? 'p-3' : size === 'md' ? 'p-4' : 'p-5'
      )}>
        {icon ? (
          <div className={cn('text-[#A3A3A3]', sizeClasses.icon)}>{icon}</div>
        ) : IconComponent ? (
          <IconComponent className={cn('text-[#A3A3A3]', sizeClasses.icon)} />
        ) : (
          <div className={cn('w-12 h-12 rounded-full bg-[#1C1C1C]')} />
        )}
      </div>

      <h3 className={cn('font-semibold text-white', sizeClasses.title)}>
        {title}
      </h3>

      {description && (
        <p className={cn('mt-2 text-[#A3A3A3] max-w-sm', sizeClasses.description)}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {action && (
            <Button onClick={action.onClick} icon={action.icon}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Predefined empty states
export const EmptySearch = ({ query, onClear }: { query: string; onClear: () => void }) => (
  <EmptyState
    iconName="search"
    title={`No results found for "${query}"`}
    description="Try adjusting your search or filter criteria"
    action={{ label: 'Clear Search', onClick: onClear }}
  />
);

export const EmptyVideos = ({ onAdd }: { onAdd?: () => void }) => (
  <EmptyState
    iconName="film"
    title="No videos yet"
    description="Be the first to upload a video"
    action={onAdd ? { label: 'Upload Video', onClick: onAdd } : undefined}
  />
);

export const EmptyCreators = () => (
  <EmptyState
    iconName="users"
    title="No creators found"
    description="Follow creators to see their content here"
  />
);

export const EmptyCart = ({ onShop }: { onShop: () => void }) => (
  <EmptyState
    iconName="shopping"
    title="Your cart is empty"
    description="Start adding items to your cart"
    action={{ label: 'Start Shopping', onClick: onShop }}
  />
);

export const EmptyWishlist = ({ onShop }: { onShop: () => void }) => (
  <EmptyState
    iconName="heart"
    title="Your wishlist is empty"
    description="Save your favorite items here"
    action={{ label: 'Browse Products', onClick: onShop }}
  />
);

export const EmptySaved = ({ onBrowse }: { onBrowse: () => void }) => (
  <EmptyState
    iconName="bookmark"
    title="No saved videos"
    description="Save videos you want to watch later"
    action={{ label: 'Browse Videos', onClick: onBrowse }}
  />
);

export const EmptyHistory = ({ onBrowse }: { onBrowse: () => void }) => (
  <EmptyState
    iconName="clock"
    title="No watch history"
    description="Videos you watch will appear here"
    action={{ label: 'Browse Videos', onClick: onBrowse }}
  />
);

export const EmptyComments = () => (
  <EmptyState
    iconName="message"
    title="No comments yet"
    description="Be the first to comment on this video"
    size="sm"
  />
);