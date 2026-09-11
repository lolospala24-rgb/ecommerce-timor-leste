import { Injectable, Logger } from '@nestjs/common';
import { sanitizeEvidence } from './security-audit.service';

// Real Performance/Accessibility/Best-Practices/SEO audits come from
// Google's PageSpeed Insights API — Google runs the actual Lighthouse
// audit (a real headless Chrome run) on their own infrastructure, never on
// this 2-CPU production VPS, which already serves live customer traffic.
// This is what makes "no hard-coded/fake scores" (spec §1) true without
// introducing a resource/stability risk (spec §50).
const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export interface PageSpeedMetric {
  metricName: string;
  value: number;
  unit: string;
  rating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' | null;
}

export interface PageSpeedIssue {
  category: 'PERFORMANCE' | 'ACCESSIBILITY' | 'BEST_PRACTICES' | 'SEO';
  ruleId: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  recommendation: string;
  documentationUrl?: string;
}

export interface PageSpeedResult {
  scores: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
  };
  metrics: PageSpeedMetric[];
  issues: PageSpeedIssue[];
}

const METRIC_AUDITS: Record<string, { name: string; unit: string }> = {
  'largest-contentful-paint': { name: 'LCP', unit: 'ms' },
  'cumulative-layout-shift': { name: 'CLS', unit: 'score' },
  'total-blocking-time': { name: 'TBT', unit: 'ms' },
  'first-contentful-paint': { name: 'FCP', unit: 'ms' },
  'speed-index': { name: 'SpeedIndex', unit: 'ms' },
  'server-response-time': { name: 'TTFB', unit: 'ms' },
  interactive: { name: 'TTI', unit: 'ms' },
};

const CATEGORY_KEY_MAP: Record<string, PageSpeedIssue['category']> = {
  performance: 'PERFORMANCE',
  accessibility: 'ACCESSIBILITY',
  'best-practices': 'BEST_PRACTICES',
  seo: 'SEO',
};

@Injectable()
export class PageSpeedService {
  private readonly logger = new Logger(PageSpeedService.name);

  async auditUrl(
    url: string,
    strategy: 'mobile' | 'desktop',
    apiKey: string | undefined,
    timeoutMs: number,
  ): Promise<PageSpeedResult> {
    const params = new URLSearchParams({ url, strategy });
    params.append('category', 'performance');
    params.append('category', 'accessibility');
    params.append('category', 'best-practices');
    params.append('category', 'seo');
    if (apiKey) params.set('key', apiKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, { signal: controller.signal });
    } catch (error) {
      this.logger.error(`PageSpeed Insights request failed for ${url}: ${(error as Error).message}`);
      throw new Error(`PageSpeed Insights request failed: ${(error as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`PageSpeed Insights returned ${response.status} for ${url}: ${body.slice(0, 300)}`);
      throw new Error(
        response.status === 429
          ? 'PageSpeed Insights rate limit exceeded — configure GOOGLE_PAGESPEED_API_KEY or wait before retrying.'
          : `PageSpeed Insights returned HTTP ${response.status}`,
      );
    }

    const data = await response.json();
    return this.normalize(data);
  }

  private normalize(data: any): PageSpeedResult {
    const lighthouse = data?.lighthouseResult;
    const categories = lighthouse?.categories ?? {};
    const audits = lighthouse?.audits ?? {};

    const scores = {
      performance: toScore(categories.performance?.score),
      accessibility: toScore(categories.accessibility?.score),
      bestPractices: toScore(categories['best-practices']?.score),
      seo: toScore(categories.seo?.score),
    };

    const metrics: PageSpeedMetric[] = [];
    for (const [auditId, meta] of Object.entries(METRIC_AUDITS)) {
      const audit = audits[auditId];
      if (typeof audit?.numericValue !== 'number') continue;
      metrics.push({
        metricName: meta.name,
        value: Math.round(audit.numericValue * 100) / 100,
        unit: meta.unit,
        rating: ratingFromAuditScore(audit.score),
      });
    }

    // Build auditId -> category from each category's auditRefs, so a
    // failing audit (e.g. "uses-responsive-images") is filed under
    // PERFORMANCE rather than guessed from its name.
    const auditIdToCategory: Record<string, PageSpeedIssue['category']> = {};
    for (const [key, mapped] of Object.entries(CATEGORY_KEY_MAP)) {
      const refs = categories[key]?.auditRefs ?? [];
      for (const ref of refs) {
        auditIdToCategory[ref.id] = mapped;
      }
    }

    const issues: PageSpeedIssue[] = [];
    for (const [auditId, audit] of Object.entries<any>(audits)) {
      const category = auditIdToCategory[auditId];
      if (!category) continue;
      // scoreDisplayMode: "notApplicable" | "informative" | "manual" carry
      // no pass/fail verdict — nothing to report as an issue. "binary" and
      // "numeric" do.
      const mode = audit.scoreDisplayMode;
      if (mode === 'notApplicable' || mode === 'informative' || mode === 'manual') continue;
      if (typeof audit.score !== 'number') continue;
      if (audit.score >= 0.9) continue; // passing — not an issue

      issues.push({
        category,
        ruleId: auditId,
        severity: audit.score < 0.5 ? 'HIGH' : 'MEDIUM',
        title: audit.title ?? auditId,
        description: sanitizeEvidence(stripMarkdownLinks(audit.description ?? '')),
        recommendation: audit.displayValue
          ? sanitizeEvidence(String(audit.displayValue))
          : 'See the audit description for remediation guidance.',
        documentationUrl: extractDocsLink(audit.description ?? ''),
      });
    }

    return { scores, metrics, issues };
  }
}

function toScore(raw: unknown): number | null {
  return typeof raw === 'number' ? Math.round(raw * 100) : null;
}

function ratingFromAuditScore(score: unknown): PageSpeedMetric['rating'] {
  if (typeof score !== 'number') return null;
  if (score >= 0.9) return 'GOOD';
  if (score >= 0.5) return 'NEEDS_IMPROVEMENT';
  return 'POOR';
}

function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function extractDocsLink(text: string): string | undefined {
  const match = text.match(/\((https?:\/\/[^)]+)\)/);
  return match?.[1];
}
