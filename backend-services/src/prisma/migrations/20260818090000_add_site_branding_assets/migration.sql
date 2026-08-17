-- Site branding assets (logo, favicon) — nullable Cloudinary URLs set via
-- the admin Settings page. Null falls back to the built-in text logo /
-- default favicon.ico, so no backfill is needed for existing rows.
ALTER TABLE `system_settings`
  ADD COLUMN `logoUrl` VARCHAR(191) NULL,
  ADD COLUMN `faviconUrl` VARCHAR(191) NULL;
