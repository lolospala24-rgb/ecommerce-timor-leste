'use client';

import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Wrench } from 'lucide-react';

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { data: settings } = usePublicSettings();

  if (settings?.maintenanceMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 px-6 text-center">
        <Wrench className="h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold">We&apos;ll be right back</h1>
        <p className="max-w-md text-muted-foreground">
          {settings.maintenanceMessage || 'We are currently under maintenance. Please check back later.'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
