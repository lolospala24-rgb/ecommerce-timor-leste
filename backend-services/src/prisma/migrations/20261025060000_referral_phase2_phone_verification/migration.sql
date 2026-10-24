-- Referral Phase 2, Section C: phone verification gating referral payout.
-- See ReferralsService/PhoneVerificationService doc-comments.

-- AlterTable
ALTER TABLE `system_settings`
  ADD COLUMN `referralRequirePhoneVerification` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `users`
  ADD COLUMN `phoneVerifiedAt` DATETIME(3) NULL,
  ADD COLUMN `verifiedPhone` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_verifiedPhone_key` ON `users`(`verifiedPhone`);

-- CreateTable
CREATE TABLE `phone_verification_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `phone_verification_codes_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `phone_verification_codes` ADD CONSTRAINT `phone_verification_codes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
