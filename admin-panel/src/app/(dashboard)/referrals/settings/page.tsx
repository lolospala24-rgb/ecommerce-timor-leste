'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAdminReferralSettings, useUpdateAdminReferralSettings } from '@/hooks/useReferrals';

export default function AdminReferralSettingsPage() {
  const { data: settings, isLoading } = useAdminReferralSettings();
  const updateSettings = useUpdateAdminReferralSettings();

  const [enabled, setEnabled] = useState(true);
  const [welcomeCredit, setWelcomeCredit] = useState('3');
  const [rewardAmount, setRewardAmount] = useState('5');

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.referralProgramEnabled);
    setWelcomeCredit(String(settings.referralWelcomeCredit));
    setRewardAmount(String(settings.referralRewardAmount));
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      referralProgramEnabled: enabled,
      referralWelcomeCredit: Number(welcomeCredit) || 0,
      referralRewardAmount: Number(rewardAmount) || 0,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3" asChild>
          <Link href="/referrals"><ArrowLeft className="mr-2 h-4 w-4" />Back to Referrals</Link>
        </Button>
        <h1 className="mt-1 text-2xl font-bold">Referral Settings</h1>
        <p className="text-muted-foreground">Configure the referral program's rewards and eligibility.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Program Configuration</CardTitle>
            <CardDescription>
              Changing amounts here only affects referrals created after the change — existing
              referrals keep the amount they were originally promised.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Referral Program</Label>
                <p className="text-xs text-muted-foreground">Turn the entire program on or off</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcomeCredit">Welcome Reward ($)</Label>
              <Input
                id="welcomeCredit"
                type="number"
                min={0}
                step="0.01"
                value={welcomeCredit}
                onChange={(e) => setWelcomeCredit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Credited to a new user who signs up with a valid referral code.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rewardAmount">Referrer Reward ($)</Label>
              <Input
                id="rewardAmount"
                type="number"
                min={0}
                step="0.01"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Credited to the referrer once the referred user's first order is delivered.</p>
            </div>

            <div className="space-y-2">
              <Label>Reward Trigger</Label>
              <Input value="DELIVERED" disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Fixed for v1 — the referrer is only rewarded once the referred customer's order is
                actually delivered, not merely placed or paid.
              </p>
            </div>

            <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full">
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
