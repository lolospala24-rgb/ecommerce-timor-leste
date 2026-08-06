'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp, Film, Users, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface SearchBoxProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

interface SearchSuggestion {
  id: string;
  type: 'video' | 'creator' | 'product' | 'category';
  title: string;
  subtitle?: string;
  image?: string;
}

const fallbackTrendingSearches = [
  { id: '1', query: 'beauty tips' },
  { id: '2', query: 'haircare' },
  { id: '3', query: 'selfcare' },
];

export function SearchBox({ className, placeholder = 'Search videos, creators, products...', onSearch }: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recent, setRecent] = useState<{ id: string; query: string }[]>([]);
  const [trendingSearches, setTrendingSearches] = useState(fallbackTrendingSearches);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const response = await api.get('/search/trending?limit=5');
        const items = response?.data || [];
        setTrendingSearches(items.map((item: any, index: number) => ({ id: item.id || `${index}`, query: item.query || item.name || item.title })));
      } catch {
        setTrendingSearches(fallbackTrendingSearches);
      }
    };

    loadTrending();
  }, []);

  const fetchSuggestions = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/search/suggestions?q=${encodeURIComponent(query)}&limit=5`);
      const items = response?.data || [];
      setSuggestions(items.map((item: any, index: number) => ({
        id: item.id || `${index}`,
        type: item.type || 'video',
        title: item.title || item.name || item.query || query,
        subtitle: item.subtitle || item.description || item.meta,
      })));
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    onSearch?.(searchQuery);
    router.push(`/videos/search?q=${encodeURIComponent(searchQuery)}`);
    setIsOpen(false);
    setQuery('');
    // Add to recent searches
    setRecent((prev) => [{ id: Date.now().toString(), query: searchQuery }, ...prev.slice(0, 4)]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const getIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'video':
        return <Film className="h-4 w-4" />;
      case 'creator':
        return <Users className="h-4 w-4" />;
      case 'product':
        return <ShoppingBag className="h-4 w-4" />;
      case 'category':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'video':
        return 'text-[#FF3B5C]';
      case 'creator':
        return 'text-[#6366F1]';
      case 'product':
        return 'text-emerald-400';
      case 'category':
        return 'text-amber-400';
      default:
        return 'text-[#A3A3A3]';
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 bg-[#151515] border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#A3A3A3] focus-visible:ring-[#6366F1]"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Dropdown */}
      <AnimatePresence>
        {isOpen && (query.length >= 2 || recent.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#151515] rounded-xl border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-hidden z-50"
          >
            <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1C1C1C]">
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs text-[#A3A3A3] border-b border-[rgba(255,255,255,0.05)]">
                    Suggestions
                  </div>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSearch(suggestion.title)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1C1C1C] transition-colors text-left group"
                    >
                      <div className={cn('flex-shrink-0', getIconColor(suggestion.type))}>
                        {getIcon(suggestion.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white group-hover:text-[#6366F1] transition-colors truncate">
                          {suggestion.title}
                        </p>
                        {suggestion.subtitle && (
                          <p className="text-xs text-[#A3A3A3] truncate">
                            {suggestion.subtitle}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-[#A3A3A3]">
                        {suggestion.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Searches */}
              {query.length < 2 && recent.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs text-[#A3A3A3] border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                    <span>Recent Searches</span>
                    <button
                      onClick={() => setRecent([])}
                      className="text-xs text-[#A3A3A3] hover:text-white transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  {recent.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSearch(item.query)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1C1C1C] transition-colors text-left group"
                    >
                      <Clock className="h-4 w-4 text-[#A3A3A3] flex-shrink-0" />
                      <span className="text-sm text-white group-hover:text-[#6366F1] transition-colors">
                        {item.query}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Trending */}
              {query.length < 2 && (
                <div>
                  <div className="px-4 py-2 text-xs text-[#A3A3A3] border-t border-[rgba(255,255,255,0.05)]">
                    Trending Now
                  </div>
                  {trendingSearches.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSearch(item.query)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1C1C1C] transition-colors text-left group"
                    >
                      <TrendingUp className="h-4 w-4 text-[#FF3B5C] flex-shrink-0" />
                      <span className="text-sm text-white group-hover:text-[#6366F1] transition-colors">
                        {item.query}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}