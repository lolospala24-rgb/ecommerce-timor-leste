'use client';

import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { SearchInput } from '@/components/shared/SearchInput';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="container-custom py-6 md:py-8">
      {/* Search Bar - Mobile */}
      <div className="md:hidden mb-4">
        <SearchInput
          placeholder="Search products..."
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
        />
      </div>

      {!hasOwnBreadcrumb(pathname) && <Breadcrumb />}
      <div className="mt-4 md:mt-6">{children}</div>
    </div>
  );
}