'use client';

import Link from 'next/link';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Gift,
  Share2,
  UserPlus,
  Wallet,
  ShoppingBag,
  PackageCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const STEPS = [
  { icon: Share2, title: 'Share Your Link', description: 'Send your personal referral link to friends and family.' },
  { icon: UserPlus, title: 'Friend Joins', description: 'They create a Lolospala account using your link.' },
  { icon: Wallet, title: 'Welcome Reward', description: 'Your friend gets wallet credit right away.' },
  { icon: ShoppingBag, title: 'First Order', description: 'They shop and place their first order.' },
  { icon: PackageCheck, title: 'Order Delivered', description: 'Their order is delivered successfully.' },
  { icon: Sparkles, title: 'You Earn', description: 'You receive wallet credit as a thank-you.' },
];

export default function ReferralLandingPage() {
  const { data: settings } = usePublicSettings();
  const welcomeCredit = settings?.referralWelcomeCredit;
  const rewardAmount = settings?.referralRewardAmount;

  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-14 text-center sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Gift className="h-3.5 w-3.5" />
            Referral Program
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Invite Friends. Earn Rewards.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Share your Lolospala referral link and earn wallet credit when your friends complete
            their first qualifying purchase.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="gap-2" asChild>
              <Link href="/account/referrals">
                Invite Friends
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how-it-works">How It Works</a>
            </Button>
          </div>

          {(welcomeCredit || rewardAmount) && (
            <div className="mx-auto mt-10 flex max-w-sm items-stretch gap-4">
              <div className="flex-1 rounded-xl border bg-muted/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Give</p>
                <p className="mt-1 text-2xl font-bold text-primary">${(welcomeCredit ?? 0).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Your friend gets</p>
              </div>
              <div className="flex-1 rounded-xl border bg-muted/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Get</p>
                <p className="mt-1 text-2xl font-bold text-primary">${(rewardAmount ?? 0).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">You earn</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <p className="mt-2 text-muted-foreground">Six simple steps from sharing to earning.</p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <Card key={step.title} className="p-5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">STEP {index + 1}</p>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-2xl border bg-primary/5 p-8 text-center">
        <h2 className="text-xl font-bold">Ready to start earning?</h2>
        <p className="mt-2 text-muted-foreground">Get your referral link in seconds.</p>
        <Button size="lg" className="mt-5 gap-2" asChild>
          <Link href="/account/referrals">
            Invite Friends
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
