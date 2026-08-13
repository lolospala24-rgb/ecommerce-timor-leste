'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, X, ArrowUp, ArrowDown, Package } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import {
  useCreateHomepageSection,
  useUpdateHomepageSection,
  type HomepageSectionDetail,
  type HomepageSectionRule,
} from '@/hooks/useHomepageSections';

const RULE_OPTIONS: { value: HomepageSectionRule; label: string; description: string }[] = [
  { value: 'MANUAL', label: 'Manual Selection', description: 'You pick the exact products and order' },
  { value: 'NEWEST', label: 'Newest', description: 'Most recently added products' },
  { value: 'POPULAR', label: 'Popular', description: 'Ranked by wishlist adds + reviews' },
  { value: 'BEST_SELLING', label: 'Best Selling', description: 'Ranked by delivered order count' },
  { value: 'LOCAL', label: 'Local Products', description: 'Products in a specific category' },
  { value: 'ON_SALE', label: 'On Sale', description: 'Products with an active discount' },
  { value: 'LIMITED_STOCK', label: 'Limited Stock', description: 'Products running low on stock' },
  { value: 'CATEGORY', label: 'Category', description: 'Products from a specific category' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

interface ManualProduct {
  productId: number;
  name: string;
  thumbnail: string | null;
}

interface SectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section?: HomepageSectionDetail | null;
}

export function SectionForm({ open, onOpenChange, section }: SectionFormProps) {
  const isEdit = !!section;
  const createSection = useCreateHomepageSection();
  const updateSection = useUpdateHomepageSection();

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [rule, setRule] = useState<HomepageSectionRule>('NEWEST');
  const [categoryId, setCategoryId] = useState<string>('');
  const [stockThreshold, setStockThreshold] = useState('5');
  const [sort, setSort] = useState<string>('');
  const [productLimit, setProductLimit] = useState('8');
  const [isActive, setIsActive] = useState(true);
  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    if (section) {
      setName(section.name);
      setTitle(section.title);
      setSubtitle(section.subtitle || '');
      setRule(section.rule);
      setCategoryId(section.config?.categoryId ? String(section.config.categoryId) : '');
      setStockThreshold(section.config?.stockThreshold ? String(section.config.stockThreshold) : '5');
      setSort(section.sort || '');
      setProductLimit(String(section.productLimit));
      setIsActive(section.isActive);
      setManualProducts(
        (section.products || [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((p) => ({ productId: p.productId, name: p.product.name, thumbnail: p.product.thumbnail })),
      );
    } else {
      setName('');
      setTitle('');
      setSubtitle('');
      setRule('NEWEST');
      setCategoryId('');
      setStockThreshold('5');
      setSort('');
      setProductLimit('8');
      setIsActive(true);
      setManualProducts([]);
    }
    setProductSearch('');
  }, [open, section]);

  const { data: categoriesData } = useCategories({ limit: 100 });
  const { data: searchResults, isFetching: isSearching } = useProducts({
    search: productSearch,
    limit: 10,
  });
  const showCategoryField = rule === 'LOCAL' || rule === 'CATEGORY';
  const showStockField = rule === 'LIMITED_STOCK';
  const showSortField = rule === 'CATEGORY' || rule === 'LOCAL' || rule === 'ON_SALE' || rule === 'LIMITED_STOCK';
  const showManualPicker = rule === 'MANUAL';

  const addManualProduct = (product: { id: number; name: string; thumbnail: string | null }) => {
    if (manualProducts.some((p) => p.productId === product.id)) return;
    setManualProducts((prev) => [...prev, { productId: product.id, name: product.name, thumbnail: product.thumbnail }]);
    setProductSearch('');
  };

  const removeManualProduct = (productId: number) => {
    setManualProducts((prev) => prev.filter((p) => p.productId !== productId));
  };

  const moveManualProduct = (index: number, direction: -1 | 1) => {
    setManualProducts((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim()) {
      return;
    }
    if (showCategoryField && !categoryId) {
      return;
    }
    if (showManualPicker && manualProducts.length === 0) {
      return;
    }

    const config: Record<string, unknown> = {};
    if (showCategoryField) config.categoryId = Number(categoryId);
    if (showStockField) config.stockThreshold = Number(stockThreshold) || 5;

    const payload = {
      name: name.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      rule,
      config,
      sort: showSortField && sort ? sort : undefined,
      productLimit: Number(productLimit) || 8,
      isActive,
      products: showManualPicker
        ? manualProducts.map((p, i) => ({ productId: p.productId, position: i }))
        : undefined,
    };

    if (isEdit && section) {
      await updateSection.mutateAsync({ id: section.id, data: payload });
    } else {
      await createSection.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isSaving = createSection.isPending || updateSection.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Section' : 'Add Homepage Section'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="section-name">Section Name (internal)</Label>
              <Input id="section-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Featured Products" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-title">Title (shown to customers)</Label>
              <Input id="section-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Featured Products" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="section-subtitle">Subtitle (optional)</Label>
            <Input id="section-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Handpicked products just for you" />
          </div>

          <div className="space-y-2">
            <Label>Rule</Label>
            <Select value={rule} onValueChange={(v) => setRule(v as HomepageSectionRule)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} — {opt.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic config fields — only what the chosen rule actually needs */}
          {showCategoryField && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesData?.data.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showStockField && (
            <div className="space-y-2">
              <Label htmlFor="stock-threshold">Stock Threshold</Label>
              <Input
                id="stock-threshold"
                type="number"
                min={1}
                max={1000}
                value={stockThreshold}
                onChange={(e) => setStockThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Products with stock at or below this number qualify.</p>
            </div>
          )}

          {showSortField && (
            <div className="space-y-2">
              <Label>Sort (optional)</Label>
              <Select value={sort || 'default'} onValueChange={(v) => setSort(v === 'default' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showManualPicker && (
            <div className="space-y-2">
              <Label>Products</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search products to add..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              {productSearch.length >= 2 && (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                    </div>
                  ) : searchResults?.data.length ? (
                    searchResults.data.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => addManualProduct(p)}
                        className="flex w-full items-center gap-3 p-2 text-left text-sm hover:bg-muted/50"
                      >
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                          {p.thumbnail && <Image src={p.thumbnail} alt="" fill className="object-cover" sizes="32px" />}
                        </div>
                        <span className="flex-1 truncate">{p.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground">No products found.</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5 rounded-md border p-2">
                {manualProducts.length === 0 ? (
                  <p className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" /> No products selected yet.
                  </p>
                ) : (
                  manualProducts.map((p, i) => (
                    <div key={p.productId} className="flex items-center gap-2 rounded-md bg-muted/30 p-1.5">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                        {p.thumbnail && <Image src={p.thumbnail} alt="" fill className="object-cover" sizes="32px" />}
                      </div>
                      <span className="flex-1 truncate text-sm">{p.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => moveManualProduct(i, -1)}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === manualProducts.length - 1} onClick={() => moveManualProduct(i, 1)}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeManualProduct(p.productId)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-limit">Product Limit</Label>
              <Input
                id="product-limit"
                type="number"
                min={1}
                max={24}
                value={productLimit}
                onChange={(e) => setProductLimit(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="section-active" className="cursor-pointer">
                Active
              </Label>
              <Switch id="section-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Section'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
