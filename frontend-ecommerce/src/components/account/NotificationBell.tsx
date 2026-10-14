'use client';

import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';

// Condensed version of Header.tsx's notification dropdown — same hook
// (single source of truth for unread state), trimmed list UI so the hub
// app bar's bell button has somewhere real to go on mobile, where the
// full Header dropdown isn't present.
export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead } = useOrderNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifikasaun"
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">La iha notifikasaun</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`cursor-pointer border-b px-4 py-3 text-left transition hover:bg-muted/50 ${n.isRead ? 'bg-background' : 'bg-muted/40'}`}
              onClick={() => {
                markAsRead(n.id);
                if (n.productSlug) router.push(`/products/${n.productSlug}`);
                else if (n.orderId) router.push(`/account/orders/${n.orderId}`);
              }}
            >
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.message}</p>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
