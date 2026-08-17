import { ReactNode } from 'react';

// Height comes from the flex-1 main ConditionalChrome wraps this route in
// (see ConditionalChrome.tsx) — not a hardcoded 100dvh, since the site
// Header above it now takes up real space.
export default function VideoShopLayout({ children }: { children: ReactNode }) {
  return <div className="h-full w-full overflow-hidden bg-neutral-50">{children}</div>;
}
