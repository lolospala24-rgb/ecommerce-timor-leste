'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSeller } from '@/hooks/useSellers';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { VerifySellerForm } from '../components/VerifySellerForm';
import toast from 'react-hot-toast';

export default function SellerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = parseInt(params.id as string);
  const { data: seller, isLoading, refetch } = useSeller(sellerId);
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