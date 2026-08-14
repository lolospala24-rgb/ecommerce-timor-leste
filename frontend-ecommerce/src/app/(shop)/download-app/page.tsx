'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, Bell, Globe } from 'lucide-react';

export default function DownloadAppPage() {
  return (
    <div className="flex flex-col items-center space-y-8 py-8 text-center">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-10 md:p-16 w-full">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 text-3xl font-bold md:text-4xl">Our Mobile App is Coming Soon</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          We&apos;re working on a mobile app for E-commerce Timor-Leste so you can shop on the go.
          In the meantime, our website works great on your phone&apos;s browser.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/products">
              <Globe className="mr-2 h-4 w-4" />
              Continue Shopping on the Web
            </Link>
          </Button>
        </div>
      </div>

      <Card className="max-w-md">
        <CardContent className="flex items-start gap-3 pt-6 text-left">
          <div className="rounded-full bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Want to know when it launches?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow our{' '}
              <a
                href="https://facebook.com/ecommercetimor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                social media
              </a>{' '}
              or{' '}
              <Link href="/contact" className="text-primary hover:underline">
                contact us
              </Link>{' '}
              to be the first to know.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
