'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSeller } from '@/hooks/useSellers';
import {
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
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { VerifySellerForm } from './VerifySellerForm';
import toast from 'react-hot-toast';

interface SellerDetailModalProps {
  sellerId: number | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function SellerDetailModal({
  sellerId,
  open,
  onClose,
  onRefresh,
}: SellerDetailModalProps) {
  const { data: seller, isLoading } = useSeller(sellerId || 0);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const sellerData = seller && ((seller as any).data ?? seller);

  if (!sellerId) return null;

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seller Details</DialogTitle>
          <DialogDescription>
            View and manage seller information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !sellerData ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Seller not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seller Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {sellerData?.storeLogo && (
                    <AvatarImage src={sellerData.storeLogo} alt={sellerData.storeName || 'Store'} />
                  )}
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(sellerData?.storeName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{sellerData?.storeName || 'Unnamed Store'}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {sellerData?.isVerified ? (
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
                    <Link href={`/sellers/${sellerData?.id ?? sellerId}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Full Page
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              {!sellerData?.isVerified && (
                <Button onClick={() => setShowVerifyForm(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify
                </Button>
              )}
            </div>

            {/* Seller Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span>Owner: {sellerData.user?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{sellerData.storeEmail || sellerData.user?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{sellerData.storePhone || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{sellerData?.storeAddress || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined: {sellerData?.createdAt ? new Date(sellerData.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="border rounded-lg p-3 text-center">
                <Package className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{sellerData?._count?.products || 0}</p>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <ShoppingBag className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{sellerData?._count?.orders || 0}</p>
                <p className="text-xs text-muted-foreground">Orders</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">
                  ${sellerData?.totalRevenue?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <Star className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{sellerData?.rating?.toFixed(1) || '0'}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
            </div>

            {/* Store Description */}
            {sellerData.description && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="font-semibold mb-2">Store Description</h3>
                <p className="text-sm text-muted-foreground">{sellerData.description}</p>
              </div>
            )}

            {/* Products Preview */}
            {sellerData?.products && sellerData.products.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Recent Products</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {sellerData.products.slice(0, 4).map((product: any) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      target="_blank"
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        {product.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.thumbnail}
                            alt={product.name || 'Product'}
                            className="h-10 w-10 object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/placeholder.png';
                            }}
                          />
                        ) : (
                          <Package className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{product.name || 'Unnamed Product'}</p>
                        <p className="text-sm text-primary">${product.price?.toLocaleString() || '0'}</p>
                      </div>
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Verify Form */}
            {showVerifyForm && (
              <div className="border-t pt-4 mt-4">
                <VerifySellerForm
                  seller={sellerData}
                  onSuccess={() => {
                    setShowVerifyForm(false);
                    onRefresh();
                    toast.success('Seller verification completed');
                  }}
                  onCancel={() => setShowVerifyForm(false)}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}