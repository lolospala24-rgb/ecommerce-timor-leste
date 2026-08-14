'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RotateCcw,
  CalendarClock,
  PackageCheck,
  Ban,
  Wallet,
  MessageCircle,
} from 'lucide-react';

const eligibleReasons = [
  'The item arrived damaged or defective',
  'The item is significantly different from its description or photos',
  'You received the wrong item',
  'The item is missing parts or accessories listed in the description',
];

const ineligibleReasons = [
  'You simply changed your mind (unless the seller allows it)',
  'The item was used, worn, or altered beyond inspection',
  'Original packaging, tags, or accessories are missing',
  'The return window has already passed',
];

const steps = [
  {
    icon: PackageCheck,
    title: '1. Request a return',
    description: 'Open the order in My Orders and select “Request Return”, or contact us with your order number and reason.',
  },
  {
    icon: CalendarClock,
    title: '2. Review window',
    description: 'Most items can be returned within 7 days of delivery. Perishables and made-to-order items are usually final sale.',
  },
  {
    icon: Wallet,
    title: '3. Refund or replacement',
    description: 'Once the seller confirms the return, you’ll get a refund to your original payment method or store credit, or a replacement.',
  },
];

export default function ReturnsPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <RotateCcw className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">Returns & Refunds</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          We want you to be happy with every purchase. Here&apos;s how returns and refunds work on E-commerce Timor-Leste.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">How it works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PackageCheck className="h-5 w-5 text-green-600" />
              Eligible for return
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {eligibleReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-600" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ban className="h-5 w-5 text-destructive" />
              Not eligible for return
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ineligibleReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl bg-muted/30 p-8 text-sm text-muted-foreground">
        <p>
          Exact return windows, shipping costs for returns, and refund timing can vary by seller
          and product category. Specific terms for an item are shown on its product page, and your
          order confirmation is the source of truth for that purchase.
        </p>
      </section>

      <section className="rounded-2xl bg-primary p-8 md:p-12 text-center text-primary-foreground">
        <MessageCircle className="mx-auto h-8 w-8" />
        <h2 className="mt-3 text-2xl font-bold">Need to start a return?</h2>
        <p className="mt-2 text-primary-foreground/80">
          Reach out with your order number and we&apos;ll guide you through it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="secondary" asChild>
            <Link href="/account/orders">Go to My Orders</Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
