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
import { MoreHorizontal, Eye, Shield, Ban, UserCheck, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface UsersTableProps {
  users: any[];
  onViewUser: (userId: number) => void;
  onRefresh: () => void;
}

export function UsersTable({ users, onViewUser, onRefresh }: UsersTableProps) {
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      if (selectedUser.isActive) {
        await api.patch(`/users/${selectedUser.id}/block`);
        toast.success(`User ${selectedUser.name} has been blocked`);
      } else {
        await api.patch(`/users/${selectedUser.id}/unblock`);
        toast.success(`User ${selectedUser.name} has been unblocked`);
      }
      onRefresh();
    } catch (error) {
      toast.error('Failed to update user status');
    } finally {
      setIsLoading(false);
      setBlockDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      await api.post(`/users/${userId}/role`, { role: newRole });
      toast.success('User role updated successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || '-'}</TableCell>
                <TableCell>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'default' : 'destructive'}>
                    {user.isActive ? 'Active' : 'Blocked'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{user._count?.orders || 0}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewUser(user.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          setBlockDialogOpen(true);
                        }}
                      >
                        {user.isActive ? (
                          <>
                            <Ban className="mr-2 h-4 w-4" />
                            Block User
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Unblock User
                          </>
                        )}
                      </DropdownMenuItem>
                      {user.role !== 'ADMIN' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(user.id, 'CUSTOMER')}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Make Customer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(user.id, 'SELLER')}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Make Seller
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        title={selectedUser?.isActive ? 'Block User' : 'Unblock User'}
        description={
          selectedUser?.isActive
            ? `Are you sure you want to block ${selectedUser?.name}? They will no longer be able to access the platform.`
            : `Are you sure you want to unblock ${selectedUser?.name}? They will regain access to the platform.`
        }
        confirmText={selectedUser?.isActive ? 'Block' : 'Unblock'}
        onConfirm={handleBlockUser}
        isLoading={isLoading}
      />
    </>
  );
}