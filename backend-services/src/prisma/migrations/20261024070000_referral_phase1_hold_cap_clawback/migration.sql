-- Referral Phase 1: hold period before payout, monthly cap, clawback on
-- full refund, deferred welcome credit. See ReferralsService/
-- ReferralPayoutJob/RefundsService doc-comments for the full flow.

-- AlterTable
ALTER TABLE `referrals`
  ADD COLUMN `qualifiedAt` DATETIME(3) NULL,
  ADD COLUMN `welcomeCreditGrantedAt` DATETIME(3) NULL,
  ADD COLUMN `reversedAt` DATETIME(3) NULL,
  MODIFY `status` ENUM('PENDING', 'QUALIFIED', 'REWARDED', 'CAPPED', 'REVERSED') NOT NULL DEFAULT 'PENDING';

-- Backfill for every pre-existing referral row (both PENDING and
-- REWARDED): under the old flow, every one of these already had its
-- referred user's welcome credit granted instantly at registration.
-- Without this, a pre-existing PENDING referral that qualifies under the
-- new flow would get a second, duplicate welcome credit the first time
-- ReferralPayoutJob processes it. Pre-existing REWARDED rows are
-- otherwise left untouched (status stays REWARDED, qualifiedAt/reversedAt
-- stay NULL — unused for an already-terminal row).
UPDATE `referrals`
SET `welcomeCreditGrantedAt` = `createdAt`
WHERE `welcomeCreditGrantedAt` IS NULL;

-- AlterTable
ALTER TABLE `wallet_transactions`
  MODIFY `type` ENUM('REFERRAL_WELCOME', 'REFERRAL_REWARD', 'REFERRAL_REWARD_REVERSED', 'CHECKOUT_REDEMPTION', 'ADMIN_ADJUSTMENT') NOT NULL;

-- AlterTable
ALTER TABLE `system_settings`
  ADD COLUMN `referralHoldDays` INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN `referralMinQualifyingAmount` DOUBLE NOT NULL DEFAULT 5,
  ADD COLUMN `referralMonthlyCap` INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE `referral_monthly_reward_counts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referrerId` INTEGER NOT NULL,
    `monthKey` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `referral_monthly_reward_counts_referrerId_monthKey_key`(`referrerId`, `monthKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
