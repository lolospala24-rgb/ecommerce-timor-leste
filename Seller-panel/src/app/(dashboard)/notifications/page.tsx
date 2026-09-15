'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  ClipboardList,
  Wallet,
  Truck,
  Store,
  Box,
  Users,
  Settings,
  ShieldAlert,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import type { NotificationCategory } from '@/types/notification.types';

const CATEGORY_ICON: Record<NotificationCategory, React.ElementType> = {
  ORDER: ClipboardList,
  PAYMENT: Wallet,
  SHIPPING: Truck,
  SELLER: Store,
  PRODUCT: Box,
  CUSTOMER: Users,
  SYSTEM: Settings,
  SECURITY: ShieldAlert,
};

const PRIORITY_TONE: Record<string, string> = {
  INFO: 'bg-accent text-accent-foreground',
  SUCCESS: 'bg-success/15 text-success',
  WARNING: 'bg-warning/15 text-warning',
  CRITICAL: 'bg-destructive/15 text-destructive',
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useNotifications({ page, limit: 20, unreadOnly });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your orders, payments, and store."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setUnreadOnly((v) => !v)}>
              {unreadOnly ? 'Show all' : 'Unread only'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !data?.data?.length ? (
          <EmptyState icon={Bell} title="You're all caught up" description="No notifications to show." />
        ) : (
          <>
            <div className="divide-y">
              {data.data.map((n) => {
                const Icon = CATEGORY_ICON[n.category] || Bell;
                return (
                  <div key={n.id} className={cn('flex items-start gap-3 p-4', !n.isRead && 'bg-accent/30')}>
                    <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', PRIORITY_TONE[n.priority])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{n.title}</p>
                        {!n.isRead && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      {!n.isRead && (
                        <button
                          onClick={() => markRead.mutate(n.id)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification.mutate(n.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4">
              <PaginationControls
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                hasNext={data.pagination.hasNext}
                hasPrev={data.pagination.hasPrev}
                total={data.pagination.total}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
