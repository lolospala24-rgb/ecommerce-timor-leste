-- Google Sign-In (via Firebase): existing users keep provider='EMAIL' and
-- their password untouched. Google-only accounts have password=NULL,
-- provider='GOOGLE', and a unique googleId (Firebase UID). `avatar` also
-- backfills a pre-existing gap — UsersService.update() already wrote to a
-- User.avatar column that never existed in the schema.
ALTER TABLE `users`
  MODIFY COLUMN `password` VARCHAR(191) NULL,
  ADD COLUMN `provider` ENUM('EMAIL', 'GOOGLE') NOT NULL DEFAULT 'EMAIL',
  ADD COLUMN `googleId` VARCHAR(191) NULL,
  ADD COLUMN `avatar` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `users_googleId_key` ON `users`(`googleId`);
