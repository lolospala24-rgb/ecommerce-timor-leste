-- Promotes referralCode to NOT NULL + UNIQUE now that every existing user
-- has been backfilled with a unique code (see the one-off backfill run
-- immediately after the previous migration, before this one).
ALTER TABLE `users` MODIFY COLUMN `referralCode` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `users_referralCode_key` ON `users`(`referralCode`);
