import { ReactNode } from 'react';

export default function VideoShopLayout({ children }: { children: ReactNode }) {
  return <div className="h-[100dvh] w-full overflow-hidden bg-neutral-50">{children}</div>;
}
