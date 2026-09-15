import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
  total?: number;
}

export function PaginationControls({ page, totalPages, hasNext, hasPrev, onPageChange, total }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t pt-3">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
        {typeof total === 'number' && ` — ${total} total`}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
