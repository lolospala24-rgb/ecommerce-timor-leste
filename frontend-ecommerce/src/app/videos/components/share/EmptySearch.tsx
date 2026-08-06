'use client';

import { EmptyState } from '../ui/EmptyState';

interface EmptySearchProps {
  query: string;
  onClear: () => void;
}

export function EmptySearch({ query, onClear }: EmptySearchProps) {
  return (
    <EmptyState
      iconName="search"
      title={`No results found for "${query}"`}
      description="Try adjusting your search or filter criteria"
      action={{ label: 'Clear Search', onClick: onClear }}
    />
  );
}