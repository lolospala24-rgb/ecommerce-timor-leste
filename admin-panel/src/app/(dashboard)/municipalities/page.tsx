'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { useMunicipalities, MunicipalityData } from '@/hooks/useMunicipalities';
import { MunicipalitiesTable } from './components/MunicipalitiesTable';
import { MunicipalityForm } from './components/MunicipalityForm';

export default function MunicipalitiesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingMunicipality, setEditingMunicipality] = useState<MunicipalityData | null>(null);
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useMunicipalities(search || undefined);

  const municipalities: MunicipalityData[] = data ?? [];
  const activeMunicipalities = municipalities.filter((m) => m.isActive);
  const inactiveMunicipalities = municipalities.filter((m) => !m.isActive);

  const handleEdit = (municipality: MunicipalityData) => {
    setEditingMunicipality(municipality);
    setShowDialog(true);
  };

  const handleOpenCreate = () => {
    setEditingMunicipality(null);
    setShowDialog(true);
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setEditingMunicipality(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Municipalities</h1>
          <p className="text-muted-foreground">Manage Timor-Leste municipalities used for addresses and shipping coverage.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Municipality
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search municipalities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Municipalities</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Municipalities</CardTitle>
              <CardDescription>
                {municipalities.length ? `${municipalities.length} municipalities found` : 'No municipalities found'}
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
                <MunicipalitiesTable municipalities={municipalities} onEdit={handleEdit} onRefresh={refetch} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Municipalities</CardTitle>
              <CardDescription>Municipalities available for addresses and shipping.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <MunicipalitiesTable municipalities={activeMunicipalities} onEdit={handleEdit} onRefresh={refetch} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Municipalities</CardTitle>
              <CardDescription>Municipalities hidden from address and shipping selection.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <MunicipalitiesTable municipalities={inactiveMunicipalities} onEdit={handleEdit} onRefresh={refetch} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMunicipality ? 'Edit Municipality' : 'Add Municipality'}</DialogTitle>
          </DialogHeader>
          <MunicipalityForm
            initialData={editingMunicipality}
            onSuccess={handleDialogClose}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
