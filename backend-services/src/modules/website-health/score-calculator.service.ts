import { Injectable } from '@nestjs/common';

// Bumped only when the formula/thresholds below actually change — stored
// on every WebsiteAudit row so a historical report keeps showing exactly
// what it showed when generated, even after a later version changes how
// scores are computed (spec §41/§42).
export const SCORE_VERSION = '1.0';

export interface CategoryWeights {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  security: number;
}

export type ScoreRating = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';

// Configurable per spec §32 — these are the defaults, but
// WebsiteHealthSettings can override them (not built as a separate table
// column in this phase since no admin-facing need for it surfaced yet
// beyond the weights; documented here as the single source of truth for
// the default thresholds).
const RATING_THRESHOLDS: Array<{ min: number; rating: ScoreRating }> = [
  { min: 90, rating: 'EXCELLENT' },
  { min: 75, rating: 'GOOD' },
  { min: 50, rating: 'NEEDS_IMPROVEMENT' },
  { min: 0, rating: 'POOR' },
];

@Injectable()
export class ScoreCalculatorService {
  // Deterministic: same category scores + same weights always produce the
  // same overall score (spec §41) — no randomness, no hidden state, no
  // "average of raw metrics" shortcut.
  calculateOverallScore(
    categoryScores: {
      performance: number | null;
      accessibility: number | null;
      bestPractices: number | null;
      seo: number | null;
      security: number | null;
    },
    weights: CategoryWeights,
  ): number | null {
    const entries: Array<[number | null, number]> = [
      [categoryScores.performance, weights.performance],
      [categoryScores.accessibility, weights.accessibility],
      [categoryScores.bestPractices, weights.bestPractices],
      [categoryScores.seo, weights.seo],
      [categoryScores.security, weights.security],
    ];

    // A category that never ran (e.g. security checks skipped) is
    // excluded from the weighted average entirely rather than treated as
    // 0 — a missing measurement is not the same thing as a failing one,
    // and silently scoring a category "0" it never checked would be
    // exactly the kind of fabricated number this system exists to avoid.
    const measured = entries.filter((e): e is [number, number] => e[0] !== null && e[1] > 0);
    if (measured.length === 0) return null;

    const totalWeight = measured.reduce((sum, [, w]) => sum + w, 0);
    const weightedSum = measured.reduce((sum, [score, w]) => sum + score * w, 0);
    return Math.round((weightedSum / totalWeight) * 10) / 10;
  }

  ratingForScore(score: number): ScoreRating {
    const match = RATING_THRESHOLDS.find((t) => score >= t.min);
    return match?.rating ?? 'POOR';
  }

  validateWeights(weights: CategoryWeights): void {
    const total =
      weights.performance + weights.accessibility + weights.bestPractices + weights.seo + weights.security;
    if (total !== 100) {
      throw new Error(`Category weights must sum to 100 (got ${total})`);
    }
    for (const [key, value] of Object.entries(weights)) {
      if (value < 0 || value > 100) {
        throw new Error(`Weight "${key}" must be between 0 and 100 (got ${value})`);
      }
    }
  }

  // Simple deterministic average across audited pages for a category —
  // Lighthouse already produced a real 0-100 score per page; combining
  // multiple real per-page scores with an unweighted mean is not the
  // "don't blindly average raw metrics" case spec §41 warns against (that
  // warning is about deriving a score from raw metric values like LCP
  // milliseconds, not about combining already-scored pages).
  averagePageScores(scores: Array<number | null | undefined>): number | null {
    const valid = scores.filter((s): s is number => typeof s === 'number');
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, s) => acc + s, 0);
    return Math.round((sum / valid.length) * 10) / 10;
  }
}
