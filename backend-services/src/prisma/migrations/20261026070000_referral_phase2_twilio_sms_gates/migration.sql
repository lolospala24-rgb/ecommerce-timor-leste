-- Referral Phase 2: Twilio SMS provider + safety gates. See
-- ReferralsService/PhoneVerificationService/TwilioSmsProvider doc-comments.

-- AlterTable
ALTER TABLE `system_settings`
  ADD COLUMN `referralPhoneVerificationRequiredSince` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `sms_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `phoneMasked` VARCHAR(191) NOT NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `costAmount` DOUBLE NULL,
    `costCurrency` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sms_logs_createdAt_idx`(`createdAt`),
    INDEX `sms_logs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sms_logs` ADD CONSTRAINT `sms_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
