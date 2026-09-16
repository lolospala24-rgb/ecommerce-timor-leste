-- CreateTable
CREATE TABLE `product_type_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sellerId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameTetum` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `fields` JSON NOT NULL,
    `specFields` JSON NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `resultingTypeId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_type_requests_sellerId_idx`(`sellerId`),
    INDEX `product_type_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_type_requests` ADD CONSTRAINT `product_type_requests_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_type_requests` ADD CONSTRAINT `product_type_requests_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_type_requests` ADD CONSTRAINT `product_type_requests_resultingTypeId_fkey` FOREIGN KEY (`resultingTypeId`) REFERENCES `product_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
