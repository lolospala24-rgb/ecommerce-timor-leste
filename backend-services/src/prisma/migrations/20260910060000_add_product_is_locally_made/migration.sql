ALTER TABLE `products`
  ADD COLUMN `isLocallyMade` BOOLEAN NOT NULL DEFAULT false;

-- Backfill: HomepageSectionRule.LOCAL used to be resolved by category
-- (whichever category an admin pointed a "Local" section's config.categoryId
-- at). Products already sitting in that category are the best available
-- signal for what should start out tagged `isLocallyMade`, so the live
-- "Produtu Local" homepage section keeps showing the same products the
-- moment this ships, instead of going empty until sellers manually tag
-- anything. Matches the same category name/slug aliases the old
-- ProductsService.getLocalProducts fuzzy-matched on.
UPDATE `products` p
JOIN `categories` c ON p.categoryId = c.id
SET p.isLocallyMade = true
WHERE c.slug IN ('local-products', 'Produtu-Local')
   OR c.name IN ('Local Products', 'Produtu Local')
   OR c.nameTetum IN ('Local Products', 'Produtu Local');
