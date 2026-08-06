/*
  Warnings:

  - A unique constraint covering the columns `[cartId,productId,variantId]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `cart_items` ADD COLUMN `variantId` INTEGER NULL;

-- CreateIndex (supporting indexes so the old unique can be dropped safely)
CREATE INDEX `cart_items_cartId_idx` ON `cart_items`(`cartId`);
CREATE INDEX `cart_items_productId_idx` ON `cart_items`(`productId`);

-- DropIndex
DROP INDEX `cart_items_cartId_productId_key` ON `cart_items`;

-- CreateIndex
CREATE UNIQUE INDEX `cart_items_cartId_productId_variantId_key` ON `cart_items`(`cartId`, `productId`, `variantId`);

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
