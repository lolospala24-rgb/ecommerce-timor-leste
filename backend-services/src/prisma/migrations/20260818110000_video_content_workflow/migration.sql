-- Video content workflow: replaces the dead `status` column (it existed
-- but nothing ever read or wrote it — every query gated on `isActive`
-- instead) with the real driver, plus per-video moderation/engagement
-- toggles and a visibility level.

-- 1. New columns, defaulting to "on"/"public" so existing rows keep their
--    current effective behavior once isActive is retired below.
ALTER TABLE `videos`
  ADD COLUMN `visibility` ENUM('PUBLIC', 'UNLISTED', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN `allowComments` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `allowLikes` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `allowSharing` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `allowSave` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `enableShopping` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `publishedAt` DATETIME(3) NULL;

-- 2. Widen the status enum so both the old and new value sets are valid
--    while the data below is converted — narrowing straight to the new
--    set first would reject any existing DRAFT/ARCHIVED/PUBLISHED row.
ALTER TABLE `videos`
  MODIFY COLUMN `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'PENDING', 'SCHEDULED', 'REJECTED') NOT NULL DEFAULT 'PUBLISHED';

-- 3. `status` was never actually read anywhere, so its stored value isn't
--    trustworthy — derive the real status fresh from `isActive`, the
--    column every query actually gated on.
UPDATE `videos` SET `status` = CASE WHEN `isActive` = 1 THEN 'PUBLISHED' ELSE 'PENDING' END;
UPDATE `videos` SET `publishedAt` = `createdAt` WHERE `status` = 'PUBLISHED';

-- 4. Narrow to the final workflow values now that every row holds one of them.
ALTER TABLE `videos`
  MODIFY COLUMN `status` ENUM('PENDING', 'PUBLISHED', 'SCHEDULED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- 5. isActive is fully superseded by status now.
ALTER TABLE `videos` DROP COLUMN `isActive`;

CREATE INDEX `videos_status_idx` ON `videos`(`status`);
