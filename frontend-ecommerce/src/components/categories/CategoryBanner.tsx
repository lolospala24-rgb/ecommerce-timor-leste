'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Package, ShoppingBag, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Category } from '@/types/category.types';

interface CategoryBannerProps {
  category: Category;
  productCount?: number;
}

export function CategoryBanner({ category, productCount = 0 }: CategoryBannerProps) {
  const bannerImage = category.banner || category.image;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg">
      <div className="relative h-[240px] md:h-[320px] lg:h-[360px] w-full">
        {bannerImage ? (
          <>
            <Image
              src={bannerImage}
              alt={category.name}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/40" />
        )}

        <div className="relative h-full flex items-center">
          <div className="container-custom w-full">
            <div className="max-w-3xl space-y-3 md:space-y-4">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  {category.name}
                </h1>
                <Sparkles className="hidden sm:block h-7 w-7 text-yellow-400 shrink-0" />
              </div>

              {category.nameTetum && (
                <p className="text-base md:text-lg text-white/85 font-medium">{category.nameTetum}</p>
              )}

              {category.description && (
                <p className="text-white/75 text-sm md:text-base max-w-2xl line-clamp-2">
                  {category.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1.5">
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  {productCount} Products
                </Badge>
                {category.children && category.children.length > 0 && (
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1.5">
                    {category.children.length} Subcategories
                  </Badge>
                )}
                <Badge className="bg-emerald-500/30 text-white border-0 backdrop-blur-sm px-3 py-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                  Shop Now
                </Badge>
              </div>

              <Button size="sm" className="bg-white text-primary hover:bg-white/90" asChild>
                <Link href="#products">Browse Products</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CategoryBreadcrumbProps {
  category: Category;
}

export function CategoryBreadcrumb({ category }: CategoryBreadcrumbProps) {
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Categories', href: '/categories' },
    ...(category.ancestors || []).map((ancestor) => ({
      label: ancestor.name,
      href: `/categories/${ancestor.slug}`,
    })),
    { label: category.name, href: `/categories/${category.slug}` },
  ];

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.href}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {isLast ? (
              <span className="font-medium text-foreground line-clamp-1">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-primary transition-colors line-clamp-1">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
