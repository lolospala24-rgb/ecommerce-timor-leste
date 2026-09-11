'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Search, ExternalLink, CheckCircle2, EyeOff } from 'lucide-react';
import { useAuditDetail, useAuditIssues, useUpdateIssueStatus, type AuditIssue } from '@/hooks/useWebsiteHealth';
import { ScoreCard } from '../components/ScoreCard';

const CATEGORY_LABEL: Record<string, string> = {
  PERFORMANCE: 'Performance',
  ACCESSIBILITY: 'Accessibility',
  BEST_PRACTICES: 'Best Practices',
  SEO: 'SEO',
  SECURITY: 'Security',
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'border-red-300 bg-red-50 text-red-700',
  HIGH: 'border-red-200 bg-red-50 text-red-600',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-600',
  LOW: 'border-blue-200 bg-blue-50 text-blue-600',
  INFO: 'border-border bg-muted text-muted-foreground',
};

export default function AuditDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const auditId = Number(params.id);

  const [category, setCategory] = useState<string>('all');
  const [severity, setSeverity] = useState<string>('all');
  const [status, setStatus] = useState<string>('OPEN');
  const [search, setSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null);

  const { data: audit, isLoading: auditLoading } = useAuditDetail(auditId);
  const { data: issuesResult, isLoading: issuesLoading } = useAuditIssues(auditId, {
    category: category === 'all' ? undefined : category,
    severity: severity === 'all' ? undefined : severity,
    status: status === 'all' ? undefined : status,
    search: search || undefined,
  });
  const updateStatus = useUpdateIssueStatus();

  if (auditLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!audit) {
    return <p className="text-muted-foreground">Audit not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/website-health">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Website Health
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Audit #{audit.id} —{' '}
          {new Date(audit.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {audit.device} · {new URL(audit.baseUrl).hostname} · engine v{audit.auditEngineVersion} · score v
          {audit.scoreVersion}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <ScoreCard label="Overall" score={audit.overallScore} />
        <ScoreCard label="Performance" score={audit.performanceScore} />
        <ScoreCard label="Accessibility" score={audit.accessibilityScore} />
        <ScoreCard label="Best Practices" score={audit.bestPracticesScore} />
        <ScoreCard label="SEO" score={audit.seoScore} />
        <ScoreCard label="Security" score={audit.securityScore} />
      </div>

      {audit.targets && audit.targets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audited Pages</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Page</th>
                  <th className="pb-2 font-medium">Performance</th>
                  <th className="pb-2 font-medium">Accessibility</th>
                  <th className="pb-2 font-medium">Best Practices</th>
                  <th className="pb-2 font-medium">SEO</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {audit.targets.map((target) => (
                  <tr key={target.id}>
                    <td className="py-2">
                      <a href={target.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        {target.route || '/'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="py-2 tabular-nums">{target.performanceScore ?? '—'}</td>
                    <td className="py-2 tabular-nums">{target.accessibilityScore ?? '—'}</td>
                    <td className="py-2 tabular-nums">{target.bestPracticesScore ?? '—'}</td>
                    <td className="py-2 tabular-nums">{target.seoScore ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Findings</CardTitle>
          <CardDescription>Every finding is stored with its rule id, severity, affected page, and recommendation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search title, rule id, URL..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="IGNORED">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {issuesLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : issuesResult?.data.length === 0 ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              No findings match these filters.
            </div>
          ) : (
            <div className="space-y-2">
              {issuesResult?.data.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{issue.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {CATEGORY_LABEL[issue.category]} · {issue.ruleId}
                      {issue.affectedUrl ? ` · ${new URL(issue.affectedUrl).pathname}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {issue.status !== 'OPEN' && (
                      <Badge variant="outline" className="text-xs">{issue.status}</Badge>
                    )}
                    <Badge variant="outline" className={SEVERITY_COLOR[issue.severity]}>
                      {issue.severity}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogContent className="max-w-xl">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedIssue.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <Badge variant="outline">{CATEGORY_LABEL[selectedIssue.category]}</Badge>
                  <Badge variant="outline" className={SEVERITY_COLOR[selectedIssue.severity]}>
                    {selectedIssue.severity}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {selectedIssue.affectedUrl && (
                  <div>
                    <p className="font-medium text-muted-foreground">Affected page</p>
                    <a href={selectedIssue.affectedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                      {selectedIssue.affectedUrl}
                    </a>
                  </div>
                )}
                <div>
                  <p className="font-medium text-muted-foreground">Problem</p>
                  <p>{selectedIssue.description}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Recommended fix</p>
                  <p>{selectedIssue.recommendation}</p>
                </div>
                {selectedIssue.evidence && (
                  <div>
                    <p className="font-medium text-muted-foreground">Evidence</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">{selectedIssue.evidence}</pre>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Rule: {selectedIssue.ruleId}</p>
              </div>
              <DialogFooter className="gap-2">
                {selectedIssue.documentationUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedIssue.documentationUrl} target="_blank" rel="noopener noreferrer">
                      Documentation
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateStatus.mutate({ issueId: selectedIssue.id, status: 'IGNORED' });
                    setSelectedIssue(null);
                  }}
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  Ignore
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    updateStatus.mutate({ issueId: selectedIssue.id, status: 'RESOLVED' });
                    setSelectedIssue(null);
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Resolved
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
