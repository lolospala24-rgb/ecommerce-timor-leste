'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { AccountHubContent } from '@/components/account/AccountHubContent';
import { NotificationBell } from '@/components/account/NotificationBell';

// The "Konta" hub — new landing screen for the account section. On mobile
// this is the root; tapping any row pushes a dedicated full screen. On
// desktop/tablet, AccountLayout renders this same content in a persistent
// left pane instead (see layout.tsx), so visiting this route directly
// there just shows a "pick something" placeholder on the right.
export default function AccountHubPage() {
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <h1 className="text-[22px] font-extrabold text-foreground">Konta</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            href="/account/settings"
            aria-label="Konfigurasaun"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
      <AccountHubContent />
    </div>
  );
}
