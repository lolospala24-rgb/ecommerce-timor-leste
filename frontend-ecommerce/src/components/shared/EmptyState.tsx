'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Package, Search, FilterX, ShoppingCart, Store } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
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
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        {icon || <Package className="h-10 w-10 text-muted-foreground" />}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mb-6 text-sm text-muted-foreground max-w-md">{description}</p>
      )}
      <div className="flex flex-wrap gap-3 justify-center">
        {action && (
          <Button onClick={action.onClick}>
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Predefined empty states
export function EmptyProductsState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      title="No products found"
      description="Try adjusting your search or filters"
      icon={<Search className="h-10 w-10 text-muted-foreground" />}
    />
  );
}

export function EmptyOrdersState() {
  return (
    <EmptyState
      title="No orders yet"
      description="When you place orders, they will appear here"
      icon={<ShoppingCart className="h-10 w-10 text-muted-foreground" />}
      action={{ label: 'Start Shopping', onClick: () => window.location.href = '/products' }}
    />
  );
}

export function EmptySellersState() {
  return (
    <EmptyState
      title="No sellers found"
      description="Try adjusting your search criteria"
      icon={<Store className="h-10 w-10 text-muted-foreground" />}
    />
  );
}

export function NoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      title={`No results found for "${query}"`}
      description="Try adjusting your search or filter criteria"
      icon={<Search className="h-10 w-10 text-muted-foreground" />}
      action={{ label: 'Clear Search', onClick: onClear, icon: <FilterX className="h-4 w-4" /> }}
    />
  );
}