-- AlterTable
ALTER TABLE `hero_banners`
    ADD COLUMN `badge` VARCHAR(191) NULL AFTER `id`,
    ADD COLUMN `subtitle` VARCHAR(191) NULL AFTER `title`,
    ADD COLUMN `buttonText` VARCHAR(191) NULL AFTER `subtitle`;
