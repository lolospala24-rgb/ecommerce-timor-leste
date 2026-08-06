import api from '@/lib/api';
import { Product } from '@/types/product';

class ProductService {
  private static instance: ProductService;

  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  async getProductById(id: string): Promise<Product> {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  }

  async addToCart(productId: string, quantity: number = 1): Promise<void> {
    await api.post('/cart', { productId, quantity });
  }

  async removeFromCart(productId: string): Promise<void> {
    await api.delete(`/cart/${productId}`);
  }

  async addToWishlist(productId: string): Promise<void> {
    await api.post('/wishlist', { productId });
  }

  async removeFromWishlist(productId: string): Promise<void> {
    await api.delete(`/wishlist/${productId}`);
  }
}

export const productService = ProductService.getInstance();