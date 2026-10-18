import { ReactNode } from 'react';

// h-full resolves against the 100dvh <main> ConditionalChrome wraps this
// route in (see ConditionalChrome.tsx) — the video feed is full-viewport,
// no site Header/Footer above or below it.
export default function VideoShopLayout({ children }: { children: ReactNode }) {
  return <div className="h-full w-full overflow-hidden bg-neutral-50">{children}</div>;
}
