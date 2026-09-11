'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  Play,
  History,
  Settings as SettingsIcon,
  Gauge,
  Eye,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';
import {
  useAuditList,
  useAuditDetail,
  useAuditMetrics,
  useWebsiteHealthHistory,
  useAuditIssues,
} from '@/hooks/useWebsiteHealth';
import { ScoreCard } from './components/ScoreCard';
import { RunAuditDialog } from './components/RunAuditDialog';

const SEVERITY_STYLE: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  CRITICAL: { icon: AlertTriangle, color: 'text-red-600' },
  HIGH: { icon: AlertTriangle, color: 'text-red-500' },
  MEDIUM: { icon: AlertTriangle, color: 'text-amber-500' },
  LOW: { icon: Info, color: 'text-blue-500' },
  INFO: { icon: Info, color: 'text-muted-foreground' },
};

const METRIC_LABELS: Record<string, string> = {
  LCP: 'Largest Contentful Paint',
  CLS: 'Cumulative Layout Shift',
  TBT: 'Total Blocking Time',
  FCP: 'First Contentful Paint',
  SpeedIndex: 'Speed Index',
  TTFB: 'Time to First Byte',
  TTI: 'Time to Interactive',
};

function formatMetricValue(value: number, unit: string) {
  if (unit === 'ms' && value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  if (unit === 'ms') return `${Math.round(value)}ms`;
  if (unit === 'score') return value.toFixed(3);
  return `${value}${unit}`;
}

export default function WebsiteHealthPage() {
  const [runAuditOpen, setRunAuditOpen] = useState(false);
  const { data: auditList, isLoading: listLoading } = useAuditList(1, 1);
  const latestAudit = auditList?.data?.[0];
  const { data: auditDetail } = useAuditDetail(latestAudit?.id ?? null);
  const { data: metrics } = useAuditMetrics(latestAudit?.status === 'COMPLETED' ? latestAudit.id : null);
  const { data: topIssues } = useAuditIssues(latestAudit?.status === 'COMPLETED' ? latestAudit.id : null, {
    status: 'OPEN',
  });
  const { data: history } = useWebsiteHealthHistory(14);

  const audit = auditDetail ?? latestAudit;
  const isLoading = listLoading;
  const hasNoAudits = !isLoading && !latestAudit;

  const coreVitals = ['LCP', 'CLS', 'TBT'].map((name) => metrics?.find((m) => m.metricName === name)).filter(Boolean);

  const sortedTopIssues = (topIssues?.data ?? [])
    .slice()
    .sort((a, b) => {
      const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      return order.indexOf(a.severity) - order.indexOf(b.severity);
    })
    .slice(0, 5);

  const trendData = (history ?? []).map((h) => ({
    date: new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    overall: h.overallScore,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Activity className="h-7 w-7 text-primary" />
            Website Health
          </h1>
          <p className="text-muted-foreground">
            Monitor your website's performance, accessibility, best practices, SEO, and security.
          </p>
          {audit && (
            <p className="mt-1 text-sm text-muted-foreground">
              Last audited:{' '}
              {new Date(audit.createdAt).toLocaleString(undefined, {
                dateStyle: 'long',
                timeStyle: 'short',
              })}{' '}
              · {audit.device} · {new URL(audit.baseUrl).hostname}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/website-health/history">
              <History className="mr-2 h-4 w-4" />
              Audit History
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/website-health/settings">
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button onClick={() => setRunAuditOpen(true)}>
            <Play className="mr-2 h-4 w-4" />
            Run Audit
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : hasNoAudits ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Gauge className="h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">No audits yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Run your first website health audit to discover performance, accessibility, SEO,
              best-practice, and security issues — every score comes from a real audit, never a
              placeholder.
            </p>
            <Button onClick={() => setRunAuditOpen(true)}>
              <Play className="mr-2 h-4 w-4" />
              Run First Audit
            </Button>
          </CardContent>
        </Card>
      ) : audit?.status === 'RUNNING' || audit?.status === 'QUEUED' ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Activity className="h-10 w-10 animate-pulse text-primary" />
            <p className="font-medium">An audit is currently in progress...</p>
            <Button variant="outline" onClick={() => setRunAuditOpen(true)}>
              View Progress
            </Button>
          </CardContent>
        </Card>
      ) : audit?.status === 'FAILED' ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <h2 className="text-lg font-semibold">Unable to complete audit</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{audit.errorMessage}</p>
            <Button onClick={() => setRunAuditOpen(true)}>Try Again</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ScoreCard label="Overall Health" score={audit?.overallScore ?? null} icon={Gauge} size="lg" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ScoreCard label="Performance" score={audit?.performanceScore ?? null} />
            <ScoreCard label="Accessibility" score={audit?.accessibilityScore ?? null} />
            <ScoreCard label="Best Practices" score={audit?.bestPracticesScore ?? null} />
            <ScoreCard label="SEO" score={audit?.seoScore ?? null} />
            <ScoreCard label="Security" score={audit?.securityScore ?? null} icon={ShieldCheck} />
          </div>

          {coreVitals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Core Web Vitals</CardTitle>
                <CardDescription>Averaged across audited pages — real measurements from PageSpeed Insights.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                {coreVitals.map((metric) => (
                  <div key={metric!.metricName} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{METRIC_LABELS[metric!.metricName]}</p>
                    <p className="mt-1 text-xl font-bold">{formatMetricValue(metric!.value, metric!.unit)}</p>
                    <Badge
                      variant="outline"
                      className={
                        metric!.rating === 'GOOD'
                          ? 'mt-1 border-emerald-200 text-emerald-600'
                          : metric!.rating === 'NEEDS_IMPROVEMENT'
                            ? 'mt-1 border-amber-200 text-amber-600'
                            : 'mt-1 border-red-200 text-red-600'
                      }
                    >
                      {metric!.rating?.replace('_', ' ') ?? 'Unrated'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Open Issues</CardTitle>
                <CardDescription>Highest-severity findings from the latest audit.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/website-health/${audit?.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View All Issues
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {sortedTopIssues.length === 0 ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  No open issues — nice work.
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedTopIssues.map((issue) => {
                    const style = SEVERITY_STYLE[issue.severity];
                    const Icon = style.icon;
                    return (
                      <Link
                        key={issue.id}
                        href={`/website-health/${audit?.id}?issue=${issue.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`h-4 w-4 shrink-0 ${style.color}`} />
                          <span className="truncate font-medium">{issue.title}</span>
                        </div>
                        <Badge variant="outline" className={style.color}>
                          {issue.severity}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {trendData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Health Trend</CardTitle>
                <CardDescription>Overall score across recent audits.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <XAxis dataKey="date" fontSize={12} tickLine={false} />
                      <YAxis domain={[0, 100]} fontSize={12} tickLine={false} />
                      <ChartTooltip />
                      <Line type="monotone" dataKey="overall" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Website Health checks reflect the configured test conditions only — this does not
            guarantee search-engine rankings, real-world performance for every visitor, or complete
            security coverage.
          </p>
        </>
      )}

      <RunAuditDialog
        open={runAuditOpen}
        onOpenChange={setRunAuditOpen}
        defaultScope={['home', 'products', 'product-detail', 'search', 'cart', 'local-products']}
        onCompleted={() => setRunAuditOpen(false)}
      />
    </div>
  );
}
