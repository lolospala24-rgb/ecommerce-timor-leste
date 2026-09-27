'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useCategoryTree } from '@/hooks/useCategories';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight, ArrowRight, X, Search } from 'lucide-react';
import type { Category, CategoryChild } from '@/types/category.types';

interface CategoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CategoryNode = Category | CategoryChild;

const isLocalCategory = (name: string) => /local/i.test(name);

// Mobile-only "All Categories" experience — deliberately its own Sheet with
// its own state, never sharing open/close with MobileNav's hamburger
// drawer. Tapping a category drills into its subcategories in place (back
// arrow appears); tapping a subcategory navigates and closes — unless that
// subcategory has children of its own, in which case it drills in again,
// to any depth the taxonomy actually has. `categoryPath` is the drill-down
// stack (empty = top level, last entry = the level currently shown). The
// Android/browser hardware back button steps back one level at a time
// instead of leaving the page, via a single pushed history entry consumed
// on popstate (see the history effect below) — this already generalizes
// cleanly from one level to a whole stack, see its comment.
export function CategoryDrawer({ open, onOpenChange }: CategoryDrawerProps) {
  const { t } = useTranslation();
  const { data: tree } = useCategoryTree();
  const categories = (tree ?? []) as Category[];

  const [categoryPath, setCategoryPath] = useState<CategoryNode[]>([]);
  const [search, setSearch] = useState('');
  const categoryPathRef = useRef(categoryPath);
  useEffect(() => {
    categoryPathRef.current = categoryPath;
  }, [categoryPath]);

  const current = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1] : null;
  const currentList: CategoryNode[] = current ? ((current.children ?? []) as CategoryNode[]) : categories;

  // Reset drill-down + search back to the top every time the drawer closes,
  // so reopening it never silently resumes mid-subcategory or mid-search.
  useEffect(() => {
    if (!open) {
      setCategoryPath([]);
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    setSearch('');
  }, [current?.id]);

  // --- Android/browser back-button handling ---------------------------------
  // Next.js runs with reactStrictMode on, which double-invokes effects in
  // dev (mount -> cleanup -> mount) to surface exactly this kind of bug: an
  // earlier version of this called history.back() unconditionally from the
  // cleanup, so the Strict Mode dry-run closed the drawer for real the
  // instant it opened. historyPushedRef is the single source of truth for
  // "is there currently a pushed entry pending" and is only ever mutated by
  // the push/pop sites below, so a duplicate mount from Strict Mode just
  // finds the flag already true and skips pushing again.
  //
  // Only ONE history entry is ever pushed per drawer-open, regardless of
  // how many levels deep categoryPath goes — the UI back-chevron (below)
  // pops the stack directly without touching history at all, exactly like
  // the single-level version this generalizes from. So by the time a
  // hardware back-press actually happens, categoryPathRef reflects
  // wherever the user manually navigated to, and popstate just needs to
  // pop one more level (re-pushing a fresh entry to stay "armed" for the
  // next back-press) or, if already at the top, close the drawer for real.
  const suppressNextPopRef = useRef(false);
  const historyPushedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      historyPushedRef.current = false;
      return;
    }

    if (!historyPushedRef.current) {
      window.history.pushState({ categoryDrawer: true }, '');
      historyPushedRef.current = true;
    }

    const handlePopState = () => {
      if (suppressNextPopRef.current) {
        suppressNextPopRef.current = false;
        historyPushedRef.current = false;
        return;
      }
      historyPushedRef.current = false;
      if (categoryPathRef.current.length > 0) {
        setCategoryPath((prev) => prev.slice(0, -1));
        window.history.pushState({ categoryDrawer: true }, '');
        historyPushedRef.current = true;
      } else {
        onOpenChange(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, onOpenChange]);

  // Every UI-initiated close (X button, overlay click, ESC via Radix,
  // tapping a leaf category link) routes through here so the pushed
  // history entry is consumed immediately instead of waiting to be
  // silently eaten by the user's next unrelated back-press.
  const close = () => {
    if (historyPushedRef.current) {
      suppressNextPopRef.current = true;
      window.history.back();
      historyPushedRef.current = false;
    }
    onOpenChange(false);
  };

  const filteredList = useMemo(() => {
    if (!search.trim()) return currentList;
    const q = search.trim().toLowerCase();
    return currentList.filter((c) => c.name.toLowerCase().includes(q));
  }, [currentList, search]);

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent side="right" className="flex w-full max-w-sm flex-col p-0">
        <div className="flex items-center gap-2 border-b p-4">
          {current ? (
            <button
              type="button"
              onClick={() => setCategoryPath((prev) => prev.slice(0, -1))}
              aria-label={t('nav.megaMenu.back')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <SheetTitle className="flex-1 truncate text-left text-base">
            {current ? current.name : t('nav.allCategories')}
          </SheetTitle>
          <button
            type="button"
            onClick={close}
            aria-label={t('nav.megaMenu.close')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b p-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                current
                  ? `${t('nav.megaMenu.searchIn')} ${current.name}...`
                  : t('nav.megaMenu.searchPlaceholder')
              }
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" data-lenis-prevent>
          {!current && (
            <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('nav.megaMenu.browse')}
            </p>
          )}
          <ul className={current ? 'py-2' : 'pb-2'}>
            {filteredList.map((category) => {
              const hasChildren = (category.children ?? []).length > 0;
              const isRoot = !current;
              const Icon = isRoot ? getCategoryIcon(category.name) : null;
              const isLocal = isRoot && isLocalCategory(category.name);
              const rowContent = (
                <>
                  {Icon && (
                    <Icon className={`h-5 w-5 shrink-0 ${isLocal ? 'text-secondary' : 'text-muted-foreground'}`} />
                  )}
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  {isLocal && (
                    <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                      TL
                    </span>
                  )}
                  {hasChildren && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
                </>
              );
              const rowClassName = `flex min-h-[44px] w-full items-center gap-3 ${
                isRoot ? 'px-4' : 'px-5'
              } py-2.5 text-left text-sm text-foreground transition-colors active:bg-accent`;

              return (
                <li key={category.id}>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => setCategoryPath((prev) => [...prev, category])}
                      className={rowClassName}
                    >
                      {rowContent}
                    </button>
                  ) : (
                    <Link href={`/categories/${category.slug}`} onClick={close} className={rowClassName}>
                      {rowContent}
                    </Link>
                  )}
                </li>
              );
            })}
            {filteredList.length === 0 && currentList.length > 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t('nav.megaMenu.noResults')}
              </li>
            )}
            {filteredList.length === 0 && currentList.length === 0 && current && (
              <li className="px-5 py-2.5 text-sm text-muted-foreground">
                {!!current.productCount && current.productCount > 0
                  ? `${current.productCount} ${t('nav.megaMenu.products')}`
                  : t('nav.megaMenu.explore')}
              </li>
            )}
          </ul>
          <div className="border-t p-2">
            {current ? (
              <Link
                href={`/categories/${current.slug}`}
                onClick={close}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primary active:bg-accent"
              >
                {t('nav.megaMenu.viewCategory')} {current.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href="/categories"
                onClick={close}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primary active:bg-accent"
              >
                {t('nav.megaMenu.viewAll')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
