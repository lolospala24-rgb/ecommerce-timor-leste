-- AlterTable
ALTER TABLE `product_types` ADD COLUMN `specFields` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT ('{}') CHECK (json_valid(`specFields`));
