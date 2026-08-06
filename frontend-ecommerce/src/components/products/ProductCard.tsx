'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { RatingStars } from '@/components/shared/RatingStars';
import { ShoppingCart, Heart, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PLACEHOLDER_IMAGE = '/images/placeholder.png';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    nameTetum?: string | null;
    slug: string;
    price: number;
    comparePrice?: number | null;
    thumbnail: string | null;
    stock: number;
    isActive: boolean;
    rating?: number;
    totalReviews?: number;
    seller?: {
      id: number;
      storeName: string;
    };
  };
  showSeller?: boolean;
}

export function ProductCard({ product, showSeller = true }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const imageSrc = imageError || !product.thumbnail ? PLACEHOLDER_IMAGE : product.thumbnail;

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }
    try {
      await toggleWishlist(product);
      setIsWishlisted(!isWishlisted);
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please login to add to cart');
      return;
    }
    
    if (product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItem(product, 1);
    } catch (error: any) {
      console.error('Add to cart error:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Link href={`/products/${product.slug}`}>
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            onError={handleImageError}
          />
        </Link>

        {discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white z-10">
            -{discount}%
          </Badge>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <Badge className="bg-red-500 text-white text-sm px-4 py-2">
              Out of Stock
            </Badge>
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full shadow-md"
            onClick={handleWishlist}
          >
            <Heart
              className={`h-4 w-4 ${
                isWishlisted ? 'fill-red-500 text-red-500' : ''
              }`}
            />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full shadow-md"
            asChild
          >
            <Link href={`/products/${product.slug}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Link href={`/products/${product.slug}`}>
        <CardContent className="p-4 pb-2">
          {showSeller && product.seller && (
            <p className="text-xs text-muted-foreground mb-1">
              {product.seller.storeName}
            </p>
          )}

          <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.nameTetum && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {product.nameTetum}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <RatingStars rating={product.rating || 0} size="sm" />
            <span className="text-xs text-muted-foreground">
              ({product.totalReviews || 0})
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex flex-col items-start gap-1">
          <div>
            <span className="text-lg font-bold text-primary">
              ${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}
            </span>
            {product.comparePrice && (
              <span className="ml-2 text-sm text-muted-foreground line-through">
                ${typeof product.comparePrice === 'number' ? product.comparePrice.toFixed(2) : '0.00'}
              </span>
            )}
          </div>
          <p
            className={`text-xs ${
              product.stock > 0 ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {product.stock > 0
              ? `Stock: ${product.stock} available`
              : 'Out of stock'}
          </p>
        </CardFooter>
      </Link>

      <div className="px-4 pb-4">
        <Button
          size="sm"
          className="w-full"
          onClick={handleAddToCart}
          disabled={product.stock === 0 || isAddingToCart}
        >
          {isAddingToCart ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Adding...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}