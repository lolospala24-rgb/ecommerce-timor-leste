-- 1. Real commission reversal on refund (resolves the previously-flagged
--    "commission not reversed on refund" business decision).
ALTER TABLE `refunds`
    ADD COLUMN `commissionReversed` DOUBLE NOT NULL DEFAULT 0;

-- 2. Payment expiry (bank-transfer receipts that are never uploaded).
ALTER TABLE `payments`
    ADD COLUMN `expiresAt` DATETIME(3) NULL;

-- 3. Settings: how many hours before an unpaid bank-transfer expires.
ALTER TABLE `system_settings`
    ADD COLUMN `paymentExpiryHours` DOUBLE NOT NULL DEFAULT 48;

-- 4. New ledger entry type for the resync operation.
ALTER TABLE `seller_ledger_entries`
    MODIFY COLUMN `type` ENUM('SALE', 'COMMISSION', 'RELEASE', 'REFUND', 'COMMISSION_REVERSAL', 'PAYOUT', 'ADJUSTMENT', 'RESYNC') NOT NULL;
