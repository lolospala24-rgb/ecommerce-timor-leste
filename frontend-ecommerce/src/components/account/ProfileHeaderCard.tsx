'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/formatters';
import type { User } from '@/types/user.types';

export function ProfileHeaderCard({ user }: { user: User }) {
  return (
    <Link
      href="/account/profile"
      className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <Avatar className="h-16 w-16 shrink-0">
        <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
        <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-extrabold text-foreground">{user.name}</p>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {user.role === 'SELLER' ? 'Seller' : 'Membru foun'}
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary px-3 py-1.5 text-sm font-semibold text-primary">
        <Pencil className="h-3.5 w-3.5" />
        Edita
      </span>
    </Link>
  );
}
