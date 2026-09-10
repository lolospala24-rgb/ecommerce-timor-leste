-- Revert: Seller.municipalityId coupled the store's own address to the
-- Shipping Municipality table. Seller address must be independent of
-- Shipping/delivery configuration — see Seller.storeAddress's doc-comment.
ALTER TABLE `sellers` DROP FOREIGN KEY `sellers_municipalityId_fkey`;
DROP INDEX `sellers_municipalityId_idx` ON `sellers`;
ALTER TABLE `sellers` DROP COLUMN `municipalityId`;

-- Independent geocoding of storeAddress (Google Places Autocomplete),
-- with no relationship to the Municipality table.
ALTER TABLE `sellers`
  ADD COLUMN `storeLatitude` DOUBLE NULL,
  ADD COLUMN `storeLongitude` DOUBLE NULL;
