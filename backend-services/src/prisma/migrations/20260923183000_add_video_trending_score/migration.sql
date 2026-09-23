-- AlterTable
ALTER TABLE `videos` ADD COLUMN `trendingScore` DOUBLE NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `videos_trendingScore_idx` ON `videos`(`trendingScore`);
