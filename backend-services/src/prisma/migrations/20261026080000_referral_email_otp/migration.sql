-- Referral verification: switch active channel from phone/SMS OTP to
-- email OTP. See User.referralEmailVerifiedAt and EmailOtpService
-- doc-comments.

-- AlterTable
ALTER TABLE `users` ADD COLUMN `referralEmailVerifiedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `email_otp_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_otp_codes_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_otp_codes` ADD CONSTRAINT `email_otp_codes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
