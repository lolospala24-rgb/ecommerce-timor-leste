-- CreateTable
CREATE TABLE `quick_menu_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NULL,
    `iconType` ENUM('LIBRARY', 'UPLOAD') NOT NULL DEFAULT 'LIBRARY',
    `iconKey` VARCHAR(191) NULL,
    `iconUrl` VARCHAR(191) NULL,
    `linkType` ENUM('INTERNAL', 'EXTERNAL') NOT NULL DEFAULT 'INTERNAL',
    `link` VARCHAR(191) NOT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `badge` VARCHAR(191) NULL,
    `openInNewTab` BOOLEAN NOT NULL DEFAULT false,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `quick_menu_items_isActive_displayOrder_idx`(`isActive`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed the 4 default items (spec section 2) — admin can edit/reorder/
-- delete/add freely afterward; nothing about these 4 rows is locked in
-- application code.
INSERT INTO `quick_menu_items`
  (`title`, `subtitle`, `iconType`, `iconKey`, `linkType`, `link`, `displayOrder`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('All Products', 'Browse all products', 'LIBRARY', 'all-products', 'INTERNAL', '/products', 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('Local Products', 'Made in Timor-Leste', 'LIBRARY', 'local-products', 'INTERNAL', '/categories/local-products', 1, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('Promotions', 'Deals & discounts', 'LIBRARY', 'promotions', 'INTERNAL', '/deals', 2, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('Become a Seller', 'Start selling with Lolospala', 'LIBRARY', 'become-seller', 'INTERNAL', '/seller/register', 3, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
