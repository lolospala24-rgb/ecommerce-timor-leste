-- `products.isFastDelivery` was never modeled in schema.prisma and has no
-- code references anywhere in the monorepo — orphaned column, empty of real
-- data (0 of 8 products had it set true at time of removal).
ALTER TABLE `products` DROP COLUMN `isFastDelivery`;
