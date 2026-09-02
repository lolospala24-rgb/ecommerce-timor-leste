'use client';

import { useState } from 'react';
import { useSellers } from '@/hooks/useSellers';
import { SellersTable } from './components/SellersTable';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PendingVerification } from './components/PendingVerification';
import { CreateSellerForm } from './components/CreateSellerForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, RefreshCw, Store, Plus } from 'lucide-react';
import { SellerDetailModal } from './components/SellerDetailModal';
import { ErrorState } from '@/components/shared/ErrorState';
import Link from 'next/link';

export default function SellersPage() {
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    isVerified: undefined as boolean | undefined,
  });

  const { data, isLoading, isError, refetch } = useSellers(filters);

  const handleViewSeller = (sellerId: number) => {
    setSelectedSellerId(sellerId);
    setShowDetailModal(true);
  };

  const handleExport = async () => {
    window.location.href = '/api/sellers/export';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sellers Management</h1>
          <p className="text-muted-foreground">
            Manage all registered sellers and their stores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Seller
          </Button>
          <Link href="/sellers/verification">
            <Button variant="default">
              <Store className="mr-2 h-4 w-4" />
              Pending Verification
            </Button>
          </Link>
        </div>
      </div>

      {isError ? (
        <Card>
          <CardContent>
            <ErrorState description="Couldn't load sellers. Check your connection and try again." onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : (
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Sellers</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Sellers</CardTitle>
              <CardDescription>
                Total {data?.pagination?.total || 0} sellers found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <SellersTable
                  sellers={data?.data || []}
                  onViewSeller={handleViewSeller}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <CardTitle>Verified Sellers</CardTitle>
              <CardDescription>
                Sellers who have been approved
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <SellersTable
                  sellers={(data?.data || []).filter(s => s.isVerified)}
                  onViewSeller={handleViewSeller}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <PendingVerification onRefresh={refetch} />
        </TabsContent>
      </Tabs>
      )}

      <SellerDetailModal
        sellerId={selectedSellerId}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSellerId(null);
        }}
        onRefresh={refetch}
      />

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Seller</DialogTitle>
            <DialogDescription>
              Create a new seller account from the admin panel.
            </DialogDescription>
          </DialogHeader>
          <CreateSellerForm
            onSuccess={() => {
              setShowCreateDialog(false);
              refetch();
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}