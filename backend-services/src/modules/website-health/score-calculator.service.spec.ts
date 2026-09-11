import { ScoreCalculatorService } from './score-calculator.service';

describe('ScoreCalculatorService', () => {
  let service: ScoreCalculatorService;
  const evenWeights = { performance: 25, accessibility: 15, bestPractices: 15, seo: 20, security: 25 };

  beforeEach(() => {
    service = new ScoreCalculatorService();
  });

  describe('calculateOverallScore', () => {
    it('is deterministic — same input always produces the same output', () => {
      const scores = { performance: 73, accessibility: 88, bestPractices: 77, seo: 100, security: 82 };
      const first = service.calculateOverallScore(scores, evenWeights);
      const second = service.calculateOverallScore(scores, evenWeights);
      expect(first).toBe(second);
    });

    it('computes a real weighted average, not a plain mean', () => {
      // All 100 except performance at 0, weighted 25% — plain mean would
      // be 80; the weighted result must reflect performance's real weight.
      const scores = { performance: 0, accessibility: 100, bestPractices: 100, seo: 100, security: 100 };
      const result = service.calculateOverallScore(scores, evenWeights);
      // (0*25 + 100*15 + 100*15 + 100*20 + 100*25) / 100 = 75
      expect(result).toBe(75);
    });

    it('excludes categories that never ran instead of treating them as 0', () => {
      const scores = { performance: 80, accessibility: 80, bestPractices: 80, seo: 80, security: null };
      const result = service.calculateOverallScore(scores, evenWeights);
      // Security excluded entirely — remaining categories all agree at 80.
      expect(result).toBe(80);
    });

    it('returns null when nothing was measured at all', () => {
      const scores = { performance: null, accessibility: null, bestPractices: null, seo: null, security: null };
      expect(service.calculateOverallScore(scores, evenWeights)).toBeNull();
    });
  });

  describe('ratingForScore', () => {
    it.each([
      [100, 'EXCELLENT'],
      [90, 'EXCELLENT'],
      [89, 'GOOD'],
      [75, 'GOOD'],
      [74, 'NEEDS_IMPROVEMENT'],
      [50, 'NEEDS_IMPROVEMENT'],
      [49, 'POOR'],
      [0, 'POOR'],
    ])('rates %d as %s', (score, expected) => {
      expect(service.ratingForScore(score)).toBe(expected);
    });
  });

  describe('validateWeights', () => {
    it('accepts weights summing to exactly 100', () => {
      expect(() => service.validateWeights(evenWeights)).not.toThrow();
    });

    it('rejects weights that do not sum to 100', () => {
      expect(() =>
        service.validateWeights({ performance: 25, accessibility: 15, bestPractices: 15, seo: 20, security: 20 }),
      ).toThrow(/must sum to 100/);
    });

    it('rejects an out-of-range weight even if the total happens to be 100', () => {
      expect(() =>
        service.validateWeights({ performance: 150, accessibility: 15, bestPractices: 15, seo: -60, security: -20 }),
      ).toThrow();
    });
  });

  describe('averagePageScores', () => {
    it('averages only the real (non-null) values', () => {
      expect(service.averagePageScores([80, null, 90, undefined])).toBe(85);
    });

    it('returns null when every page failed to produce a score', () => {
      expect(service.averagePageScores([null, null])).toBeNull();
    });
  });
});
