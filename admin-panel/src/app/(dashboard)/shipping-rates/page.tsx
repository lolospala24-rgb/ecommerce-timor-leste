'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { useShippingRates, ShippingRateData } from '@/hooks/useShippingRates';
import { ShippingRatesTable } from './components/ShippingRatesTable';
import { ShippingRateForm } from './components/ShippingRateForm';

export default function ShippingRatesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRateData | null>(null);
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useShippingRates();

  const rates: ShippingRateData[] = data ?? [];

  const filteredRates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rates;
    return rates.filter((rate) => {
      const courierName = rate.courier?.name || rate.courierService?.courier?.name || '';
      const municipalityName = rate.municipalityRef?.name || rate.provinceRef?.name || '';
      return (
        courierName.toLowerCase().includes(term) ||
        municipalityName.toLowerCase().includes(term) ||
        rate.zoneName.toLowerCase().includes(term) ||
        (rate.shippingMethod || '').toLowerCase().includes(term)
      );
    });
  }, [rates, search]);

  const activeRates = filteredRates.filter((r) => r.status === 'ACTIVE');
  const inactiveRates = filteredRates.filter((r) => r.status !== 'ACTIVE');

  const handleEdit = (rate: ShippingRateData) => {
    setEditingRate(rate);
    setShowDialog(true);
  };

  const handleOpenCreate = () => {
    setEditingRate(null);
    setShowDialog(true);
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setEditingRate(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping Rates</h1>
          <p className="text-muted-foreground">
            Manage courier coverage and pricing per municipality. Each row is one courier serving one municipality.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Shipping Rate
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by courier or municipality..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Rates</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Rates</CardTitle>
              <CardDescription>
                {filteredRates.length ? `${filteredRates.length} shipping rates found` : 'No shipping rates found'}
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
                <ShippingRatesTable rates={filteredRates} onEdit={handleEdit} onRefresh={refetch} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Rates</CardTitle>
              <CardDescription>Rates currently used to price and cover deliveries.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <ShippingRatesTable rates={activeRates} onEdit={handleEdit} onRefresh={refetch} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Rates</CardTitle>
              <CardDescription>Rates not currently available at checkout.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <ShippingRatesTable rates={inactiveRates} onEdit={handleEdit} onRefresh={refetch} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Shipping Rate' : 'Add Shipping Rate'}</DialogTitle>
          </DialogHeader>
          <ShippingRateForm initialData={editingRate} onSuccess={handleDialogClose} onCancel={handleDialogClose} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
