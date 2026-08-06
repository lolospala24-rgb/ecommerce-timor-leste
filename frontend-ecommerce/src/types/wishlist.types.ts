// types/wishlist.types.ts
export interface WishlistItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail: string | null;
}

export interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;
  error: string | null;
  fetchWishlist: () => Promise<void>;
  addItem: (product: any) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  toggleItem: (product: any) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  clearWishlist: () => Promise<void>;
}