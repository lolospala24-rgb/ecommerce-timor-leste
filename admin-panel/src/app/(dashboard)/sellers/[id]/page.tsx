'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSeller, useUpdateSeller } from '@/hooks/useSellers';
import { useSellerBalanceAdmin, useSellerLedgerAdmin, useAdminCreatePayout } from '@/hooks/useFinance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaskedAccountNumber } from '@/components/shared/MaskedAccountNumber';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Store,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Package,
  ShoppingBag,
  Star,
  TrendingUp,
  Wallet,
  Clock,
  Landmark,
  Pencil,
  Loader2,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { VerifySellerForm } from '../components/VerifySellerForm';
import toast from 'react-hot-toast';

export default function SellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = parseInt(params.id as string);
  const { data: seller, isLoading, refetch } = useSeller(sellerId);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  const { data: balance } = useSellerBalanceAdmin(sellerId);
  const { data: ledger } = useSellerLedgerAdmin(sellerId, 1, 8);
  const updateSeller = useUpdateSeller();
  const createPayout = useAdminCreatePayout();

  const [editingBank, setEditingBank] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  useEffect(() => {
    if (seller) {
      setBankName(seller.bankName || '');
      setBankAccountName(seller.bankAccountName || '');
      setBankAccountNumber(seller.bankAccountNumber || '');
    }
  }, [seller]);

  const hasBankDetails = !!(seller?.bankName && seller?.bankAccountName && seller?.bankAccountNumber);
  const available = balance?.availableAmount ?? 0;
  const payoutAmountNumber = parseFloat(payoutAmount);
  const canRequestPayout = hasBankDetails && payoutAmountNumber > 0 && payoutAmountNumber <= available;

  const handleSaveBank = async () => {
    await updateSeller.mutateAsync({
      id: sellerId,
      data: { bankName: bankName.trim(), bankAccountName: bankAccountName.trim(), bankAccountNumber: bankAccountNumber.trim() } as any,
    });
    setEditingBank(false);
  };

  const handleCreatePayout = async () => {
    if (!canRequestPayout) return;
    await createPayout.mutateAsync({ sellerId, amount: payoutAmountNumber });
    setShowPayoutDialog(false);
    setPayoutAmount('');
  };

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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Store className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Seller Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The seller you're looking for doesn't exist or has been deleted.
        </p>
        <Button onClick={() => router.push('/sellers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sellers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Seller Details</h1>
            <p className="text-muted-foreground">
              Manage seller information and verification
            </p>
          </div>
        </div>
        {!seller.isVerified && (
          <Button onClick={() => setShowVerifyDialog(true)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Verify Seller
          </Button>
        )}
      </div>

      {/* Seller Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <Avatar className="h-24 w-24">
                {seller.storeLogo && (
                  <AvatarImage src={seller.storeLogo} alt={seller.storeName || 'Store'} />
                )}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(seller.storeName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h2 className="text-2xl font-bold">{seller.storeName || 'Unnamed Store'}</h2>
                {seller.isVerified ? (
                  <Badge className="bg-green-500 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-2 text-sm">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span>Owner: {seller.user?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{seller.storeEmail || seller.user?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{seller.storePhone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm md:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{seller.storeAddress || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined: {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              {seller.description && (
                <p className="mt-3 text-sm text-muted-foreground">{seller.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seller._count?.products || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seller._count?.orders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${seller.totalRevenue?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {seller.rating?.toFixed(1) || '0'}
              <span className="text-sm text-muted-foreground"> / 5</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {seller.totalReviews || 0} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seller Balance & Payouts — the seller has no self-service dashboard,
          this page is the single place their finances are managed. */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Seller Balance
              </CardTitle>
              <CardDescription>
                Net earnings after platform commission. Moves from pending to available when an order is delivered.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowPayoutDialog(true)} disabled={!hasBankDetails || available <= 0}>
              <Wallet className="mr-2 h-4 w-4" />
              Create Payout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Pending
              </div>
              <p className="mt-1 text-xl font-bold">
                ${(balance?.pendingAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Available
              </div>
              <p className="mt-1 text-xl font-bold text-green-600">
                ${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4" />
                Processing
              </div>
              <p className="mt-1 text-xl font-bold text-blue-600">
                ${(balance?.processingAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Paid Out
              </div>
              <p className="mt-1 text-xl font-bold">
                ${(balance?.paidOutAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4" />
                Refunded
              </div>
              <p className="mt-1 text-xl font-bold text-red-600">
                ${(balance?.refundedAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Bank details — editable here since the seller has no
              self-service page of their own to set these. */}
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Landmark className="h-4 w-4" />
                Payout Bank Details
              </div>
              {!editingBank && (
                <Button size="sm" variant="ghost" onClick={() => setEditingBank(true)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  {hasBankDetails ? 'Edit' : 'Add'}
                </Button>
              )}
            </div>
            {editingBank ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bank Name</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account Holder</Label>
                  <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account Number</Label>
                  <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <Button
                    size="sm"
                    disabled={!bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim() || updateSeller.isPending}
                    onClick={handleSaveBank}
                  >
                    {updateSeller.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingBank(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : hasBankDetails ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {seller.bankName} — {seller.bankAccountName} (<MaskedAccountNumber value={seller.bankAccountNumber} />)
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No payout bank details on file yet.</p>
            )}
          </div>

          {/* Ledger — every balance-affecting event for this seller. */}
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4" />
              Recent Ledger Activity
            </div>
            <div className="mt-2 divide-y">
              {!ledger?.data || ledger.data.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No financial activity yet.</p>
              ) : (
                ledger.data.map((entry) => {
                  // Never sum these — a pure transfer between buckets (e.g.
                  // RELEASE: pending -45, available +45) nets to zero even
                  // though $45 genuinely moved. Show each nonzero bucket on
                  // its own line instead of one collapsed (and misleading)
                  // total.
                  const movements: { label: string; value: number }[] = [
                    { label: 'Pending', value: entry.pendingDelta },
                    { label: 'Available', value: entry.availableDelta },
                    { label: 'Processing', value: entry.processingDelta },
                    { label: 'Paid Out', value: entry.paidOutDelta },
                    { label: 'Refunded', value: entry.refundedDelta },
                  ].filter((m) => Math.abs(m.value) > 0.001);

                  return (
                    <div key={entry.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <span className="font-medium">{entry.type}</span>
                        {entry.order?.orderNumber && (
                          <span className="text-muted-foreground"> · {entry.order.orderNumber}</span>
                        )}
                        <p className="text-xs text-muted-foreground">{entry.note}</p>
                      </div>
                      <div className="text-right">
                        {movements.length === 0 ? (
                          <span className="text-muted-foreground">$0.00</span>
                        ) : (
                          movements.map((m) => (
                            <div key={m.label} className={m.value >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {m.label} {m.value >= 0 ? '+' : ''}
                              {m.value.toFixed(2)}
                            </div>
                          ))
                        )}
                        <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Payout Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payout</DialogTitle>
            <DialogDescription>
              Pays out from {seller.storeName}&apos;s available balance (${available.toFixed(2)}). Marks the
              payout Approved immediately — you&apos;ll still need to mark it Paid once the transfer is actually sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="payout-amount">Amount</Label>
            <Input
              id="payout-amount"
              type="number"
              min={0.01}
              max={available}
              step={0.01}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
            />
            {payoutAmount && payoutAmountNumber > available && (
              <p className="text-sm text-red-600">Amount exceeds available balance.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              Cancel
            </Button>
            <Button disabled={!canRequestPayout || createPayout.isPending} onClick={handleCreatePayout}>
              {createPayout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Payout
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          {seller.description && <TabsTrigger value="description">Store Description</TabsTrigger>}
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Products listed by this seller</CardDescription>
            </CardHeader>
            <CardContent>
              {seller.products && seller.products.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {seller.products.map((product: any) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      target="_blank"
                      className="block border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                        {product.thumbnail ? (
                          <img
                            src={product.thumbnail}
                            alt={product.name || 'Product'}
                            className="h-32 w-32 object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/placeholder.png';
                            }}
                          />
                        ) : (
                          <Package className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <h3 className="font-medium line-clamp-1">{product.name || 'Unnamed Product'}</h3>
                      <p className="text-lg font-bold text-primary mt-1">
                        ${product.price?.toLocaleString() || '0'}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Stock: {product.stock || 0}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p>No products found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders from this seller's store</CardDescription>
            </CardHeader>
            <CardContent>
              {seller.orders && seller.orders.length > 0 ? (
                <div className="space-y-3">
                  {seller.orders.map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-mono text-sm hover:text-primary transition-colors"
                        >
                          {order.orderNumber || 'N/A'}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Customer: {order.customer?.name || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${order.total?.toLocaleString() || '0'}
                        </p>
                        <Badge variant="outline">{order.status || 'N/A'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p>No orders found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {seller.description && (
          <TabsContent value="description">
            <Card>
              <CardHeader>
                <CardTitle>Store Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{seller.description}</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Verify Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Seller</DialogTitle>
            <DialogDescription>
              Review and verify this seller's store
            </DialogDescription>
          </DialogHeader>
          <VerifySellerForm
            seller={seller}
            onSuccess={() => {
              setShowVerifyDialog(false);
              refetch();
              toast.success('Seller verification completed');
            }}
            onCancel={() => setShowVerifyDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Trust Badges */}
      <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span>{seller.isVerified ? 'Verified Seller' : 'Verification Pending'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Package className="h-5 w-5 text-primary" />
          <span>{seller._count?.products || 0} Products Available</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <span>{seller._count?.orders || 0} Orders Completed</span>
        </div>
      </div>
    </div>
  );
}