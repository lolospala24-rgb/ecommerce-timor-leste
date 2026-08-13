'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QuantitySelector } from '@/components/products/QuantitySelector';
import { ProductVariantSelector } from '@/components/products/ProductVariantSelector';
import { RatingStars } from '@/components/shared/RatingStars';
import { useCartStore } from '@/stores/cartStore';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuthStore } from '@/stores/authStore';
import { useProduct } from '@/hooks/useProducts';
import { useProductVariantSelection } from '@/hooks/useProductVariantSelection';
import { Product } from '@/types/product.types';
import { ShoppingCart, Heart, X, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface QuickViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
}

export function QuickViewModal({ open, onOpenChange, productId }: QuickViewModalProps) {
  const { data: product, isLoading } = useProduct<Product>(productId);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem, items: cartItems } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated } = useAuthStore();

  const {
    variants,
    hasVariants,
    attributeKeys,
    attributeOptions,
    attributeLabels,
    selectedVariant,
    selectedVariantLabel,
    selectedAttributes,
    selectAttribute,
    selectVariant,
    isAttributeValueAvailable,
    displayPrice,
    displayComparePrice,
    displayStock,
    galleryImages,
  } = useProductVariantSelection(product ?? ({} as Product));

  const existingQty =
    cartItems?.find(
      (item) =>
        item.productId === product?.id &&
        item.variantId === (selectedVariant?.id ?? null),
    )?.quantity ?? 0;
  const maxAllowed = Math.min(displayStock, 99);

  useEffect(() => {
    if (product) {
      setIsWishlisted(isInWishlist(product.id));
    }
  }, [product, isInWishlist]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      onOpenChange(false);
      return;
    }
    if (!product) return;
    if (hasVariants && !selectedVariant) {
      toast.error('Please select a variant');
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItem(product, quantity, selectedVariant ?? undefined);
      toast.success(`${product.name} added to cart!`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlist = () => {
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }
    if (!product) return;

    toggleWishlist(product);
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Product not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const discount =
    displayComparePrice && displayComparePrice > displayPrice
      ? Math.round(((displayComparePrice - displayPrice) / displayComparePrice) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Quick View</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
            <Image
              src={galleryImages[0] || product.thumbnail || '/images/placeholder.png'}
              alt={product.name}
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.src = '/images/placeholder.png';
              }}
            />
            {discount > 0 && (
              <Badge className="absolute top-2 left-2 bg-red-600">
                -{discount}%
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Link
                href={`/products/${product.slug}`}
                className="hover:text-primary transition-colors"
                onClick={() => onOpenChange(false)}
              >
                <h2 className="text-xl font-bold">{product.name}</h2>
              </Link>
              {product.nameTetum && (
                <p className="text-sm text-muted-foreground">{product.nameTetum}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <RatingStars rating={product.rating || 0} size="sm" />
                <span className="text-sm text-muted-foreground">
                  ({product.totalReviews || 0})
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-primary">
                ${displayPrice.toFixed(2)}
              </span>
              {displayComparePrice && displayComparePrice > displayPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ${displayComparePrice.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {displayStock > 0 ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">In Stock</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-600 font-medium">Out of Stock</span>
                </>
              )}
            </div>

            <p className="text-sm text-muted-foreground line-clamp-3">
              {product.description}
            </p>

            {product.seller && (
              <div className="text-sm">
                <span className="text-muted-foreground">Sold by </span>
                <Link
                  href={`/sellers/${product.seller.id}`}
                  className="text-primary hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  {product.seller.storeName}
                </Link>
              </div>
            )}

            {hasVariants && (
              <ProductVariantSelector
                variants={variants}
                attributeKeys={attributeKeys}
                attributeOptions={attributeOptions}
                attributeLabels={attributeLabels}
                selectedAttributes={selectedAttributes}
                selectedVariant={selectedVariant}
                selectedVariantLabel={selectedVariantLabel}
                onSelectAttribute={selectAttribute}
                onSelectVariant={selectVariant}
                isAttributeValueAvailable={isAttributeValueAvailable}
                productThumbnail={product.thumbnail}
                compact
              />
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantity:</span>
                <QuantitySelector
                  quantity={quantity}
                  setQuantity={setQuantity}
                  max={displayStock}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={
                    displayStock === 0 ||
                    isAddingToCart ||
                    (hasVariants && !selectedVariant) ||
                    existingQty >= maxAllowed ||
                    quantity > Math.max(1, maxAllowed - existingQty)
                  }
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleWishlist}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isWishlisted ? 'fill-red-600 text-red-600' : ''
                    }`}
                  />
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <Link
                  href={`/products/${product.slug}`}
                  onClick={() => onOpenChange(false)}
                >
                  View Full Details
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
