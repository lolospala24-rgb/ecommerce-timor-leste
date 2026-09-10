ALTER TABLE `sellers`
  ADD COLUMN `municipalityId` INTEGER NULL;

CREATE INDEX `sellers_municipalityId_idx` ON `sellers`(`municipalityId`);

-- AddForeignKey
ALTER TABLE `sellers` ADD CONSTRAINT `sellers_municipalityId_fkey` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
