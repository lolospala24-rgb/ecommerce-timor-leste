-- `description`/`descriptionTetum` were VARCHAR(191) (Prisma's default for
-- a plain String field), which rejects any real-world product description
-- longer than 191 characters with Prisma error P2000 ("Value too long for
-- column"). Widen both to TEXT.
ALTER TABLE `products` MODIFY COLUMN `description` TEXT NOT NULL;
ALTER TABLE `products` MODIFY COLUMN `descriptionTetum` TEXT NULL;
