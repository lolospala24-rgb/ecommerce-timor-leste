-- CreateTable
CREATE TABLE `promotions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sellerId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL,
    `discountValue` DOUBLE NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `promotions_sellerId_idx`(`sellerId`),
    INDEX `promotions_isActive_startAt_endAt_idx`(`isActive`, `startAt`, `endAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promotion_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `promotionId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `variantId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `promotion_items_productId_idx`(`productId`),
    INDEX `promotion_items_variantId_idx`(`variantId`),
    UNIQUE INDEX `promotion_items_promotionId_productId_variantId_key`(`promotionId`, `productId`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `order_items`
    ADD COLUMN `originalPrice` DOUBLE NULL,
    ADD COLUMN `promotionId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `order_items_promotionId_idx` ON `order_items`(`promotionId`);

-- AddForeignKey
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_items` ADD CONSTRAINT `promotion_items_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `promotions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_items` ADD CONSTRAINT `promotion_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_items` ADD CONSTRAINT `promotion_items_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `promotions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
