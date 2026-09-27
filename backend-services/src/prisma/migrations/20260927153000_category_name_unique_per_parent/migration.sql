-- DropIndex
ALTER TABLE `categories` DROP INDEX `categories_name_key`;

-- CreateIndex
CREATE UNIQUE INDEX `categories_parentId_name_key` ON `categories`(`parentId`, `name`);
