// placeholder for src/modules/carts/carts.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private productsService: ProductsService,
  ) {}

  async getCart(userId: number) {
    const cacheKey = `cart:user:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Get or create cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    storeName: true,
                  },
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      storeName: true,
                    },
                  },
                },
              },
              variant: true,
            },
          },
        },
      });
    }

    // Calculate cart summary
    const summary = this.calculateCartSummary(cart.items);

    const cartWithSummary = {
      ...cart,
      summary,
    };

    // Cache for 5 minutes
    await this.redisService.set(cacheKey, JSON.stringify(cartWithSummary), 300);

    return cartWithSummary;
  }

  async getCartCount(userId: number): Promise<number> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  async getCartTotal(userId: number): Promise<number> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) return 0;
    
    return cart.items.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price;
      return sum + (item.quantity * price);
    }, 0);
  }

  async addToCart(userId: number, addToCartDto: AddToCartDto) {
    const { productId, quantity, variantId } = addToCartDto;

    // Validate product exists
    const product = await this.productsService.findOne(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    // The frontend already blocks Add to Cart/Buy Now until a full variant
    // combination is chosen, but that's a UX guard, not a security boundary
    // — a direct API call could omit variantId entirely and silently get
    // priced/stocked off the base product instead. Enforce it here too.
    if (product.hasVariants && !variantId) {
      throw new BadRequestException('Please select a variant for this product');
    }

    let variant = null;
    if (variantId) {
      variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant || variant.productId !== productId) {
        throw new NotFoundException('Product variant not found');
      }
      if (!variant.isActive) {
        throw new BadRequestException('Product variant is not available');
      }
    }

    // Use a transaction to atomically check stock and update/create cart items
    await this.prisma.$transaction(async (prisma) => {
      // Re-fetch product inside transaction to get latest state
      const prod = await this.productsService.findOne(productId);
      if (!prod) throw new NotFoundException('Product not found');
      if (!prod.isActive) throw new BadRequestException('Product is not available');

      let currentVariant = variant;
      if (variantId) {
        currentVariant = await prisma.productVariant.findUnique({ where: { id: variantId } });
        if (!currentVariant || currentVariant.productId !== productId) {
          throw new NotFoundException('Product variant not found');
        }
        if (!currentVariant.isActive) {
          throw new BadRequestException('Product variant is not available');
        }
      }

      // Get or create cart
      let cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { userId } });
      }

      // Find existing item
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
          variantId: variantId ?? null,
        },
      });

      const existingQty = existingItem ? existingItem.quantity : 0;
      const newQuantity = existingQty + quantity;

      if (newQuantity > 99) {
        throw new BadRequestException('You can only add up to 99 items per product');
      }

      const availableStock = currentVariant ? currentVariant.stock : prod.stock;
      if (availableStock < newQuantity) {
        throw new BadRequestException(`Only ${availableStock} items available in stock`);
      }

      if (existingItem) {
        await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: newQuantity } });
      } else {
        await prisma.cartItem.create({ data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity } });
      }
    });

    // Clear cache and return updated cart
    await this.clearCartCache(userId);
    return this.getCart(userId);
  }

  async updateCartItem(userId: number, updateCartDto: UpdateCartDto) {
    const { productId, quantity, variantId } = updateCartDto;

    if (quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    // Get cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Find cart item
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId ?? null,
      },
      include: {
        product: true,
        variant: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    if (quantity === 0) {
      // Remove item
      await this.prisma.cartItem.delete({
        where: { id: cartItem.id },
      });
    } else {
      // Validate stock
      const availableStock = cartItem.variant?.stock ?? cartItem.product.stock;
      if (availableStock < quantity) {
        throw new BadRequestException(`Only ${availableStock} items available in stock`);
      }

      // Update quantity
      await this.prisma.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity },
      });
    }

    // Clear cache
    await this.clearCartCache(userId);

    // Return updated cart
    return this.getCart(userId);
  }

  async removeFromCart(userId: number, productId: number, variantId?: number) {
    // Get cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Remove item
    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId ?? null,
      },
    });

    // Clear cache
    await this.clearCartCache(userId);

    // Return updated cart
    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    // Get cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      // Delete all items
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    // Clear cache
    await this.clearCartCache(userId);
  }

  async mergeCart(userId: number, items: any[]) {
    // Use a transaction to merge safely and validate stock
    await this.prisma.$transaction(async (prisma) => {
      let cart = await prisma.cart.findUnique({ where: { userId }, include: { items: true } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { userId }, include: { items: true } });
      }

      for (const item of items) {
        const prod = await this.productsService.findOne(item.productId);
        if (!prod) throw new NotFoundException(`Product ${item.productId} not found`);
        if (!prod.isActive) throw new BadRequestException(`Product ${item.productId} is not available`);
        if (prod.hasVariants && !item.variantId) {
          throw new BadRequestException(`Please select a variant for product ${item.productId}`);
        }

        let variant = null;
        if (item.variantId) {
          variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant || variant.productId !== item.productId) {
            throw new NotFoundException(`Product variant ${item.variantId} not found`);
          }
          if (!variant.isActive) {
            throw new BadRequestException(`Product variant ${item.variantId} is not available`);
          }
        }

        const existingItem = cart.items.find(i => i.productId === item.productId && i.variantId === (item.variantId ?? null));
        const existingQty = existingItem ? existingItem.quantity : 0;
        const newQuantity = existingQty + item.quantity;
        const availableStock = variant ? variant.stock : prod.stock;

        if (newQuantity > 99) throw new BadRequestException('You can only add up to 99 items per product');
        if (availableStock < newQuantity) throw new BadRequestException(`Only ${availableStock} items available in stock`);

        if (existingItem) {
          await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: newQuantity } });
        } else {
          await prisma.cartItem.create({ data: { cartId: cart.id, productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity } });
        }

        // refresh cart items for next iteration
        cart = await prisma.cart.findUnique({ where: { userId }, include: { items: true } }) as any;
      }
    });

    await this.clearCartCache(userId);
    return this.getCart(userId);
  }

  private calculateCartSummary(items: any[]) {
    let subtotal = 0;
    let totalItems = 0;
    const sellerItems = new Map();

    for (const item of items) {
      const unitPrice = item.variant?.price ?? item.product.price;
      const itemTotal = item.quantity * unitPrice;
      subtotal += itemTotal;
      totalItems += item.quantity;

      const sellerId = item.product.sellerId;
      if (!sellerItems.has(sellerId)) {
        sellerItems.set(sellerId, {
          sellerId,
          sellerName: item.product.seller?.storeName ?? 'Unknown Seller',
          items: [],
          subtotal: 0,
        });
      }
      
      const sellerGroup = sellerItems.get(sellerId);
      sellerGroup.items.push({
        productId: item.product.id,
        variantId: item.variantId ?? null,
        name: item.product.name,
        nameTetum: item.product.nameTetum,
        quantity: item.quantity,
        price: unitPrice,
        total: itemTotal,
        thumbnail: item.product.thumbnail,
      });
      sellerGroup.subtotal += itemTotal;
    }

    // Calculate shipping (simplified - $2.50 per seller)
    const shippingCost = sellerItems.size * 2.5;
    const total = subtotal + shippingCost;

    return {
      subtotal,
      shippingCost,
      total,
      totalItems,
      sellerGroups: Array.from(sellerItems.values()),
    };
  }

  private async clearCartCache(userId: number) {
    await this.redisService.del(`cart:user:${userId}`);
  }
}