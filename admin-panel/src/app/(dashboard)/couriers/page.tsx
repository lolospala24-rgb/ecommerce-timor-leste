'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw } from 'lucide-react';
import { useCouriers, CourierData } from '@/hooks/useCouriers';
import { CouriersTable } from './components/CouriersTable';
import { CourierForm } from './components/CourierForm';

export default function CouriersPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingCourier, setEditingCourier] = useState<CourierData | null>(null);
  const { data, isLoading, refetch } = useCouriers();

  const activeCouriers: CourierData[] = (data ?? []).filter((courier) => courier.status === 'ACTIVE');
  const inactiveCouriers: CourierData[] = (data ?? []).filter((courier) => courier.status !== 'ACTIVE');

  const handleEdit = (courier: CourierData) => {
    setEditingCourier(courier);
    setShowDialog(true);
  };

  const handleOpenCreate = () => {
    setEditingCourier(null);
    setShowDialog(true);
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setEditingCourier(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courier Management</h1>
          <p className="text-muted-foreground">Manage courier partners, tracking URLs, and shipping providers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Courier
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Couriers</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Couriers</CardTitle>
              <CardDescription>
                {data?.length ? `${data.length} couriers available` : 'No courier partners found'}
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
                <CouriersTable
                  couriers={data || []}
                  onEdit={handleEdit}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Couriers</CardTitle>
              <CardDescription>Couriers with ACTIVE status.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <CouriersTable
                  couriers={activeCouriers}
                  onEdit={handleEdit}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Couriers</CardTitle>
              <CardDescription>Couriers with non-active status.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <CouriersTable
                  couriers={inactiveCouriers}
                  onEdit={handleEdit}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingCourier ? 'Edit Courier' : 'Add Courier'}</DialogTitle>
          </DialogHeader>
          <CourierForm
            initialData={editingCourier}
            onSuccess={handleDialogClose}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
