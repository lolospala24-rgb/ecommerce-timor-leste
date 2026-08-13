-- Hardens the financial ledger against silent history loss. The original
-- FK was `ON DELETE SET NULL`, which meant deleting an Order that already
-- has ledger entries (SALE/COMMISSION/RELEASE/REFUND) would silently null
-- out those entries' orderId instead of the database refusing the delete.
-- The application-level guard in OrdersService.remove() checks for this
-- and blocks it — but that only protects the one code path that goes
-- through the service layer. Anything that touches the database directly
-- (Prisma Studio, a script, a future admin tool, a bug) was never covered
-- by that check. RESTRICT makes the database itself the backstop: an
-- order with real financial history literally cannot be deleted by any
-- means, matching "financial ledger must be immutable/append-only".
--
-- Discovered live: a real order (4x $1,599 product = $6,396 subtotal, sold
-- by a seller created during this session's testing) was deleted by some
-- means outside OrdersService.remove(), leaving two orphaned ledger rows
-- (SALE +$6,396 / COMMISSION -$639.60, orderId now NULL) that the new
-- reconciliation endpoint correctly flagged as a balance mismatch. Those
-- rows are left untouched — they're an honest record of what happened,
-- and per "never silently modify financial history", the correction is a
-- decision for the Reconciliation admin page, not something to paper over
-- here. This migration only prevents a repeat.

ALTER TABLE `seller_ledger_entries` DROP FOREIGN KEY `seller_ledger_entries_orderId_fkey`;

ALTER TABLE `seller_ledger_entries`
    ADD CONSTRAINT `seller_ledger_entries_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
