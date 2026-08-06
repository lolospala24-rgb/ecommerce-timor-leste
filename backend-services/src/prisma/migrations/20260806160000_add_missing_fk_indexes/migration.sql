-- Add missing indexes on foreign key / lookup columns flagged in the audit:
-- shipping-cost lookups on checkout (shipping_zones, courier_rates),
-- category tree traversal (categories.parentId), order lookups by address
-- or shipping zone, and admin log queries by admin/target.

CREATE INDEX `categories_parentId_idx` ON `categories`(`parentId`);

CREATE INDEX `admin_logs_adminId_idx` ON `admin_logs`(`adminId`);
CREATE INDEX `admin_logs_targetType_targetId_idx` ON `admin_logs`(`targetType`, `targetId`);

CREATE INDEX `orders_addressId_idx` ON `orders`(`addressId`);
CREATE INDEX `orders_shippingZoneId_idx` ON `orders`(`shippingZoneId`);

CREATE INDEX `courier_rates_courierId_idx` ON `courier_rates`(`courierId`);
CREATE INDEX `courier_rates_courierServiceId_idx` ON `courier_rates`(`courierServiceId`);
CREATE INDEX `courier_rates_provinceId_idx` ON `courier_rates`(`provinceId`);
CREATE INDEX `courier_rates_municipalityId_idx` ON `courier_rates`(`municipalityId`);

CREATE INDEX `shipping_zones_provinceId_idx` ON `shipping_zones`(`provinceId`);
CREATE INDEX `shipping_zones_municipalityId_idx` ON `shipping_zones`(`municipalityId`);
CREATE INDEX `shipping_zones_courierId_idx` ON `shipping_zones`(`courierId`);
CREATE INDEX `shipping_zones_courierServiceId_idx` ON `shipping_zones`(`courierServiceId`);
CREATE INDEX `shipping_zones_courierRateId_idx` ON `shipping_zones`(`courierRateId`);
