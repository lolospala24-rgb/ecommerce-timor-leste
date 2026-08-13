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
-- Adding a STORED generated column forces InnoDB to rebuild the table
-- (ALGORITHM=COPY — stored generated columns can't be added
-- INPLACE/INSTANT), and InnoDB fails that rebuild with error 1215
-- ("Cannot add foreign key constraint") while the table still owns
-- foreign keys. Drop them first and recreate afterwards.
ALTER TABLE `shipping_zones` DROP FOREIGN KEY `shipping_zones_provinceId_fkey`;
ALTER TABLE `shipping_zones` DROP FOREIGN KEY `shipping_zones_municipalityId_fkey`;
ALTER TABLE `shipping_zones` DROP FOREIGN KEY `shipping_zones_courierId_fkey`;
ALTER TABLE `shipping_zones` DROP FOREIGN KEY `shipping_zones_courierServiceId_fkey`;
ALTER TABLE `shipping_zones` DROP FOREIGN KEY `shipping_zones_courierRateId_fkey`;

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

ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `provinces` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_municipalityId_fkey` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `couriers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_courierServiceId_fkey` FOREIGN KEY (`courierServiceId`) REFERENCES `courier_services` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_courierRateId_fkey` FOREIGN KEY (`courierRateId`) REFERENCES `courier_rates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
