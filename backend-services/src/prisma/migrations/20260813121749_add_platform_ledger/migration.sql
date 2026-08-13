-- CreateTable
CREATE TABLE `platform_balance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commissionRevenue` DOUBLE NOT NULL DEFAULT 0,
    `shippingHeld` DOUBLE NOT NULL DEFAULT 0,
    `shippingRemitted` DOUBLE NOT NULL DEFAULT 0,
    `taxHeld` DOUBLE NOT NULL DEFAULT 0,
    `taxRemitted` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_ledger_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NULL,
    `refundId` INTEGER NULL,
    `type` ENUM('COMMISSION', 'SHIPPING_COLLECTED', 'TAX_COLLECTED', 'COMMISSION_REVERSAL', 'SHIPPING_REVERSAL', 'TAX_REVERSAL', 'REMITTANCE', 'ADJUSTMENT', 'RESYNC') NOT NULL,
    `commissionDelta` DOUBLE NOT NULL DEFAULT 0,
    `shippingHeldDelta` DOUBLE NOT NULL DEFAULT 0,
    `shippingRemittedDelta` DOUBLE NOT NULL DEFAULT 0,
    `taxHeldDelta` DOUBLE NOT NULL DEFAULT 0,
    `taxRemittedDelta` DOUBLE NOT NULL DEFAULT 0,
    `commissionBalanceAfter` DOUBLE NOT NULL,
    `shippingHeldBalanceAfter` DOUBLE NOT NULL,
    `shippingRemittedBalanceAfter` DOUBLE NOT NULL DEFAULT 0,
    `taxHeldBalanceAfter` DOUBLE NOT NULL,
    `taxRemittedBalanceAfter` DOUBLE NOT NULL DEFAULT 0,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `platform_ledger_entries_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `platform_ledger_entries` ADD CONSTRAINT `platform_ledger_entries_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_ledger_entries` ADD CONSTRAINT `platform_ledger_entries_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `refunds`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
