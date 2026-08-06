'use client';

import { useState } from 'react';
import { usePayments } from '@/hooks/usePayments';
import { PaymentsTable } from './components/PaymentsTable';
import { PaymentFilters } from './components/PaymentFilters';
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
import { Download, RefreshCw, DollarSign } from 'lucide-react';
import { VerifyPaymentModal } from './components/VerifyPaymentModal';

export default function PaymentsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    method: '',
    startDate: '',
    endDate: '',
  });
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const { data, isLoading, refetch } = usePayments(filters);

  const handleVerifyPayment = (paymentId: number) => {
    setSelectedPaymentId(paymentId);
    setShowVerifyModal(true);
  };

  const handleExport = async () => {
    window.location.href = `/api/payments/export?${new URLSearchParams({
      status: filters.status,
      method: filters.method,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })}`;
  };

  const getStatusCounts = () => {
    if (!data?.data) return {};
    return data.data.reduce((acc: any, payment: any) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {});
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments Management</h1>
          <p className="text-muted-foreground">
            Manage and verify customer payments
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
        </div>
      </div>

      <PaymentFilters filters={filters} setFilters={setFilters} />

      <Tabs defaultValue="all" className="space-y-4" onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value, page: 1 })}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all" className="flex gap-2">
            All
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {data?.pagination?.total || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="PENDING" className="flex gap-2">
            Pending
            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.PENDING || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="PAID" className="flex gap-2">
            Paid
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.PAID || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="FAILED" className="flex gap-2">
            Failed
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.FAILED || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="REFUNDED" className="flex gap-2">
            Refunded
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
              {statusCounts.REFUNDED || 0}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filters.status || 'all'} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>
                Total {data?.pagination?.total || 0} payments found
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
                <PaymentsTable
                  payments={data?.data || []}
                  onVerifyPayment={handleVerifyPayment}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <VerifyPaymentModal
        paymentId={selectedPaymentId}
        open={showVerifyModal}
        onClose={() => {
          setShowVerifyModal(false);
          setSelectedPaymentId(null);
        }}
        onRefresh={refetch}
      />
    </div>
  );
}