-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `actorId` INTEGER NULL,
    ADD COLUMN `category` ENUM('ORDER', 'PAYMENT', 'SHIPPING', 'SELLER', 'PRODUCT', 'CUSTOMER', 'SYSTEM', 'SECURITY') NOT NULL DEFAULT 'SYSTEM',
    ADD COLUMN `entityId` INTEGER NULL,
    ADD COLUMN `entityType` VARCHAR(191) NULL,
    ADD COLUMN `priority` ENUM('INFO', 'SUCCESS', 'WARNING', 'CRITICAL') NOT NULL DEFAULT 'INFO';

-- CreateIndex
CREATE INDEX `notifications_category_idx` ON `notifications`(`category`);

-- CreateIndex
CREATE INDEX `notifications_entityType_entityId_idx` ON `notifications`(`entityType`, `entityId`);
