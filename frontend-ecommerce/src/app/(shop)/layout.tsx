'use client';

import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { SearchInput } from '@/components/shared/SearchInput';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
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

      <Breadcrumb />
      <div className="mt-4 md:mt-6">{children}</div>
    </div>
  );
}