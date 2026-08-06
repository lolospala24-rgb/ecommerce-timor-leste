'use client';

import { useState } from 'react';
import { usePendingSellers } from '@/hooks/useSellers';
import { PendingVerification } from '../components/PendingVerification';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function VerificationPage() {
  const { refetch } = usePendingSellers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sellers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Seller Verification</h1>
            <p className="text-muted-foreground">
              Review and verify pending seller applications
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>
            Sellers waiting for verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingVerification onRefresh={refetch} />
        </CardContent>
      </Card>
    </div>
  );
}