'use client';

import { useState } from 'react';
import { usePendingSellers } from '@/hooks/useSellers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Store, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { VerifySellerForm } from './VerifySellerForm';

interface PendingVerificationProps {
  onRefresh: () => void;
}

export function PendingVerification({ onRefresh }: PendingVerificationProps) {
  const { data: pendingSellers, isLoading } = usePendingSellers();
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'ST';
    }
    return name
      .split(' ')
      .map((n: string) => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!pendingSellers || pendingSellers.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No Pending Applications</h3>
        <p className="text-muted-foreground">
          All seller applications have been reviewed
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {pendingSellers.map((seller: any) => (
          <Card key={seller.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {getInitials(seller.storeName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{seller.storeName || 'Unnamed Store'}</h3>
                    <Badge variant="secondary">Pending Review</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span>Owner: {seller.user?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{seller.user?.email || seller.storeEmail || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{seller.storePhone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{seller.storeAddress || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Applied: {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                  {seller.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {seller.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      setSelectedSeller(seller);
                      setShowVerifyDialog(true);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Review & Verify
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Seller</DialogTitle>
            <DialogDescription>
              Review the seller's application and decide whether to approve or reject
            </DialogDescription>
          </DialogHeader>
          {selectedSeller && (
            <VerifySellerForm
              seller={selectedSeller}
              onSuccess={() => {
                setShowVerifyDialog(false);
                onRefresh();
              }}
              onCancel={() => setShowVerifyDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}