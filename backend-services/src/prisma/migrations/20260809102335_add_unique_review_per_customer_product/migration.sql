-- Written by hand rather than via `prisma migrate dev` because the
-- auto-diff engine also wants to DROP `shipping_zones.activeRateKey` (a
-- generated column intentionally left unmodeled in schema.prisma, added by
-- a prior hand-written migration for DB-level duplicate-rate enforcement).
-- This migration only contains the one additive change actually intended.

-- CreateIndex: enforce "one review per customer per product" atomically at
-- the DB level. The service layer already checks this before insert, but
-- that check-then-write isn't atomic under concurrent requests from the
-- same user — this constraint is the real guarantee.
CREATE UNIQUE INDEX `reviews_productId_userId_key` ON `reviews`(`productId`, `userId`);
