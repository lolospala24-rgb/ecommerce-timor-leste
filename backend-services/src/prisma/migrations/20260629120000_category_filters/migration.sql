-- Category dynamic filters & product attributes
ALTER TABLE `categories`
  ADD COLUMN `banner` VARCHAR(191) NULL,
  ADD COLUMN `filterConfig` JSON NOT NULL DEFAULT ('[]');

ALTER TABLE `products`
  ADD COLUMN `brand` VARCHAR(191) NULL,
  ADD COLUMN `specifications` JSON NOT NULL DEFAULT ('{}');

CREATE INDEX `products_brand_idx` ON `products`(`brand`);

CREATE TABLE `product_attributes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `productId` INTEGER NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `value` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `product_attributes_productId_key_key`(`productId`, `key`),
  INDEX `product_attributes_key_value_idx`(`key`, `value`),
  INDEX `product_attributes_productId_idx`(`productId`),
  CONSTRAINT `product_attributes_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
