-- Seller Finance system: commission snapshot, seller balance/ledger, payout, refund.

-- AlterTable: sellers — payout destination
ALTER TABLE `sellers`
    ADD COLUMN `bankName` VARCHAR(191) NULL,
    ADD COLUMN `bankAccountName` VARCHAR(191) NULL,
    ADD COLUMN `bankAccountNumber` VARCHAR(191) NULL;

-- AlterTable: orders — commission snapshot fields
ALTER TABLE `orders`
    ADD COLUMN `commissionRate` DOUBLE NULL,
    ADD COLUMN `commissionAmount` DOUBLE NULL,
    ADD COLUMN `sellerNetAmount` DOUBLE NULL;

-- AlterTable: payments — add PARTIALLY_REFUNDED to status enum
ALTER TABLE `payments`
    MODIFY COLUMN `status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING';

-- AlterTable: system_settings — commission rate + payout minimum
ALTER TABLE `system_settings`
    ADD COLUMN `defaultCommissionRate` DOUBLE NOT NULL DEFAULT 10,
    ADD COLUMN `minimumPayoutAmount` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `seller_balances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sellerId` INTEGER NOT NULL,
    `pendingAmount` DOUBLE NOT NULL DEFAULT 0,
    `availableAmount` DOUBLE NOT NULL DEFAULT 0,
    `paidOutAmount` DOUBLE NOT NULL DEFAULT 0,
    `refundedAmount` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `seller_balances_sellerId_key`(`sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payouts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sellerId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID') NOT NULL DEFAULT 'PENDING',
    `bankName` VARCHAR(191) NOT NULL,
    `bankAccountName` VARCHAR(191) NOT NULL,
    `bankAccountNumber` VARCHAR(191) NOT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `processedBy` INTEGER NULL,
    `adminNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payouts_sellerId_idx`(`sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `type` ENUM('FULL', 'PARTIAL') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requestedBy` INTEGER NOT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedBy` INTEGER NULL,
    `processedAt` DATETIME(3) NULL,
    `adminNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `refunds_paymentId_idx`(`paymentId`),
    INDEX `refunds_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_ledger_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sellerId` INTEGER NOT NULL,
    `orderId` INTEGER NULL,
    `payoutId` INTEGER NULL,
    `refundId` INTEGER NULL,
    `type` ENUM('SALE', 'COMMISSION', 'RELEASE', 'REFUND', 'COMMISSION_REVERSAL', 'PAYOUT', 'ADJUSTMENT') NOT NULL,
    `pendingDelta` DOUBLE NOT NULL DEFAULT 0,
    `availableDelta` DOUBLE NOT NULL DEFAULT 0,
    `pendingBalanceAfter` DOUBLE NOT NULL,
    `availableBalanceAfter` DOUBLE NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `seller_ledger_entries_sellerId_idx`(`sellerId`),
    INDEX `seller_ledger_entries_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `seller_balances` ADD CONSTRAINT `seller_balances_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payouts` ADD CONSTRAINT `payouts_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_ledger_entries` ADD CONSTRAINT `seller_ledger_entries_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_ledger_entries` ADD CONSTRAINT `seller_ledger_entries_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_ledger_entries` ADD CONSTRAINT `seller_ledger_entries_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `payouts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_ledger_entries` ADD CONSTRAINT `seller_ledger_entries_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `refunds`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
