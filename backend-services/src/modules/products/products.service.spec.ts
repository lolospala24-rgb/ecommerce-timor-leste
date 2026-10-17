import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { SettingsService } from '../settings/settings.service';
import { StockNotificationsService } from '../stock-notifications/stock-notifications.service';
import { PromotionsService } from '../promotions/promotions.service';

// Covers the P0/P1 fixes from the Product Management end-to-end fix:
// deletion safety (D-02, the 3-scenario hard-delete-vs-deactivate rule) and
// the new server-side status/stock filters in findAll() (D-01). Ownership
// and slug-uniqueness checks on create/update are included since both
// deletion safety and the filter work sit directly on top of them.
describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let promotionsService: any;

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      orderItem: { count: jest.fn() },
      cartItem: { count: jest.fn() },
      category: { findUnique: jest.fn() },
      productType: { findUnique: jest.fn() },
      seller: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      productAttribute: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };

    promotionsService = {
      attachPricing: jest.fn(async (products: any[]) => products),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), keys: jest.fn().mockResolvedValue([]) } },
        { provide: CloudinaryService, useValue: { uploadFile: jest.fn(), deleteFile: jest.fn() } },
        { provide: SettingsService, useValue: { getSettings: jest.fn().mockResolvedValue({ maxProductImages: 10 }) } },
        { provide: StockNotificationsService, useValue: { notifySubscribers: jest.fn() } },
        { provide: PromotionsService, useValue: promotionsService },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('remove() — deletion safety (D-02)', () => {
    const product = { id: 1, sellerId: 9, images: [], seller: { id: 9 } };

    const mockOwnerAdmin = () => {
      prisma.seller.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    };
    const mockOwnerSeller = (sellerId: number) => {
      prisma.seller.findUnique.mockResolvedValue({ id: sellerId });
      prisma.user.findUnique.mockResolvedValue({ role: 'SELLER' });
    };

    it('404s when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('rejects a seller trying to delete another seller\'s product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      mockOwnerSeller(555); // not sellerId 9
      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('scenario A: blocks a hard delete when the product has any order history, even fully completed orders', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      mockOwnerAdmin();
      prisma.orderItem.count.mockResolvedValue(1);

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(1, 1)).rejects.toThrow(/order history/);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('scenario A continued: cart references are never even checked once order history alone is enough to block', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      mockOwnerAdmin();
      prisma.orderItem.count.mockResolvedValue(1);

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.cartItem.count).not.toHaveBeenCalled();
    });

    it('blocks a hard delete when the product has no order history but is in a customer cart', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      mockOwnerAdmin();
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.cartItem.count.mockResolvedValue(2);

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(1, 1)).rejects.toThrow(/cart/);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('scenario B: permanently deletes when there is no order history and no cart references', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      mockOwnerAdmin();
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.cartItem.count.mockResolvedValue(0);
      prisma.product.delete.mockResolvedValue(product);

      const result = await service.remove(1, 1);

      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(true);
    });

    it('scenario C: translates a race-condition FK failure (P2003) into a clear, actionable error instead of leaking it', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      mockOwnerAdmin();
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.cartItem.count.mockResolvedValue(0);
      prisma.product.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: '5.22.0',
        }),
      );

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(1, 1)).rejects.not.toThrow(Prisma.PrismaClientKnownRequestError);
    });

    it('re-throws an unrelated database error unchanged rather than mislabeling it', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      mockOwnerAdmin();
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.cartItem.count.mockResolvedValue(0);
      const unrelated = new Error('connection reset');
      prisma.product.delete.mockRejectedValue(unrelated);

      await expect(service.remove(1, 1)).rejects.toBe(unrelated);
    });

    it('lets an admin delete a product owned by a different seller', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      mockOwnerAdmin();
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.cartItem.count.mockResolvedValue(0);
      prisma.product.delete.mockResolvedValue(product);

      await expect(service.remove(1, 1)).resolves.toBe(true);
    });
  });

  describe('findAll() — server-side status/stock filters (D-01)', () => {
    const emptyProductList = () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);
    };

    it('defaults to active-only when status is omitted (back-compat for the public storefront)', async () => {
      emptyProductList();
      await service.findAll({} as any);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.isActive).toBe(true);
    });

    it('status=all removes the isActive filter entirely for a verified ADMIN caller, unlike isActive alone which cannot express "no filter"', async () => {
      emptyProductList();
      await service.findAll({ status: 'all' } as any, Role.ADMIN);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where).not.toHaveProperty('isActive');
    });

    it('status=inactive filters to isActive:false for a verified ADMIN caller', async () => {
      emptyProductList();
      await service.findAll({ status: 'inactive' } as any, Role.ADMIN);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.isActive).toBe(false);
    });

    it('stockStatus=outOfStock filters where.stock to exactly 0', async () => {
      emptyProductList();
      await service.findAll({ stockStatus: 'outOfStock' } as any);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.stock).toBe(0);
    });

    it('stockStatus=inStock filters where.stock to { gt: 0 }', async () => {
      emptyProductList();
      await service.findAll({ stockStatus: 'inStock' } as any);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.stock).toEqual({ gt: 0 });
    });

    it('legacy inStock boolean still works when stockStatus is not sent', async () => {
      emptyProductList();
      await service.findAll({ inStock: false } as any);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.stock).toBe(0);
    });

    it(
      'stockStatus=lowStock reuses each product\'s own lowStockThreshold (falling back to <10 when unset) ' +
        'and reports a filtered total consistent with the filtered data, not the whole catalog',
      async () => {
        const products = [
          { id: 1, stock: 5, lowStockThreshold: null, reviews: [] }, // low via fallback (<10)
          { id: 2, stock: 8, lowStockThreshold: 3, reviews: [] }, // NOT low: 8 is not < its own threshold of 3
          { id: 3, stock: 15, lowStockThreshold: 20, reviews: [] }, // low via its own higher threshold
          { id: 4, stock: 50, lowStockThreshold: null, reviews: [] }, // not low
        ];
        prisma.product.findMany.mockResolvedValue(products);

        const result = await service.findAll({ stockStatus: 'lowStock' } as any);

        expect(result.data.map((p: any) => p.id).sort()).toEqual([1, 3]);
        expect(result.pagination.total).toBe(2);
        // Narrowed to "in stock at all" at the DB level — the per-row
        // threshold compare can't be expressed in a Prisma `where`.
        const [findManyArgs] = prisma.product.findMany.mock.calls;
        expect(findManyArgs[0].where.stock).toEqual({ gt: 0 });
      },
    );

    it(
      'stockStatus=lowStock still applies when combined with a postSort (rating/best_selling/popularity) sort, ' +
        'including a product with variants filtered by its own product-level stock',
      async () => {
        const products = [
          { id: 1, stock: 5, lowStockThreshold: null, hasVariants: true, reviews: [{ rating: 5 }] }, // low, has variants
          { id: 2, stock: 100, lowStockThreshold: 10, hasVariants: false, reviews: [{ rating: 1 }] }, // NOT low
          { id: 3, stock: 9, lowStockThreshold: null, hasVariants: false, reviews: [] }, // low
        ];
        prisma.product.findMany.mockResolvedValue(products);

        const result = await service.findAll({ stockStatus: 'lowStock', sortBy: 'rating' } as any);

        // Before the fix, the postSort branch returned before the
        // dedicated lowStockOnly branch ever ran, so this silently
        // returned every in-stock product (including id 2) instead of
        // just the low-stock ones.
        expect(result.data.map((p: any) => p.id).sort()).toEqual([1, 3]);
        expect(result.pagination.total).toBe(2);
      },
    );
  });

  describe('findAll() — non-active visibility is gated to a verified ADMIN caller', () => {
    const emptyProductList = () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);
    };

    it('forces isActive:true for an anonymous caller (no role) even when status=all is requested', async () => {
      emptyProductList();
      await service.findAll({ status: 'all' } as any, undefined);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.isActive).toBe(true);
    });

    it('forces isActive:true for an anonymous caller even when status=inactive is requested', async () => {
      emptyProductList();
      await service.findAll({ status: 'inactive' } as any, undefined);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.isActive).toBe(true);
    });

    it('forces isActive:true for an anonymous caller even when isActive=false is requested directly', async () => {
      emptyProductList();
      await service.findAll({ isActive: false } as any, undefined);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.isActive).toBe(true);
    });

    it('forces isActive:true for an authenticated non-admin (e.g. SELLER) caller too', async () => {
      emptyProductList();
      await service.findAll({ status: 'all' } as any, Role.SELLER);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.isActive).toBe(true);
    });

    it('honors status=all for a verified ADMIN caller, removing the isActive filter entirely', async () => {
      emptyProductList();
      await service.findAll({ status: 'all' } as any, Role.ADMIN);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where).not.toHaveProperty('isActive');
    });

    it('honors status=inactive for a verified ADMIN caller', async () => {
      emptyProductList();
      await service.findAll({ status: 'inactive' } as any, Role.ADMIN);

      const [countArgs] = prisma.product.count.mock.calls;
      expect(countArgs[0].where.isActive).toBe(false);
    });
  });

  describe('create() — ownership resolution', () => {
    it('rejects an ADMIN creating a product without specifying a sellerId', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', seller: null });

      await expect(
        service.create({ categoryId: 1, name: 'x', description: 'x'.repeat(20), price: 1, stock: 1 } as any, 1, []),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a SELLER creating a product under a different seller\'s id', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'SELLER', seller: { id: 9, isVerified: true } });

      await expect(
        service.create(
          { categoryId: 1, name: 'x', description: 'x'.repeat(20), price: 1, stock: 1, sellerId: 555 } as any,
          1,
          [],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects an explicit slug that is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'SELLER', seller: { id: 9, isVerified: true } });
      prisma.category.findUnique.mockResolvedValue({ id: 1 });
      prisma.product.findFirst.mockResolvedValue({ id: 42 }); // slug already exists

      await expect(
        service.create(
          { categoryId: 1, name: 'x', description: 'x'.repeat(20), price: 1, stock: 1, slug: 'taken-slug' } as any,
          1,
          [],
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update() — ownership and slug uniqueness', () => {
    const product = { id: 1, sellerId: 9, slug: 'current-slug', images: [], stock: 5, seller: { id: 9 } };

    it('rejects a seller updating another seller\'s product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.seller.findUnique.mockResolvedValue({ id: 555 });
      prisma.user.findUnique.mockResolvedValue({ role: 'SELLER' });

      await expect(service.update(1, { name: 'New name' } as any, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('rejects changing the slug to one already used by another product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.seller.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      prisma.product.findFirst.mockResolvedValue({ id: 2 }); // another product already owns this slug

      await expect(service.update(1, { slug: 'someone-elses-slug' } as any, 1)).rejects.toThrow(ConflictException);
    });

    it('does not touch the slug when the DTO does not include one, even though the name changed', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.seller.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      prisma.product.update.mockResolvedValue({ ...product, name: 'New name', specifications: {} });

      await service.update(1, { name: 'New name' } as any, 1);

      const [updateArgs] = prisma.product.update.mock.calls;
      expect(updateArgs[0].data.slug).toBeUndefined();
      expect(prisma.product.findFirst).not.toHaveBeenCalled();
    });
  });
});
