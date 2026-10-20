'use client';

import { AccountHubContent } from '@/components/account/AccountHubContent';

// The "Konta" hub — new landing screen for the account section. On mobile
// this is the root; tapping any row pushes a dedicated full screen. On
// desktop/tablet, AccountLayout renders this same content in a persistent
// left pane instead (see layout.tsx), so visiting this route directly
// there just shows a "pick something" placeholder on the right.
export default function AccountHubPage() {
  return (
    <div>
      <AccountHubContent />
    </div>
  );
}
