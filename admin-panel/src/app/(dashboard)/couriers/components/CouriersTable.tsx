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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useDeleteCourier } from '@/hooks/useCouriers';

interface CourierItem {
  id: number;
  name: string;
  code: string;
  phone?: string;
  website?: string;
  trackingUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CouriersTableProps {
  couriers: CourierItem[];
  onEdit: (courier: CourierItem) => void;
  onRefresh: () => void;
}

export function CouriersTable({ couriers, onEdit, onRefresh }: CouriersTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<CourierItem | null>(null);
  const { mutateAsync: deleteCourier, isPending: isDeleting } = useDeleteCourier();

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleDeleteCourier = async () => {
    if (!selectedCourier) return;
    try {
      await deleteCourier(selectedCourier.id);
      onRefresh();
    } catch {
      // The hook already shows the error toast.
    } finally {
      setDeleteDialogOpen(false);
      setSelectedCourier(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Courier</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Tracking URL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {couriers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                No couriers found
              </TableCell>
            </TableRow>
          ) : (
            couriers.map((courier) => (
              <TableRow key={courier.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(courier.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <p className="font-medium">{courier.name}</p>
                      <p className="text-xs text-muted-foreground">{courier.phone || 'No phone'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{courier.code}</TableCell>
                <TableCell>{courier.phone || '-'}</TableCell>
                <TableCell>
                  {courier.website ? (
                    <a href={courier.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Visit
                    </a>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {courier.trackingUrl ? (
                    <a href={courier.trackingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Track
                    </a>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={courier.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                    {courier.status}
                  </Badge>
                </TableCell>
                <TableCell>{courier.createdAt ? new Date(courier.createdAt).toLocaleDateString() : '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(courier)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCourier(courier);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Courier"
        description={`Are you sure you want to delete ${selectedCourier?.name ?? 'this courier'}? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteCourier}
        isLoading={isDeleting}
      />
    </>
  );
}
