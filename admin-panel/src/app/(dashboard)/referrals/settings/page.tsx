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
import {
  useAdminReferralSettings,
  useUpdateAdminReferralSettings,
} from '@/hooks/useReferrals';

export default function AdminReferralSettingsPage() {
  const { data: settings, isLoading } = useAdminReferralSettings();
  const updateSettings = useUpdateAdminReferralSettings();

  const [enabled, setEnabled] = useState(true);
  const [welcomeCredit, setWelcomeCredit] = useState('3');
  const [rewardAmount, setRewardAmount] = useState('5');
  const [holdDays, setHoldDays] = useState('7');
  const [minQualifyingAmount, setMinQualifyingAmount] = useState('5');
  const [monthlyCap, setMonthlyCap] = useState('20');
  const [requirePhoneVerification, setRequirePhoneVerification] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.referralProgramEnabled);
    setWelcomeCredit(String(settings.referralWelcomeCredit));
    setRewardAmount(String(settings.referralRewardAmount));
    setHoldDays(String(settings.referralHoldDays));
    setMinQualifyingAmount(String(settings.referralMinQualifyingAmount));
    setMonthlyCap(String(settings.referralMonthlyCap));
    setRequirePhoneVerification(settings.referralRequirePhoneVerification);
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      referralProgramEnabled: enabled,
      referralWelcomeCredit: Number(welcomeCredit) || 0,
      referralRewardAmount: Number(rewardAmount) || 0,
      referralHoldDays: Number(holdDays) || 1,
      referralMinQualifyingAmount: Number(minQualifyingAmount) || 0,
      referralMonthlyCap: Number(monthlyCap) || 1,
      referralRequirePhoneVerification: requirePhoneVerification,
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
              <p className="text-xs text-muted-foreground">
                Promised to a new user who signs up with a valid referral code, but credited
                alongside the referrer's reward once the hold period below clears — not at signup.
              </p>
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
              <p className="text-xs text-muted-foreground">
                Credited alongside the referred user's welcome credit once the hold period below
                clears with no refund — not at delivery itself.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minQualifyingAmount">Minimum Qualifying Amount ($)</Label>
              <Input
                id="minQualifyingAmount"
                type="number"
                min={0}
                step="0.01"
                value={minQualifyingAmount}
                onChange={(e) => setMinQualifyingAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The referred user's first order must pay at least this much (subtotal minus any
                wallet credit used, excluding shipping) to qualify the referrer for a reward.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="holdDays">Hold Period (days)</Label>
              <Input
                id="holdDays"
                type="number"
                min={1}
                step="1"
                value={holdDays}
                onChange={(e) => setHoldDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                How long a qualifying order is held before paying out — defaults to the customer
                refund window (7 days) so a refund has a chance to cancel the payout first. A
                refund after the reward has already paid out claws it back instead.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyCap">Monthly Cap (per referrer)</Label>
              <Input
                id="monthlyCap"
                type="number"
                min={1}
                step="1"
                value={monthlyCap}
                onChange={(e) => setMonthlyCap(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Max referrer rewards paid out per calendar month. Referrals past the cap still
                credit the referred user right away — the referrer's own reward waits for next
                month.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Email Verification</Label>
                  <p className="text-xs text-muted-foreground">
                    When on, the referred user must verify their email (OTP code sent to their
                    inbox) before the referrer's reward can pay out — a qualifying referral simply
                    waits until they do. Off by default; existing behavior is unchanged until you
                    turn this on. Only applies to referrals created after the setting is turned on
                    — existing referrals still pay out without OTP.
                  </p>
                </div>
                <Switch checked={requirePhoneVerification} onCheckedChange={setRequirePhoneVerification} />
              </div>

              {settings?.referralRequirePhoneVerification && settings?.referralPhoneVerificationRequiredSince && (
                <p className="text-xs text-muted-foreground">
                  Required since{' '}
                  {new Date(settings.referralPhoneVerificationRequiredSince).toLocaleString()} — referrals
                  created before that date are not affected.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reward Trigger</Label>
              <Input value="DELIVERED + hold period" disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Fixed — the referrer's reward (and the referred user's welcome credit) is only
                paid out once the referred customer's order is delivered AND the hold period above
                has passed with no refund.
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
