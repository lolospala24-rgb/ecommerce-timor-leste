'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PromotionForm } from '@/components/marketing/PromotionForm';

export default function NewPromotionPage() {
  return (
    <div>
      <Link
        href="/marketing/promotions"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Promotions
      </Link>
      <PageHeader title="Create Promotion" description="Offer a limited-time discount on a set of your products." />
      <PromotionForm mode="create" />
    </div>
  );
}
