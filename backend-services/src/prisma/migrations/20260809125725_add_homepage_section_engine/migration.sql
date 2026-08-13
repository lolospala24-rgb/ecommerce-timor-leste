-- Written by hand rather than via `prisma migrate dev` because the
-- auto-diff engine also wants to DROP `shipping_zones.activeRateKey` (a
-- generated column intentionally left unmodeled in schema.prisma, added by
-- a prior hand-written migration for DB-level duplicate-rate enforcement).
-- This migration only contains the additive Homepage Section Engine tables.

-- CreateTable
CREATE TABLE `homepage_sections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'PRODUCT_COLLECTION',
    `rule` ENUM('MANUAL', 'NEWEST', 'POPULAR', 'BEST_SELLING', 'LOCAL', 'ON_SALE', 'LIMITED_STOCK', 'CATEGORY') NOT NULL,
    `config` JSON NOT NULL,
    `sort` VARCHAR(191) NULL,
    `productLimit` INTEGER NOT NULL DEFAULT 8,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `homepage_sections_isActive_displayOrder_idx`(`isActive`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homepage_section_products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sectionId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `homepage_section_products_sectionId_productId_key`(`sectionId`, `productId`),
    INDEX `homepage_section_products_sectionId_position_idx`(`sectionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `homepage_section_products` ADD CONSTRAINT `homepage_section_products_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `homepage_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `homepage_section_products` ADD CONSTRAINT `homepage_section_products_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
