'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCheck } from 'lucide-react';
import {
  useAdminNotificationsList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type NotificationCategoryFilter,
} from '@/hooks/useAdminNotifications';
import {
  notificationHref,
  relativeTime,
  PRIORITY_DOT_COLOR,
  CATEGORY_LABEL,
  type AdminNotification,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';

type TabValue = 'all' | 'unread' | NotificationCategoryFilter;

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'ORDER', label: 'Orders' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'SELLER', label: 'Sellers' },
  { value: 'PRODUCT', label: 'Products' },
  { value: 'CUSTOMER', label: 'Customers' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabValue>('all');
  const [page, setPage] = useState(1);

  const category: NotificationCategoryFilter = tab === 'all' || tab === 'unread' ? 'all' : tab;
  const unreadOnly = tab === 'unread';

  const { data, isLoading, isFetching } = useAdminNotificationsList({ page, category, unreadOnly });
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];

  const handleTabChange = (value: string) => {
    setTab(value as TabValue);
    setPage(1);
  };

  const handleOpen = (notification: AdminNotification) => {
    if (!notification.isRead) markAsRead.mutate(notification.id);
    const href = notificationHref(notification);
    if (href) router.push(href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Orders, payments, sellers, products, and other activity that needs your attention
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllAsRead.mutate()}
          disabled={markAllAsRead.isPending}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all as read
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              {data?.pagination?.total ?? 0} notification{(data?.pagination?.total ?? 0) === 1 ? '' : 's'}
              {tab !== 'all' ? ` · ${TABS.find((t) => t.value === tab)?.label}` : ''}
            </CardDescription>
          </div>
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList className="flex h-auto flex-wrap">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Bell className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm">
                {tab === 'unread' ? "You're all caught up." : 'Nothing here yet.'}
              </p>
            </div>
          ) : (
            <div className={cn('divide-y transition-opacity', isFetching && 'opacity-60')}>
              {notifications.map((notification) => {
                const href = notificationHref(notification);
                const dotColor = notification.priority ? PRIORITY_DOT_COLOR[notification.priority] : 'bg-blue-500';
                return (
                  <div
                    key={notification.id}
                    role={href ? 'button' : undefined}
                    onClick={href ? () => handleOpen(notification) : undefined}
                    className={cn(
                      'flex items-start gap-3 py-4 px-1 text-sm',
                      !notification.isRead && 'bg-amber-50/60',
                      href && 'cursor-pointer hover:bg-muted/50',
                    )}
                  >
                    <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', dotColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        {notification.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORY_LABEL[notification.category]}
                          </Badge>
                        )}
                        {!notification.isRead && (
                          <Badge className="bg-blue-600 text-[10px] hover:bg-blue-600">New</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-muted-foreground">{notification.message}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">{relativeTime(notification.createdAt)}</p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead.mutate(notification.id);
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
