'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function SearchInput({
  placeholder = 'Search...',
  value: externalValue,
  onChange,
  onSearch,
  onClear,
  isLoading = false,
  debounceMs = 300,
  className,
  autoFocus = false,
  suggestions = [],
  onSuggestionClick,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue || '');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue);
    }
  }, [externalValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onChange && internalValue !== externalValue) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [internalValue, onChange, externalValue, debounceMs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setInternalValue('');
    if (onClear) {
      onClear();
    }
    if (onChange) {
      onChange('');
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(internalValue);
      setIsFocused(false);
    }
    if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInternalValue(suggestion);
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
    if (onSearch) {
      onSearch(suggestion);
    }
    setIsFocused(false);
  };

  const hasValue = internalValue.length > 0;
  const showSuggestions = isFocused && suggestions.length > 0 && hasValue;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={internalValue}
            onChange={(e) => setInternalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            className="pl-9 pr-10"
            autoFocus={autoFocus}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && hasValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {onSearch && (
          <Button
            type="button"
            onClick={() => onSearch(internalValue)}
            className="ml-2"
            disabled={isLoading}
          >
            Search
          </Button>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <Search className="h-3 w-3 text-muted-foreground" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}