-- Written by hand rather than via `prisma migrate dev` because the
-- auto-diff engine also wants to DROP `shipping_zones.activeRateKey` (a
-- generated column intentionally left unmodeled in schema.prisma, added by
-- a prior hand-written migration for DB-level duplicate-rate enforcement).
-- This migration only contains the two additive changes actually intended.

-- AlterTable: track which variant (if any) an order line was for. Nullable
-- since existing rows and non-variant products have none.
ALTER TABLE `order_items` ADD COLUMN `variantId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `order_items_variantId_idx` ON `order_items`(`variantId`);

-- CreateIndex: product_variants.productId had no index despite being the
-- primary lookup column for every "list this product's variants" query.
CREATE INDEX `product_variants_productId_idx` ON `product_variants`(`productId`);

-- AddForeignKey: RESTRICT (not Prisma's SetNull default for optional
-- relations) — a variant referenced by any order line can't be
-- hard-deleted; ProductsService.deleteVariant enforces the same rule at
-- the application layer first, with a clear error message.
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
