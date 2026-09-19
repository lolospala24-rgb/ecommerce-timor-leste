-- AlterTable: referralCode added NULLable first — existing users have no
-- code yet and MySQL strict mode rejects a NOT NULL column with no default
-- on a non-empty table. Backfilled immediately below (this migration file
-- runs unattended via docker-entrypoint.sh's automatic `prisma migrate
-- deploy` on every deploy, so the backfill has to be part of the SQL
-- itself, not a separate manual script), then a follow-up migration
-- promotes the column to NOT NULL + UNIQUE.
ALTER TABLE `users`
  ADD COLUMN `referralCode` VARCHAR(191) NULL,
  ADD COLUMN `referredById` INTEGER NULL,
  ADD COLUMN `walletCredit` DOUBLE NOT NULL DEFAULT 0;

-- Backfill for every pre-existing user. Derived from MD5(id, email, RAND())
-- rather than the app's own charset-restricted generator (referral-code.util.ts)
-- since this has to run as plain SQL with no Node/Prisma runtime available —
-- collision odds across any realistic user base are astronomically low, and
-- every NEW code from here on is generated (and uniqueness-checked) by the
-- real application code, not this one-off backfill.
UPDATE `users`
SET `referralCode` = UPPER(SUBSTRING(MD5(CONCAT(id, email, RAND())), 1, 8))
WHERE `referralCode` IS NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `walletCreditUsed` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `system_settings`
  ADD COLUMN `referralProgramEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `referralRewardAmount` DOUBLE NOT NULL DEFAULT 5,
  ADD COLUMN `referralWelcomeCredit` DOUBLE NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE `referrals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referrerId` INTEGER NOT NULL,
    `referredUserId` INTEGER NOT NULL,
    `referralCodeUsed` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'REWARDED') NOT NULL DEFAULT 'PENDING',
    `welcomeCreditAmount` DOUBLE NOT NULL,
    `rewardAmount` DOUBLE NULL,
    `qualifyingOrderId` INTEGER NULL,
    `rewardedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `referrals_referredUserId_key`(`referredUserId`),
    INDEX `referrals_referrerId_idx`(`referrerId`),
    INDEX `referrals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('REFERRAL_WELCOME', 'REFERRAL_REWARD', 'CHECKOUT_REDEMPTION', 'ADMIN_ADJUSTMENT') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `balanceAfter` DOUBLE NOT NULL,
    `referralId` INTEGER NULL,
    `orderId` INTEGER NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wallet_transactions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `users_referredById_idx` ON `users`(`referredById`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_referredById_fkey` FOREIGN KEY (`referredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referredUserId_fkey` FOREIGN KEY (`referredUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_qualifyingOrderId_fkey` FOREIGN KEY (`qualifyingOrderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
