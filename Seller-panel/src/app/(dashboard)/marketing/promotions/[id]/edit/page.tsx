'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { PromotionForm } from '@/components/marketing/PromotionForm';
import { usePromotion } from '@/hooks/usePromotions';

export default function EditPromotionPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data, isLoading } = usePromotion(id);

  return (
    <div>
      <Link
        href="/marketing/promotions"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Promotions
      </Link>
      <PageHeader title="Edit Promotion" description="Update products, discount, or schedule." />
      {isLoading || !data ? (
        <div className="max-w-3xl space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <PromotionForm mode="edit" initialData={data} />
      )}
    </div>
  );
}
