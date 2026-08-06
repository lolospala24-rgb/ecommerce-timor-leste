'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatorStoreButtonProps {
  storeName: string;
  storeUrl?: string;
  className?: string;
}

export function CreatorStoreButton({
  storeName,
  storeUrl,
  className,
}: CreatorStoreButtonProps) {
  const href = storeUrl || `/stores/${storeName}`;

  return (
    <Link href={href}>
      <Button
        variant="outline"
        className={cn(
          'w-full border-[rgba(255,255,255,0.08)] text-white hover:text-white hover:bg-[#1C1C1C] transition-all duration-200 group',
          className
        )}
      >
        <Store className="h-4 w-4 mr-2" />
        <span>Visit {storeName}</span>
        <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
      </Button>
    </Link>
  );
}