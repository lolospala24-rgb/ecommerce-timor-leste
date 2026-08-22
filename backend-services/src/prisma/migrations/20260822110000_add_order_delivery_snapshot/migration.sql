-- AlterTable
ALTER TABLE `orders`
    ADD COLUMN `deliveryRecipientName` VARCHAR(191) NULL,
    ADD COLUMN `deliveryPhone` VARCHAR(191) NULL,
    ADD COLUMN `deliveryMunicipality` VARCHAR(191) NULL,
    ADD COLUMN `deliveryPostoAdmin` VARCHAR(191) NULL,
    ADD COLUMN `deliverySuco` VARCHAR(191) NULL,
    ADD COLUMN `deliveryVillage` VARCHAR(191) NULL,
    ADD COLUMN `deliveryStreet` VARCHAR(191) NULL,
    ADD COLUMN `deliveryReference` VARCHAR(191) NULL,
    ADD COLUMN `deliveryLatitude` DOUBLE NULL,
    ADD COLUMN `deliveryLongitude` DOUBLE NULL;
