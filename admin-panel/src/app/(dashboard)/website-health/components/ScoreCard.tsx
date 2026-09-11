'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type ScoreRating = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' | null;

// Thresholds mirror backend ScoreCalculatorService.ratingForScore exactly
// — this is purely a display label for a score the server already rated,
// never a second scoring computation.
export function ratingForScore(score: number | null): ScoreRating {
  if (score === null) return null;
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 50) return 'NEEDS_IMPROVEMENT';
  return 'POOR';
}

export const RATING_LABEL: Record<NonNullable<ScoreRating>, string> = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  POOR: 'Poor',
};

export const RATING_COLOR: Record<NonNullable<ScoreRating>, { text: string; bg: string; ring: string }> = {
  EXCELLENT: { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  GOOD: { text: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  NEEDS_IMPROVEMENT: { text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  POOR: { text: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200' },
};

interface ScoreCardProps {
  label: string;
  score: number | null;
  icon?: LucideIcon;
  size?: 'lg' | 'md';
  subtitle?: string;
}

export function ScoreCard({ label, score, icon: Icon, size = 'md', subtitle }: ScoreCardProps) {
  const rating = ratingForScore(score);
  const colors = rating ? RATING_COLOR[rating] : { text: 'text-muted-foreground', bg: 'bg-muted', ring: 'ring-border' };

  return (
    <Card className={cn('overflow-hidden', size === 'lg' && 'text-center')}>
      <CardContent className={cn('p-5', size === 'lg' && 'py-8')}>
        <div className={cn('flex items-center gap-2 text-sm font-medium text-muted-foreground', size === 'lg' && 'justify-center')}>
          {Icon && <Icon className="h-4 w-4" />}
          {label}
        </div>
        <div
          className={cn(
            'mt-2 font-bold tabular-nums',
            colors.text,
            size === 'lg' ? 'text-6xl' : 'text-4xl',
          )}
        >
          {score === null ? '—' : Math.round(score)}
          {score !== null && <span className="text-lg font-medium text-muted-foreground">/100</span>}
        </div>
        {rating && (
          <span
            className={cn(
              'mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
              colors.bg,
              colors.text,
              colors.ring,
            )}
          >
            {RATING_LABEL[rating]}
          </span>
        )}
        {subtitle && <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
