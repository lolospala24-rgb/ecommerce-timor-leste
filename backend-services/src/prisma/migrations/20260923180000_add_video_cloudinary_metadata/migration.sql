-- AlterTable
ALTER TABLE `videos` ADD COLUMN `duration` DOUBLE NULL,
    ADD COLUMN `format` VARCHAR(191) NULL,
    ADD COLUMN `height` INTEGER NULL,
    ADD COLUMN `thumbnailPublicId` VARCHAR(191) NULL,
    ADD COLUMN `videoPublicId` VARCHAR(191) NULL,
    ADD COLUMN `width` INTEGER NULL;
