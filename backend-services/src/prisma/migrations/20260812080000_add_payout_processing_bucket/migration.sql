-- Adds an explicit "processing" balance bucket: funds move
-- available -> processing when a payout is created, then
-- processing -> paidOut (mark paid) or processing -> available (rejected).
-- Backfills existing rows: any payout currently PENDING/APPROVED had its
-- amount already deducted from availableAmount but nowhere reflected as
-- "processing" — this backfill makes historical balances consistent with
-- the new bucket instead of just defaulting everyone to 0.

ALTER TABLE `seller_balances`
    ADD COLUMN `processingAmount` DOUBLE NOT NULL DEFAULT 0;

ALTER TABLE `seller_ledger_entries`
    ADD COLUMN `processingDelta` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `processingBalanceAfter` DOUBLE NOT NULL DEFAULT 0;

UPDATE `seller_balances` sb
SET `processingAmount` = (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM `payouts` p
    WHERE p.sellerId = sb.sellerId AND p.status IN ('PENDING', 'APPROVED')
);
