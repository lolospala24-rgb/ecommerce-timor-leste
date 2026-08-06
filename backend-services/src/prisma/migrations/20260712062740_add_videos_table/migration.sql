/*
  Warnings:

  - You are about to drop the column `postoAdmin` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `users` table. All the data in the column will be lost.
  - Added the required column `municipalityId` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provinceId` to the `addresses` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `product_attributes_key_value_idx` ON `product_attributes`;

-- DropIndex
DROP INDEX `products_brand_idx` ON `products`;

-- AlterTable
ALTER TABLE `addresses` DROP COLUMN `postoAdmin`,
    ADD COLUMN `administrativePost` VARCHAR(191) NULL,
    ADD COLUMN `countryId` INTEGER NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `municipalityId` INTEGER NOT NULL,
    ADD COLUMN `postalCode` VARCHAR(191) NULL,
    ADD COLUMN `province` VARCHAR(191) NULL,
    ADD COLUMN `provinceId` INTEGER NOT NULL,
    MODIFY `municipality` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `courier` VARCHAR(191) NULL,
    ADD COLUMN `estimatedDeliveryDate` DATETIME(3) NULL,
    ADD COLUMN `serviceFee` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `shippingMethod` VARCHAR(191) NULL,
    ADD COLUMN `shippingStatus` ENUM('PENDING', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `shippingZoneId` INTEGER NULL,
    ADD COLUMN `taxAmount` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `total` DOUBLE NULL,
    MODIFY `paymentMethod` ENUM('COD', 'BANK_TRANSFER') NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `videoUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `avatar`;

-- CreateTable
CREATE TABLE `countries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `countries_name_key`(`name`),
    UNIQUE INDEX `countries_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provinces` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `countryId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `provinces_countryId_name_key`(`countryId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `videos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `videoUrl` VARCHAR(191) NOT NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
    `views` INTEGER NOT NULL DEFAULT 0,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `shares` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `videos_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `municipalities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provinceId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `municipalities_provinceId_name_key`(`provinceId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `couriers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `trackingUrl` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `couriers_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courier_services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `courierId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `courier_services_courierId_name_key`(`courierId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courier_rates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `courierId` INTEGER NOT NULL,
    `courierServiceId` INTEGER NOT NULL,
    `provinceId` INTEGER NULL,
    `municipalityId` INTEGER NULL,
    `price` DOUBLE NOT NULL,
    `etaDays` INTEGER NULL,
    `minimumWeight` DOUBLE NULL,
    `maximumWeight` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `priority` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipping_zones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `zoneName` VARCHAR(191) NOT NULL,
    `provinceId` INTEGER NULL,
    `municipalityId` INTEGER NULL,
    `courierId` INTEGER NULL,
    `courierServiceId` INTEGER NULL,
    `courierRateId` INTEGER NULL,
    `shippingMethod` VARCHAR(191) NULL,
    `shippingCost` DOUBLE NOT NULL,
    `estimatedDeliveryDays` INTEGER NULL,
    `minimumWeight` DOUBLE NULL,
    `maximumWeight` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `priority` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipping_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `defaultShippingCost` DOUBLE NOT NULL DEFAULT 2.5,
    `freeShippingThreshold` DOUBLE NOT NULL DEFAULT 50,
    `enableFreeShipping` BOOLEAN NOT NULL DEFAULT false,
    `enableDynamicShipping` BOOLEAN NOT NULL DEFAULT false,
    `enableLocalPickup` BOOLEAN NOT NULL DEFAULT false,
    `defaultCourier` VARCHAR(191) NULL,
    `defaultShippingMethod` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_shippingZoneId_fkey` FOREIGN KEY (`shippingZoneId`) REFERENCES `shipping_zones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `provinces` ADD CONSTRAINT `provinces_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `videos` ADD CONSTRAINT `videos_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `municipalities` ADD CONSTRAINT `municipalities_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_municipalityId_fkey` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courier_services` ADD CONSTRAINT `courier_services_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `couriers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courier_rates` ADD CONSTRAINT `courier_rates_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `couriers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courier_rates` ADD CONSTRAINT `courier_rates_courierServiceId_fkey` FOREIGN KEY (`courierServiceId`) REFERENCES `courier_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courier_rates` ADD CONSTRAINT `courier_rates_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courier_rates` ADD CONSTRAINT `courier_rates_municipalityId_fkey` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_municipalityId_fkey` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `couriers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_courierServiceId_fkey` FOREIGN KEY (`courierServiceId`) REFERENCES `courier_services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_courierRateId_fkey` FOREIGN KEY (`courierRateId`) REFERENCES `courier_rates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
