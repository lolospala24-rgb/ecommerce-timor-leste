'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface AiSearchFilters {
  keywords: string;
  category: string | null;
  categoryId: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  brand: string | null;
}

interface SearchAiBarProps {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}

const PLACEHOLDER = 'Laptop ida ba programming, RAM 16GB, budget $700';

export function SearchAiBar({ className, autoFocus, onNavigate }: SearchAiBarProps) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const runSearch = async () => {
    const query = value.trim();
    if (!query || isSearching) return;

    setIsSearching(true);

    // Default to a plain keyword search — if the AI parse fails (or AI
    // search isn't configured on the server) the bar still works.
    let params = new URLSearchParams({ q: query });

    try {
      const response = await api.get('/search/ai', { params: { q: query } });
      const filters: AiSearchFilters | undefined = response.data?.filters;

      if (filters) {
        const parsed = new URLSearchParams();
        parsed.set('q', filters.keywords || query);
        parsed.set('aiQuery', query);
        if (filters.categoryId) parsed.set('category', String(filters.categoryId));
        if (filters.minPrice != null) parsed.set('minPrice', String(filters.minPrice));
        if (filters.maxPrice != null) parsed.set('maxPrice', String(filters.maxPrice));
        params = parsed;
      }
    } catch {
      // AI search unavailable — fall back to the plain query built above.
    }

    router.push(`/search?${params.toString()}`);
    setIsSearching(false);
    setValue('');
    onNavigate?.();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runSearch();
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative flex items-center', className)}>
      <div className="relative flex w-full items-center rounded-full border border-input bg-muted/50 pr-1 transition-colors focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
        <Sparkles className="pointer-events-none absolute left-3.5 h-4 w-4 shrink-0 text-amber-500" />
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={PLACEHOLDER}
          autoFocus={autoFocus}
          disabled={isSearching}
          className="h-10 w-full flex-1 truncate bg-transparent pl-9 pr-2 text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSearching || !value.trim()}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-3.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSearching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Search AI</span>
        </button>
      </div>
    </form>
  );
}
