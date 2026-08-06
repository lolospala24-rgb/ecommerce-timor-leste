'use client';

import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { UsersTable } from './components/UsersTable';
import { UserFilters } from './components/UserFilters';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Download, RefreshCw } from 'lucide-react';
import { UserDetailModal } from './components/UserDetailModal';

export default function UsersPage() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    role: '',
    isActive: undefined as boolean | undefined,
  });

  const { data, isLoading, refetch } = useUsers(filters);

  const handleViewUser = (userId: number) => {
    setSelectedUserId(userId);
    setShowDetailModal(true);
  };

  const handleExport = async () => {
    // Export users to CSV
    window.location.href = '/api/users/export';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground">
            Manage all registered users on the platform
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
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Total {data?.pagination?.total || 0} users found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserFilters filters={filters} setFilters={setFilters} />
          
          {isLoading ? (
            <div className="space-y-3 mt-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <UsersTable
              users={data?.data || []}
              onViewUser={handleViewUser}
              onRefresh={refetch}
            />
          )}
        </CardContent>
      </Card>

      <UserDetailModal
        userId={selectedUserId}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedUserId(null);
        }}
        onRefresh={refetch}
      />
    </div>
  );
}