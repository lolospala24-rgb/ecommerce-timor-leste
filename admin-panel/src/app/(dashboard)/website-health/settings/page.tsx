'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useWebsiteHealthSettings, useUpdateWebsiteHealthSettings } from '@/hooks/useWebsiteHealth';

export default function WebsiteHealthSettingsPage() {
  const { data: settings, isLoading } = useWebsiteHealthSettings();
  const updateSettings = useUpdateWebsiteHealthSettings();

  const [form, setForm] = useState({
    baseUrl: '',
    weightPerformance: 25,
    weightAccessibility: 15,
    weightBestPractices: 15,
    weightSeo: 20,
    weightSecurity: 25,
    timeoutSeconds: 60,
    retentionDays: 90,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        baseUrl: settings.baseUrl,
        weightPerformance: settings.weightPerformance,
        weightAccessibility: settings.weightAccessibility,
        weightBestPractices: settings.weightBestPractices,
        weightSeo: settings.weightSeo,
        weightSecurity: settings.weightSecurity,
        timeoutSeconds: settings.timeoutSeconds,
        retentionDays: settings.retentionDays,
      });
    }
  }, [settings]);

  const totalWeight =
    form.weightPerformance + form.weightAccessibility + form.weightBestPractices + form.weightSeo + form.weightSecurity;

  const handleSave = () => {
    updateSettings.mutate(form);
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/website-health">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Website Health
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Website Health Settings</h1>
        <p className="text-muted-foreground">
          Changing the target domain is a sensitive action — every audit only ever fetches this one
          allow-listed domain.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Target</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Target Website URL</Label>
            <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timeout (seconds)</Label>
              <Input
                type="number"
                value={form.timeoutSeconds}
                onChange={(e) => setForm({ ...form, timeoutSeconds: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Retention (days)</Label>
              <Input
                type="number"
                value={form.retentionDays}
                onChange={(e) => setForm({ ...form, retentionDays: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Weights</CardTitle>
          <CardDescription>Must sum to exactly 100%. Used to compute the Overall Health score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ['weightPerformance', 'Performance'],
              ['weightAccessibility', 'Accessibility'],
              ['weightBestPractices', 'Best Practices'],
              ['weightSeo', 'SEO'],
              ['weightSecurity', 'Security'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label className="w-40 shrink-0">{label}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: parseInt(e.target.value, 10) || 0 })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}

          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
              totalWeight === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {totalWeight !== 100 && <AlertTriangle className="h-4 w-4 shrink-0" />}
            Total: {totalWeight}% {totalWeight !== 100 && '— must equal 100% to save.'}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={totalWeight !== 100 || updateSettings.isPending}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
