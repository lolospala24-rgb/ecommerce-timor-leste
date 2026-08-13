'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { maskAccountNumber } from '@/lib/utils';

// Bank account numbers default to masked (last 4 digits only) — an admin
// scanning a list of payouts doesn't need the full number, only the one
// they're actually about to wire needs revealing.
export function MaskedAccountNumber({ value, className }: { value: string | null | undefined; className?: string }) {
  const [revealed, setRevealed] = useState(false);
  if (!value) return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className || ''}`}>
      {revealed ? value : maskAccountNumber(value)}
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="text-muted-foreground hover:text-foreground"
        aria-label={revealed ? 'Hide account number' : 'Show account number'}
      >
        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </span>
  );
}
