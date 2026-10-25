-- Referral Phase 1: hold period before payout, monthly cap, clawback on
-- full refund, deferred welcome credit. See ReferralsService/
-- ReferralPayoutJob/RefundsService doc-comments for the full flow.

-- AlterTable
ALTER TABLE `referrals`
  ADD COLUMN `qualifiedAt` DATETIME(3) NULL,
  ADD COLUMN `welcomeCreditGrantedAt` DATETIME(3) NULL,
  ADD COLUMN `reversedAt` DATETIME(3) NULL,
  MODIFY `status` ENUM('PENDING', 'QUALIFIED', 'REWARDED', 'CAPPED', 'REVERSED') NOT NULL DEFAULT 'PENDING';

-- Backfill welcomeCreditGrantedAt — but ONLY for referrals that actually
-- received a welcome credit under the old instant-at-registration flow.
-- That flow (AuthService.register -> ReferralsService.createReferralForNewUser,
-- pre-Phase-1) always created the Referral row, but only wrote a
-- WalletTransaction('REFERRAL_WELCOME') when referralWelcomeCredit was > 0
-- at that moment (the program could've been disabled, or the setting
-- could've been 0, at the time a given user signed up). Blindly stamping
-- every old row with createdAt — as an earlier version of this migration
-- did — would wrongly mark referrals that never actually got a welcome
-- credit as "already granted", permanently denying that credit once
-- ReferralPayoutJob later processes them. The old flow never set
-- referralId on that WalletTransaction row, but userId is safe to join on
-- unassisted: referredUserId is unique across `referrals` (one referral
-- per user, ever — see the UNIQUE index below), so a given user can match
-- at most one referral's welcome-credit transaction.
UPDATE `referrals` r
SET `welcomeCreditGrantedAt` = (
  SELECT MIN(wt.`createdAt`)
  FROM `wallet_transactions` wt
  WHERE wt.`userId` = r.`referredUserId` AND wt.`type` = 'REFERRAL_WELCOME'
)
WHERE r.`welcomeCreditGrantedAt` IS NULL
  AND EXISTS (
    SELECT 1 FROM `wallet_transactions` wt
    WHERE wt.`userId` = r.`referredUserId` AND wt.`type` = 'REFERRAL_WELCOME'
  );
-- Referrals with no matching WalletTransaction (program disabled or
-- referralWelcomeCredit was 0 at signup time) are deliberately left with
-- welcomeCreditGrantedAt = NULL, so ReferralPayoutJob grants it honestly
-- the first time that referral is actually processed.

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
