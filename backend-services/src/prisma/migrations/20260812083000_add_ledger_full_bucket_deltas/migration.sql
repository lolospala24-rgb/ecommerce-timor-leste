-- Full symmetry across all 5 SellerBalance buckets on the ledger — a
-- transfer row (RELEASE, PAYOUT) must record both its outgoing and
-- incoming bucket explicitly. Previously paidOut/refunded movements had no
-- dedicated delta column, and the admin UI's ledger row summed
-- pendingDelta+availableDelta as a single "delta" figure, which silently
-- nets to $0.00 for any pure transfer between buckets (e.g. RELEASE:
-- pendingDelta=-45, availableDelta=+45 sums to 0) even though real money
-- moved — confirmed via direct SQL inspection that the underlying data was
-- always correct; only that derived display sum was misleading.

ALTER TABLE `seller_ledger_entries`
    ADD COLUMN `paidOutDelta` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `refundedDelta` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `paidOutBalanceAfter` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `refundedBalanceAfter` DOUBLE NOT NULL DEFAULT 0;
