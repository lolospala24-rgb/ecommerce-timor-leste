'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LifeBuoy,
  Package,
  Truck,
  RotateCcw,
  CreditCard,
  Store,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';

const topics = [
  {
    title: 'Orders',
    description: 'Track, change, or cancel an order',
    icon: Package,
    href: '/account/orders',
  },
  {
    title: 'Shipping & Delivery',
    description: 'Delivery times, couriers, and tracking',
    icon: Truck,
    href: '/faq#shipping',
  },
  {
    title: 'Returns & Refunds',
    description: 'How to return an item and get refunded',
    icon: RotateCcw,
    href: '/returns',
  },
  {
    title: 'Payment',
    description: 'Payment methods and billing questions',
    icon: CreditCard,
    href: '/faq#payment',
  },
  {
    title: 'Selling on the Platform',
    description: 'Becoming a seller and managing your store',
    icon: Store,
    href: '/seller/register',
  },
  {
    title: 'Frequently Asked Questions',
    description: 'Quick answers to common questions',
    icon: LifeBuoy,
    href: '/faq',
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <LifeBuoy className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">Help Center</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Find answers about orders, shipping, payments, and more — or reach out to our support team directly.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Browse by topic</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => {
            const Icon = topic.icon;
            return (
              <Link key={topic.title} href={topic.href}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{topic.title}</CardTitle>
                    <CardDescription>{topic.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-primary p-8 md:p-12 text-center text-primary-foreground">
        <MessageCircle className="mx-auto h-8 w-8" />
        <h2 className="mt-3 text-2xl font-bold">Still stuck?</h2>
        <p className="mt-2 text-primary-foreground/80">
          Our support team is happy to help with anything not covered here.
        </p>
        <div className="mt-6">
          <Button size="lg" variant="secondary" asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
