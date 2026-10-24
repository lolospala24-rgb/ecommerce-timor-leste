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
  // Product detail and /categories both own their own full-bleed
  // top section (ProductMediaHeader's edge-to-edge image; the category
  // rail+content panel) and need to sit flush under the header with zero
  // gap — the generic py-6/mt-4 spacing below (meant for normal
  // in-container pages) was showing through as a blank white strip above
  // them otherwise.
  const isProductDetail = pathname.startsWith('/products/') && pathname !== '/products/';
  const isCategoriesPage = pathname === '/categories' || pathname.startsWith('/categories/');
  const isFlush = isProductDetail || isCategoriesPage;
  const usesOwnBreadcrumb = hasOwnBreadcrumb(pathname);

  return (
    <div className={isFlush ? 'container-custom py-0' : 'container-custom py-6 md:py-8'}>
      {!usesOwnBreadcrumb && <Breadcrumb />}
      <div className={isFlush ? 'mt-0' : 'mt-4 md:mt-6'}>{children}</div>
    </div>
  );
}