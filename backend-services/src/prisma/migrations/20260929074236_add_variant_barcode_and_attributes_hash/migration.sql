-- Adds a per-variant barcode (mirrors the existing Product.barcode, just
-- scoped to one specific attribute combination instead of the whole
-- product) and a DB-level duplicate-combination guard.
--
-- attributesHash is a plain nullable column (NOT a generated column —
-- replicating ProductsService.canonicalizeVariantAttributes' sort/trim/
-- lower-case logic as a pure SQL expression over a JSON column isn't
-- practical), populated by application code on every create/update
-- alongside `attributes` itself. Existing rows are left NULL here and
-- backfilled by a one-off script after this migration runs — until then
-- they're simply not covered by the new DB-level constraint, which is
-- fine: the existing application-layer check in
-- ProductsService.assertNoDuplicateVariantAttributes already protects
-- every row (old and new) by querying live `attributes` JSON directly.
-- This DB constraint is defense-in-depth for future writes, not the
-- primary guard.
ALTER TABLE `product_variants`
  ADD COLUMN `barcode` VARCHAR(191) NULL,
  ADD COLUMN `attributesHash` VARCHAR(191) NULL;

-- MySQL unique indexes allow unlimited NULLs, so a product's flat/no-
-- attribute variants (distinguished only by image/id, not by Size/Warna —
-- see ProductVariantSelector's "no distinguishing attributes" branch) are
-- never restricted to one row by this constraint; only two variants on the
-- same product that both resolve to the same non-NULL canonical signature
-- collide.
ALTER TABLE `product_variants`
  ADD UNIQUE INDEX `product_variants_productId_attributesHash_key` (`productId`, `attributesHash`);
