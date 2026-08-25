ALTER TABLE `products`
  ADD COLUMN `wholesalePrice` DOUBLE NULL,
  ADD COLUMN `wholesaleMinQty` INTEGER NULL,
  ADD COLUMN `packagingName` VARCHAR(191) NULL,
  ADD COLUMN `packagingUnitCount` INTEGER NULL,
  ADD COLUMN `packagingPrice` DOUBLE NULL;
