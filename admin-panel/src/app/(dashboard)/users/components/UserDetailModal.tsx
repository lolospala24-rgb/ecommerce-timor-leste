'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/useUsers';
import {
  Mail,
  Phone,
  Calendar,
  Shield,
  ShoppingBag,
  Star,
  MapPin,
  Building,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface UserDetailModalProps {
  userId: number | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function UserDetailModal({
  userId,
  open,
  onClose,
  onRefresh,
}: UserDetailModalProps) {
  const { data: user, isLoading } = useUser(userId || 0);
  const [isBlocking, setIsBlocking] = useState(false);

  if (!userId) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500';
      case 'SELLER':
        return 'bg-blue-500';
      default:
        return 'bg-green-500';
    }
  };

  const handleToggleBlock = async () => {
    if (!user) return;
    setIsBlocking(true);
    try {
      if (user.isActive) {
        await api.patch(`/users/${user.id}/block`);
        toast.success(`User ${user.name} has been blocked`);
      } else {
        await api.patch(`/users/${user.id}/unblock`);
        toast.success(`User ${user.name} has been unblocked`);
      }
      onRefresh();
    } catch (error) {
      toast.error('Failed to update user status');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            View and manage user information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !user ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">User not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground text-lg font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-semibold leading-tight">{user.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(user.role)} text-white`}>{user.role}</Badge>
                    <Badge variant={user.isActive ? 'default' : 'destructive'} className="text-xs px-2 py-0.5 rounded">
                      {user.isActive ? 'Active' : 'Blocked'}
                    </Badge>
                    {user.emailVerified && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>Verified</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Button
                  variant={user.isActive ? 'destructive' : 'default'}
                  onClick={handleToggleBlock}
                  disabled={isBlocking}
                  className="h-9"
                >
                  {user.isActive ? 'Block User' : 'Unblock User'}
                </Button>
              </div>
            </div>

            {/* User Info Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 bg-surface rounded-md p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                {user.lastLoginAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Last login: {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 bg-surface rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Orders</span>
                  </div>
                  <div className="font-medium">{user._count?.orders || 0}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Reviews</span>
                  </div>
                  <div className="font-medium">{user._count?.reviews || 0}</div>
                </div>
              </div>
            </div>

            {/* Tabs for additional info */}
            <Tabs defaultValue="orders" className="space-y-4">
              <TabsList>
                <TabsTrigger value="orders">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Recent Orders
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  <Star className="h-4 w-4 mr-2" />
                  Recent Reviews
                </TabsTrigger>
                {user.role === 'SELLER' && user.seller && (
                  <TabsTrigger value="store">
                    <Building className="h-4 w-4 mr-2" />
                    Store Info
                  </TabsTrigger>
                )}
                {user.customerAddress && user.customerAddress.length > 0 && (
                  <TabsTrigger value="addresses">
                    <MapPin className="h-4 w-4 mr-2" />
                    Addresses
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="orders">
                <div className="space-y-3">
                  {user.orders && user.orders.length > 0 ? (
                    user.orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div>
                          <p className="font-mono text-sm">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${order.total.toLocaleString()}</p>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No orders found
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="space-y-4">
                  {user.reviews && user.reviews.length > 0 ? (
                    user.reviews.map((review: any) => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{review.comment}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Product: {review.product.name}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No reviews found
                    </p>
                  )}
                </div>
              </TabsContent>

              {user.role === 'SELLER' && user.seller && (
                <TabsContent value="store">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium">Store Name</p>
                        <p className="text-sm text-muted-foreground">
                          {user.seller.storeName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Store Phone</p>
                        <p className="text-sm text-muted-foreground">
                          {user.seller.storePhone}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium">Store Address</p>
                        <p className="text-sm text-muted-foreground">
                          {user.seller.storeAddress}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Verification Status</p>
                        <Badge variant={user.seller.isVerified ? 'default' : 'secondary'}>
                          {user.seller.isVerified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Products</p>
                        <p className="text-sm text-muted-foreground">
                          {user.seller._count?.products || 0} products
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {user.customerAddress && user.customerAddress.length > 0 && (
                <TabsContent value="addresses">
                  <div className="space-y-3">
                    {user.customerAddress.map((address: any) => (
                      <div
                        key={address.id}
                        className="border rounded-lg p-4 relative"
                      >
                        {address.isPrimary && (
                          <Badge className="absolute top-2 right-2">Primary</Badge>
                        )}
                        <p className="font-medium">{address.label || 'Address'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {address.street && `${address.street}, `}
                          {address.village && `${address.village}, `}
                          {address.suco}, {address.postoAdmin}, {address.municipality}
                        </p>
                        {address.reference && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reference: {address.reference}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Phone: {address.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}