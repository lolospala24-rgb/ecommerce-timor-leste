'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Eye } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip, Legend } from 'recharts';
import { useAuditList, useWebsiteHealthHistory } from '@/hooks/useWebsiteHealth';

export default function WebsiteHealthHistoryPage() {
  const { data: auditList, isLoading } = useAuditList(1, 30);
  const { data: history } = useWebsiteHealthHistory(30);

  const trendData = (history ?? []).map((h) => ({
    date: new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Overall: h.overallScore,
    Performance: h.performanceScore,
    Accessibility: h.accessibilityScore,
    'Best Practices': h.bestPracticesScore,
    SEO: h.seoScore,
    Security: h.securityScore,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/website-health">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Website Health
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Audit History</h1>
        <p className="text-muted-foreground">Every audit run, its scores, and how they've trended over time.</p>
      </div>

      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Trend</CardTitle>
            <CardDescription>Each line tracks one category's score across completed audits.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="date" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 100]} fontSize={12} tickLine={false} />
                  <ChartTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Overall" stroke="#1d4ed8" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Performance" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Accessibility" stroke="#10b981" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Best Practices" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="SEO" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Security" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Overall</th>
                  <th className="pb-2 font-medium">Perf</th>
                  <th className="pb-2 font-medium">A11y</th>
                  <th className="pb-2 font-medium">BP</th>
                  <th className="pb-2 font-medium">SEO</th>
                  <th className="pb-2 font-medium">Security</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditList?.data.map((audit) => (
                  <tr key={audit.id}>
                    <td className="py-2.5">
                      {new Date(audit.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5">{audit.status}</td>
                    <td className="py-2.5 tabular-nums font-semibold">{audit.overallScore ?? '—'}</td>
                    <td className="py-2.5 tabular-nums">{audit.performanceScore ?? '—'}</td>
                    <td className="py-2.5 tabular-nums">{audit.accessibilityScore ?? '—'}</td>
                    <td className="py-2.5 tabular-nums">{audit.bestPracticesScore ?? '—'}</td>
                    <td className="py-2.5 tabular-nums">{audit.seoScore ?? '—'}</td>
                    <td className="py-2.5 tabular-nums">{audit.securityScore ?? '—'}</td>
                    <td className="py-2.5 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/website-health/${audit.id}`}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
