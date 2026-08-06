'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, X, ShoppingBag } from 'lucide-react';

interface CartItemProps {
  item: {
    productId: number;
    name: string;
    nameTetum?: string | null;
    slug: string;
    price: number;
    comparePrice?: number | null;
    thumbnail: string | null;
    quantity: number;
    stock: number;
  };
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
  isUpdating?: boolean;
}

export function CartItem({ item, onUpdateQuantity, onRemove, isUpdating }: CartItemProps) {
  const [quantity, setQuantity] = useState(item.quantity);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > item.stock) return;
    setQuantity(newQuantity);
    onUpdateQuantity(item.productId, newQuantity);
  };

  const handleRemove = () => {
    onRemove(item.productId);
  };

  const discount = item.comparePrice
    ? Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100)
    : 0;

  return (
    <div className="flex gap-4 rounded-lg border p-4 transition-all hover:shadow-sm">
      {/* Product Image */}
      <Link
        href={`/products/${item.slug}`}
        className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-100"
      >
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt={item.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-1 left-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{discount}%
          </span>
        )}
      </Link>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <Link href={`/products/${item.slug}`} className="hover:text-primary">
          <h3 className="font-medium line-clamp-1">{item.name}</h3>
        </Link>
        {item.nameTetum && (
          <p className="text-sm text-muted-foreground line-clamp-1">{item.nameTetum}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-primary">${item.price.toFixed(2)}</span>
          {item.comparePrice && item.comparePrice > item.price && (
            <span className="text-sm text-muted-foreground line-through">
              ${item.comparePrice.toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Stock: {item.stock} units available
        </p>
      </div>

      {/* Quantity & Actions */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1 || isUpdating}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            min={1}
            max={item.stock}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= item.stock) {
                handleQuantityChange(val);
              }
            }}
            className="h-8 w-12 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={isUpdating}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= item.stock || isUpdating}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            ${(item.price * item.quantity).toFixed(2)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
            disabled={isUpdating}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}