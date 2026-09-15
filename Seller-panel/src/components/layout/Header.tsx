'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, ChevronDown, LogOut, Store, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadCount, useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data: unread } = useUnreadCount();
  const { data: recent } = useNotifications({ page: 1, limit: 5 });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <form onSubmit={handleSearch} className="hidden flex-1 max-w-md items-center gap-2 rounded-md border bg-background px-3 py-2 md:flex">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your products…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>

      <div className="flex flex-1 items-center justify-end gap-2 md:flex-none md:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <Bell className="h-5 w-5" />
              {!!unread?.count && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
                  {unread.count > 9 ? '9+' : unread.count}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recent?.data && recent.data.length > 0 ? (
              recent.data.map((n) => (
                <DropdownMenuItem key={n.id} asChild className="flex-col items-start gap-0.5 whitespace-normal py-2">
                  <Link href="/notifications">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </Link>
                </DropdownMenuItem>
              ))
            ) : (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet</p>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="justify-center text-sm font-medium text-primary">
                View all
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {user?.name ? getInitials(user.name) : 'S'}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium leading-tight">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.seller?.storeName}</p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/my-store/profile">
                <Store className="mr-2 h-4 w-4" /> My Store
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/my-store/settings">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
