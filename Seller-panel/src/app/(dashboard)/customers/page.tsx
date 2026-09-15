'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSellerCustomers } from '@/hooks/useCustomers';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function CustomersPage() {
  const { data: customers, isLoading } = useSellerCustomers();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone?.includes(q));
  }, [customers, search]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone who has ordered from your store — built from your own order history, never the platform-wide customer list."
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers…" className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No customers yet" description="Once someone orders from your store, they'll show up here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Delivery Address</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <p>{customer.email}</p>
                    <p>{customer.phone}</p>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{customer.deliveryAddress || '—'}</TableCell>
                  <TableCell className="tabular-nums">{customer.totalOrders}</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatCurrency(customer.totalSpent)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(customer.lastOrderDate), 'MMM d, yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
