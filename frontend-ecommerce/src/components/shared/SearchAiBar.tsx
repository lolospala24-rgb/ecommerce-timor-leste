'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Search, Sparkles, Clock, TrendingUp, Layers, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

interface AiSearchFilters {
  keywords: string;
  category: string | null;
  categoryId: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  brand: string | null;
}

interface ProductSuggestion {
  type: 'product';
  id: number;
  name: string;
  nameTetum: string | null;
  image: string | null;
  price: number;
  slug: string;
}

interface CategorySuggestion {
  type: 'category';
  id: number;
  name: string;
  nameTetum: string | null;
  slug: string;
}

interface SellerSuggestion {
  type: 'seller';
  id: number;
  name: string;
  image: string | null;
}

interface AutocompleteResponse {
  products: ProductSuggestion[];
  categories: CategorySuggestion[];
  sellers: SellerSuggestion[];
}

interface SearchAiBarProps {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}

const PLACEHOLDER = 'Laptop ida ba programming, RAM 16GB, budget $700';
const AUTOCOMPLETE_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function unwrap<T>(response: any, fallback: T): T {
  return response?.data?.data ?? response?.data ?? fallback;
}

export function SearchAiBar({ className, autoFocus, onNavigate }: SearchAiBarProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [value, setValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<AutocompleteResponse | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedValue = value.trim();
  const showAutocomplete = trimmedValue.length >= MIN_QUERY_LENGTH;

  // Close on outside click / Escape — a suggestions dropdown that only
  // closes on blur is annoying to use with a mouse (clicking a suggestion
  // fires blur before the click registers), so this listens on the whole
  // document instead and checks whether the click landed inside.
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  // Recent (per-user) + trending searches — fetched once per focus, shown
  // only while the box is empty. Recent is skipped entirely for guests
  // rather than firing a request that the backend can't personalize
  // without a logged-in userId.
  const loadEmptyStateSuggestions = async () => {
    const requests: Promise<void>[] = [
      api
        .get('/search/trending', { params: { limit: 6 } })
        .then((res) => setTrendingSearches(unwrap<{ term: string }[]>(res, []).map((t) => t.term)))
        .catch(() => setTrendingSearches([])),
    ];
    if (isAuthenticated) {
      requests.push(
        api
          .get('/search/recent', { params: { limit: 5 } })
          .then((res) => setRecentSearches(unwrap<{ term: string }[]>(res, []).map((t) => t.term)))
          .catch(() => setRecentSearches([])),
      );
    } else {
      setRecentSearches([]);
    }
    await Promise.all(requests);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!showAutocomplete) void loadEmptyStateSuggestions();
  };

  // Debounced live autocomplete while typing — waits for a pause in typing
  // instead of firing a request on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!showAutocomplete) {
      setSuggestions(null);
      setIsLoadingSuggestions(false);
      return;
    }
    setIsLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/search/autocomplete', { params: { q: trimmedValue, limit: 5 } });
        setSuggestions(unwrap<AutocompleteResponse>(res, { products: [], categories: [], sellers: [] }));
      } catch {
        setSuggestions({ products: [], categories: [], sellers: [] });
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedValue, showAutocomplete]);

  const saveToRecent = (term: string) => {
    if (!isAuthenticated || !term.trim()) return;
    void api.post('/search/recent/save', { query: term.trim() }).catch(() => {});
  };

  const goToSearchPage = (query: string, extraParams?: Record<string, string>) => {
    const params = new URLSearchParams({ q: query, ...extraParams });
    router.push(`/search?${params.toString()}`);
    saveToRecent(query);
    setValue('');
    setIsOpen(false);
    onNavigate?.();
  };

  const runAiSearch = async () => {
    const query = trimmedValue;
    if (!query || isSearching) return;

    setIsSearching(true);
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
      // AI search unavailable (or, in local dev, not configured — the
      // shared axios retry interceptor also retries every 5xx up to 3x
      // with backoff before this rejects) — fall back to the plain query
      // built above either way.
    }

    router.push(`/search?${params.toString()}`);
    saveToRecent(query);
    setIsSearching(false);
    setValue('');
    setIsOpen(false);
    onNavigate?.();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runAiSearch();
  };

  const handleClearRecent = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setRecentSearches([]);
    try {
      await api.delete('/search/recent/clear');
    } catch {
      // Best-effort — the list is already cleared client-side either way.
    }
  };

  const hasEmptyStateContent = recentSearches.length > 0 || trendingSearches.length > 0;
  const hasSuggestionResults = useMemo(
    () =>
      !!suggestions &&
      (suggestions.products.length > 0 || suggestions.categories.length > 0 || suggestions.sellers.length > 0),
    [suggestions],
  );

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="relative flex w-full items-center rounded-full border border-input bg-muted/50 pr-1 transition-colors focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
          <Sparkles className="pointer-events-none absolute left-3.5 h-4 w-4 shrink-0 text-amber-500" />
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={handleFocus}
            placeholder={PLACEHOLDER}
            autoFocus={autoFocus}
            disabled={isSearching}
            autoComplete="off"
            className="h-10 w-full flex-1 truncate bg-transparent pl-9 pr-2 text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isSearching || !trimmedValue}
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

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border bg-popover p-2 text-popover-foreground shadow-lg" data-lenis-prevent>
          {!showAutocomplete ? (
            hasEmptyStateContent ? (
              <div className="space-y-3 p-1">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between px-2">
                      <span className="text-xs font-semibold text-muted-foreground">Recent Searches</span>
                      <button
                        type="button"
                        onClick={handleClearRecent}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-2">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => goToSearchPage(term)}
                          className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted/70"
                        >
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {trendingSearches.length > 0 && (
                  <div>
                    <div className="mb-1.5 px-2">
                      <span className="text-xs font-semibold text-muted-foreground">Trending</span>
                    </div>
                    <ul>
                      {trendingSearches.map((term, index) => (
                        <li key={term}>
                          <button
                            type="button"
                            onClick={() => goToSearchPage(term)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                          >
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                            <span className="truncate">{term}</span>
                            <span className="ml-auto text-xs text-muted-foreground">#{index + 1}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Start typing to search products, categories, or sellers.
              </p>
            )
          ) : isLoadingSuggestions ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : hasSuggestionResults ? (
            <div className="space-y-2">
              {suggestions!.products.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Products</p>
                  {suggestions!.products.map((product) => (
                    <button
                      key={`product-${product.id}`}
                      type="button"
                      onClick={() => {
                        router.push(`/products/${product.slug}`);
                        saveToRecent(trimmedValue);
                        setValue('');
                        setIsOpen(false);
                        onNavigate?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {product.image && (
                          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="40px" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-primary">${product.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}

              {suggestions!.categories.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Categories</p>
                  {suggestions!.categories.map((category) => (
                    <button
                      key={`category-${category.id}`}
                      type="button"
                      onClick={() => {
                        router.push(`/categories/${category.slug}`);
                        setValue('');
                        setIsOpen(false);
                        onNavigate?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{category.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {suggestions!.sellers.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Sellers</p>
                  {suggestions!.sellers.map((seller) => (
                    <button
                      key={`seller-${seller.id}`}
                      type="button"
                      onClick={() => {
                        router.push(`/sellers/${seller.id}`);
                        setValue('');
                        setIsOpen(false);
                        onNavigate?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{seller.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => void runAiSearch()}
                className="flex w-full items-center gap-2 rounded-lg border-t px-2 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-muted"
              >
                <Search className="h-4 w-4" />
                Search &quot;{trimmedValue}&quot; with AI
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No quick matches for &quot;{trimmedValue}&quot;.
              </p>
              <button
                type="button"
                onClick={() => void runAiSearch()}
                className="flex w-full items-center gap-2 rounded-lg border-t px-2 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-muted"
              >
                <Search className="h-4 w-4" />
                Search &quot;{trimmedValue}&quot; with AI anyway
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
