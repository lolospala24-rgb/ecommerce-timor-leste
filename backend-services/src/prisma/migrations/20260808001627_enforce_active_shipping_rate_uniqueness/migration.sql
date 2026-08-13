-- Enforces at the database level that a given (courier, municipality,
-- shippingMethod) combination can have at most one ACTIVE shipping rate.
-- The application layer already checks this (ShippingService.assertNoDuplicateRate,
-- wrapped in a transaction), but MySQL/MariaDB has no direct "partial
-- unique index" (unique only when a condition holds) the way Postgres
-- does. This uses the standard workaround: a STORED generated column that
-- evaluates to NULL for any row that shouldn't be constrained (inactive
-- rates, or rates missing a courier/municipality — e.g. province-wide
-- fallbacks), and a real UNIQUE index on that column. MySQL/MariaDB unique
-- indexes allow unlimited NULLs, so only rows that resolve to a non-NULL
-- key are actually compared against each other.
--
-- This column is intentionally not modeled in schema.prisma: the
-- application never reads or writes it directly, it exists purely as a
-- database-enforced invariant.
ALTER TABLE `shipping_zones`
  ADD COLUMN `activeRateKey` VARCHAR(191) GENERATED ALWAYS AS (
    CASE
      WHEN `status` = 'ACTIVE' AND `courierId` IS NOT NULL AND `municipalityId` IS NOT NULL
        THEN CONCAT(`courierId`, '-', `municipalityId`, '-', COALESCE(`shippingMethod`, ''))
      ELSE NULL
    END
  ) STORED;

ALTER TABLE `shipping_zones`
  ADD UNIQUE INDEX `shipping_zones_active_rate_key` (`activeRateKey`);
