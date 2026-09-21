'use client';

import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { usePathname } from 'next/navigation';

// Routes that render their own purpose-built breadcrumb (real category/product
// names and hierarchy, not raw URL slugs) — the generic layout breadcrumb
// would otherwise duplicate it with a worse, slug-based version.
function hasOwnBreadcrumb(pathname: string): boolean {
  if (pathname === '/categories' || pathname.startsWith('/categories/')) return true;
  if (pathname.startsWith('/products/') && pathname !== '/products/') return true;
  return false;
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container-custom py-6 md:py-8">
      {!hasOwnBreadcrumb(pathname) && <Breadcrumb />}
      <div className="mt-4 md:mt-6">{children}</div>
    </div>
  );
}