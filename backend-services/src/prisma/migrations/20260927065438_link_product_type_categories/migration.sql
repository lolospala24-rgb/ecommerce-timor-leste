-- CreateTable
CREATE TABLE `_CategoryToProductType` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CategoryToProductType_AB_unique`(`A`, `B`),
    INDEX `_CategoryToProductType_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_CategoryToProductType` ADD CONSTRAINT `_CategoryToProductType_A_fkey` FOREIGN KEY (`A`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryToProductType` ADD CONSTRAINT `_CategoryToProductType_B_fkey` FOREIGN KEY (`B`) REFERENCES `product_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
