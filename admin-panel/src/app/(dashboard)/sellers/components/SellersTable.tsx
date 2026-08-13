'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface SellersTableProps {
  sellers: any[];
  onViewSeller: (sellerId: number) => void;
  onRefresh: () => void;
}

export function SellersTable({ sellers, onViewSeller, onRefresh }: SellersTableProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleDeleteSeller = async () => {
    if (!selectedSeller) return;
    setIsLoading(true);
    try {
      await api.delete(`/sellers/${selectedSeller.id}`);
      toast.success(`Seller ${selectedSeller.storeName} has been deleted`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete seller');
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setSelectedSeller(null);
    }
  };

  const handleVerify = (sellerId: number) => {
    router.push(`/sellers/${sellerId}`);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Store</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sellers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                No sellers found
              </TableCell>
            </TableRow>
          ) : (
            sellers.map((seller) => (
              <TableRow key={seller.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {seller.storeLogo && (
                        <AvatarImage src={seller.storeLogo} alt={seller.storeName || 'Store'} />
                      )}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(seller.storeName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{seller.storeName || 'Unnamed Store'}</span>
                  </div>
                </TableCell>
                <TableCell>{seller.user?.name || '-'}</TableCell>
                <TableCell>{seller.user?.email || seller.storeEmail || '-'}</TableCell>
                <TableCell>{seller.storePhone || '-'}</TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>{seller._count?.products || 0}</TableCell>
                <TableCell className="text-sm">
                  {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewSeller(seller.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {!seller.isVerified && (
                        <DropdownMenuItem onClick={() => handleVerify(seller.id)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Verify Seller
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setSelectedSeller(seller);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Seller
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Seller"
        description={`Are you sure you want to delete ${selectedSeller?.storeName || 'this seller'}? This will also delete all products and orders associated with this seller. This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteSeller}
        isLoading={isLoading}
      />
    </>
  );
}