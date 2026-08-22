-- AlterTable: add COURIER to the Role enum
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('ADMIN', 'SELLER', 'CUSTOMER', 'COURIER') NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable: live (mutable) courier position + driver assignment on orders
ALTER TABLE `orders`
    ADD COLUMN `assignedDriverId` INTEGER NULL,
    ADD COLUMN `courierLatitude` DOUBLE NULL,
    ADD COLUMN `courierLongitude` DOUBLE NULL,
    ADD COLUMN `courierLocationUpdatedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `orders_assignedDriverId_idx` ON `orders`(`assignedDriverId`);

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_assignedDriverId_fkey` FOREIGN KEY (`assignedDriverId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
