'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowRight, Sparkles, Package } from 'lucide-react';

interface EmptyCartProps {
  title?: string;
  description?: string;
  showSuggestions?: boolean;
}

export function EmptyCart({ 
  title = 'Your cart is empty',
  description = 'Looks like you haven\'t added any items to your cart yet.',
  showSuggestions = true,
}: EmptyCartProps) {
  const suggestions = [
    { label: 'New Arrivals', href: '/products?sort=newest' },
    { label: 'Best Sellers', href: '/products?sort=popularity' },
    { label: 'On Sale', href: '/products?sort=price_asc' },
    { label: 'Top Rated', href: '/products?sort=rating' },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Icon */}
      <div className="relative">
        <div className="rounded-full bg-muted p-6">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/50" />
        </div>
        <div className="absolute -top-2 -right-2 rounded-full bg-primary/10 p-1">
          <Package className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Title & Description */}
      <h2 className="mt-6 text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-muted-foreground max-w-md">
        {description}
      </p>

      {/* CTA Button */}
      <Button className="mt-6" size="lg" asChild>
        <Link href="/products">
          Start Shopping
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="mt-8 w-full max-w-md">
          <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground mb-3">
            <Sparkles className="h-4 w-4" />
            <span>Popular categories</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.href}
                href={suggestion.href}
                className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                {suggestion.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 text-sm text-muted-foreground">
        <p>Need help? </p>
        <Link href="/contact" className="text-primary hover:underline">
          Contact our support team
        </Link>
      </div>
    </div>
  );
}