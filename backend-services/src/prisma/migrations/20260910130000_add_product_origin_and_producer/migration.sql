-- Seller's declared local origin — plain text, independent of the
-- Shipping Municipality table (see Seller.originMunicipality's doc-comment
-- in schema.prisma). Distinct from storeAddress (where the store operates).
ALTER TABLE `sellers`
  ADD COLUMN `originMunicipality` VARCHAR(191) NULL;

-- Product-level origin/producer fields — all nullable, all additive.
-- originMode defaults to SELLER_ORIGIN for every row (existing and new):
-- this does not fabricate an origin for any product. It only says "resolve
-- from the seller" — actual resolution still returns null when the seller
-- has no declared origin (see ProductsService's resolveOrigin). No
-- historical product silently gains a fake municipality from this default.
ALTER TABLE `products`
  ADD COLUMN `originMode` ENUM('SELLER_ORIGIN', 'CUSTOM_ORIGIN') NOT NULL DEFAULT 'SELLER_ORIGIN',
  ADD COLUMN `originMunicipality` VARCHAR(191) NULL,
  ADD COLUMN `originPostoAdmin` VARCHAR(191) NULL,
  ADD COLUMN `originSuco` VARCHAR(191) NULL,
  ADD COLUMN `originAldeia` VARCHAR(191) NULL,
  ADD COLUMN `producerName` VARCHAR(191) NULL,
  ADD COLUMN `producerOrganization` VARCHAR(191) NULL,
  ADD COLUMN `producerPhone` VARCHAR(191) NULL;
