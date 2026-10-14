'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountAppBarProps {
  title: string;
  /** Explicit back target. Omit to fall back to browser history (router.back()). */
  backHref?: string;
  rightAction?: ReactNode;
  className?: string;
}

// Back button only shows on mobile (md:hidden) — desktop/tablet keep the
// persistent hub menu from AccountLayout, so there's nothing to "go back" to.
export function AccountAppBar({ title, backHref, rightAction, className }: AccountAppBarProps) {
  const router = useRouter();

  const backButtonClass =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 md:hidden';

  return (
    <div
      className={cn(
        'sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b bg-card px-4 py-3 md:static md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:pb-4 md:pt-0',
        className,
      )}
    >
      {backHref ? (
        <Link href={backHref} aria-label="Fila" className={backButtonClass}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      ) : (
        <button type="button" onClick={() => router.back()} aria-label="Fila" className={backButtonClass}>
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 truncate text-lg font-extrabold text-foreground md:text-2xl">{title}</h1>
      {rightAction}
    </div>
  );
}
