'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

export default function UnauthorizedPage() {
  const { logout } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">This dashboard is for sellers only</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Your account doesn&apos;t have seller access. Sign in with a seller account to continue.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => logout()}>
          Sign out
        </Button>
        <Button asChild>
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </div>
  );
}
