'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Globe, Share, Smartphone, WifiOff, Zap } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const PERKS = [
  { icon: Zap, title: 'Faster', description: 'Launches instantly from your home screen — no browser bar, no waiting.' },
  { icon: WifiOff, title: 'Works offline', description: 'Pages you’ve visited stay available even with a weak connection.' },
  { icon: Smartphone, title: 'Feels native', description: 'Full-screen, app-like experience on Android, iOS, and desktop.' },
];

export default function DownloadAppPage() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  };

  return (
    <div className="flex flex-col items-center space-y-8 py-8 text-center">
      <div className="rounded-xl bg-muted/30 p-10 md:p-16 w-full">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 text-3xl font-bold md:text-4xl">Get the Lolospala App</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {installed
            ? 'Lolospala is already installed on this device — nice, you’re all set.'
            : 'Install Lolospala on your phone or computer for a faster, app-like shopping experience — no app store needed.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {!installed && canInstall && (
            <Button size="lg" onClick={handleInstall} disabled={installing}>
              <Download className="mr-2 h-4 w-4" />
              {installing ? 'Installing…' : 'Install App'}
            </Button>
          )}
          <Button size="lg" variant={canInstall && !installed ? 'outline' : 'default'} asChild>
            <Link href="/products">
              <Globe className="mr-2 h-4 w-4" />
              Continue Shopping on the Web
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        {PERKS.map((perk) => (
          <Card key={perk.title}>
            <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
              <perk.icon className="h-6 w-6 text-primary" />
              <p className="font-medium">{perk.title}</p>
              <p className="text-sm text-muted-foreground">{perk.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!installed && !canInstall && (
        <Card className="max-w-md">
          <CardContent className="flex items-start gap-3 pt-6 text-left">
            <div className="rounded-full bg-primary/10 p-2">
              <Share className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">On iPhone or iPad?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap the <strong>Share</strong> button in Safari, then choose <strong>&quot;Add to Home Screen&quot;</strong>.
                On Android/desktop Chrome, look for the install icon in your address bar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
