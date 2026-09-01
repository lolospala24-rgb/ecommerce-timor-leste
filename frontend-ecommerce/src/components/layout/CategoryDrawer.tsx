'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

const isLocalCategory = (name: string) => /local/i.test(name);

// Mobile-only "All Categories" experience — deliberately its own Sheet with
// its own state, never sharing open/close with MobileNav's hamburger
// drawer. Tapping a category drills into its subcategories in place (back
// arrow appears); tapping a subcategory navigates and closes. The Android/
// browser hardware back button steps back one level at a time instead of
// leaving the page, via a pushed history entry consumed on popstate.
export function CategoryDrawer({ open, onOpenChange }: CategoryDrawerProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: tree } = useCategoryTree();
  const categories = (tree ?? []) as Category[];

  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const activeCategoryRef = useRef(activeCategory);
  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  // Reset drill-down + search back to the top every time the drawer closes,
  // so reopening it never silently resumes mid-subcategory or mid-search.
  useEffect(() => {
    if (!open) {
      setActiveCategory(null);
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    setSearch('');
  }, [activeCategory]);

  // --- Android/browser back-button handling ---------------------------------
  // Next.js runs with reactStrictMode on, which double-invokes effects in
  // dev (mount -> cleanup -> mount) to surface exactly this kind of bug: an
  // earlier version of this called history.back() unconditionally from the
  // cleanup, so the Strict Mode dry-run closed the drawer for real the
  // instant it opened. historyPushedRef is the single source of truth for
  // "is there currently a pushed entry pending" and is only ever mutated by
  // the push/pop sites below, so a duplicate mount from Strict Mode just
  // finds the flag already true and skips pushing again.
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
      if (activeCategoryRef.current) {
        setActiveCategory(null);
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
  // tapping a subcategory link) routes through here so the pushed history
  // entry is consumed immediately instead of waiting to be silently eaten
  // by the user's next unrelated back-press.
  const close = () => {
    if (historyPushedRef.current) {
      suppressNextPopRef.current = true;
      window.history.back();
      historyPushedRef.current = false;
    }
    onOpenChange(false);
  };

  const children = (activeCategory?.children ?? []) as CategoryChild[];

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.trim().toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const filteredChildren = useMemo(() => {
    if (!search.trim()) return children;
    const q = search.trim().toLowerCase();
    return children.filter((c) => c.name.toLowerCase().includes(q));
  }, [children, search]);

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent side="right" className="flex w-full max-w-sm flex-col p-0">
        <div className="flex items-center gap-2 border-b p-4">
          {activeCategory ? (
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              aria-label={t('nav.megaMenu.back')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-accent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <SheetTitle className="flex-1 truncate text-left text-base">
            {activeCategory ? activeCategory.name : t('nav.allCategories')}
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
                activeCategory
                  ? `${t('nav.megaMenu.searchIn')} ${activeCategory.name}...`
                  : t('nav.megaMenu.searchPlaceholder')
              }
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!activeCategory ? (
            <>
              <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('nav.megaMenu.browse')}
              </p>
              <ul className="pb-2">
                {filteredCategories.map((category) => {
                  const Icon = getCategoryIcon(category.name);
                  const isLocal = isLocalCategory(category.name);
                  const hasChildren = (category.children ?? []).length > 0;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasChildren) {
                            setActiveCategory(category);
                          } else {
                            close();
                            router.push(`/categories/${category.slug}`);
                          }
                        }}
                        className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors active:bg-accent"
                      >
                        <Icon className={`h-5 w-5 shrink-0 ${isLocal ? 'text-secondary' : 'text-muted-foreground'}`} />
                        <span className="min-w-0 flex-1 truncate">{category.name}</span>
                        {isLocal && (
                          <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                            TL
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      </button>
                    </li>
                  );
                })}
                {filteredCategories.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {t('nav.megaMenu.noResults')}
                  </li>
                )}
              </ul>
              <div className="border-t p-2">
                <Link
                  href="/categories"
                  onClick={close}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primary active:bg-accent"
                >
                  {t('nav.megaMenu.viewAll')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <ul className="py-2">
                {filteredChildren.length > 0 ? (
                  filteredChildren.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/categories/${child.slug}`}
                        onClick={close}
                        className="flex min-h-[44px] items-center px-5 py-2.5 text-sm text-foreground active:bg-accent"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))
                ) : children.length > 0 ? (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {t('nav.megaMenu.noResults')}
                  </li>
                ) : (
                  <li className="px-5 py-2.5 text-sm text-muted-foreground">
                    {!!activeCategory.productCount && activeCategory.productCount > 0
                      ? `${activeCategory.productCount} ${t('nav.megaMenu.products')}`
                      : t('nav.megaMenu.explore')}
                  </li>
                )}
              </ul>
              <div className="border-t p-2">
                <Link
                  href={`/categories/${activeCategory.slug}`}
                  onClick={close}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primary active:bg-accent"
                >
                  {t('nav.megaMenu.viewCategory')} {activeCategory.name}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
