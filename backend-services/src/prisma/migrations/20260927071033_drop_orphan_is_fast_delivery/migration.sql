-- `products.isFastDelivery` was never modeled in schema.prisma and has no
-- code references anywhere in the monorepo — orphaned column, empty of real
-- data (0 of 8 products had it set true at time of removal).
--
-- This column was never created by any tracked migration (it must have been
-- added directly to the database outside of Prisma at some point before
-- this migration existed) — a from-scratch `prisma migrate deploy`/`migrate
-- reset` replays every migration in order against an empty database, where
-- this column genuinely never existed, so a plain `DROP COLUMN` fails there
-- even though it succeeded on every real (already-columned) database it
-- actually ran against. Guarded with information_schema instead of
-- `DROP COLUMN IF EXISTS` (MySQL 8.0.29+ only) so this works on any MySQL
-- 8.0 patch version without assuming what's actually deployed.
--
-- Safe to edit in place on an already-applied database: `prisma migrate
-- deploy` (what production actually runs) only checks whether a migration
-- name is already recorded as applied — it never re-reads or re-validates
-- a migration file's content once applied, so this change is inert there
-- and only matters for a genuinely fresh database.
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'isFastDelivery'
);
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `products` DROP COLUMN `isFastDelivery`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
