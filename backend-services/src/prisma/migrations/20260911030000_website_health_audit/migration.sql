-- CreateTable
CREATE TABLE `website_audits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `triggeredBy` INTEGER NULL,
    `overallScore` DOUBLE NULL,
    `performanceScore` DOUBLE NULL,
    `accessibilityScore` DOUBLE NULL,
    `bestPracticesScore` DOUBLE NULL,
    `seoScore` DOUBLE NULL,
    `securityScore` DOUBLE NULL,
    `device` VARCHAR(191) NOT NULL DEFAULT 'mobile',
    `baseUrl` VARCHAR(191) NOT NULL,
    `auditEngineVersion` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `scoreVersion` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `website_audits_status_idx`(`status`),
    INDEX `website_audits_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_targets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `auditId` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `route` VARCHAR(191) NOT NULL,
    `pageType` VARCHAR(191) NOT NULL,
    `statusCode` INTEGER NULL,
    `durationMs` INTEGER NULL,
    `performanceScore` DOUBLE NULL,
    `accessibilityScore` DOUBLE NULL,
    `bestPracticesScore` DOUBLE NULL,
    `seoScore` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_targets_auditId_idx`(`auditId`),
    INDEX `audit_targets_url_idx`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_issues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `auditId` INTEGER NOT NULL,
    `targetId` INTEGER NULL,
    `category` ENUM('PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO', 'SECURITY') NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `severity` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO') NOT NULL,
    `status` ENUM('OPEN', 'RESOLVED', 'IGNORED') NOT NULL DEFAULT 'OPEN',
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `impact` VARCHAR(191) NULL,
    `recommendation` TEXT NOT NULL,
    `affectedUrl` VARCHAR(191) NULL,
    `selector` VARCHAR(191) NULL,
    `evidence` TEXT NULL,
    `documentationUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `audit_issues_auditId_idx`(`auditId`),
    INDEX `audit_issues_category_idx`(`category`),
    INDEX `audit_issues_severity_idx`(`severity`),
    INDEX `audit_issues_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_metrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `auditId` INTEGER NOT NULL,
    `targetId` INTEGER NULL,
    `category` ENUM('PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO', 'SECURITY') NOT NULL,
    `metricName` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `threshold` DOUBLE NULL,
    `rating` ENUM('GOOD', 'NEEDS_IMPROVEMENT', 'POOR') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_metrics_auditId_idx`(`auditId`),
    INDEX `audit_metrics_targetId_idx`(`targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `website_health_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `baseUrl` VARCHAR(191) NOT NULL,
    `weightPerformance` INTEGER NOT NULL DEFAULT 25,
    `weightAccessibility` INTEGER NOT NULL DEFAULT 15,
    `weightBestPractices` INTEGER NOT NULL DEFAULT 15,
    `weightSeo` INTEGER NOT NULL DEFAULT 20,
    `weightSecurity` INTEGER NOT NULL DEFAULT 25,
    `defaultScope` JSON NOT NULL,
    `timeoutSeconds` INTEGER NOT NULL DEFAULT 60,
    `retentionDays` INTEGER NOT NULL DEFAULT 90,
    `updatedBy` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `audit_targets` ADD CONSTRAINT `audit_targets_auditId_fkey` FOREIGN KEY (`auditId`) REFERENCES `website_audits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_issues` ADD CONSTRAINT `audit_issues_auditId_fkey` FOREIGN KEY (`auditId`) REFERENCES `website_audits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_issues` ADD CONSTRAINT `audit_issues_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `audit_targets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_metrics` ADD CONSTRAINT `audit_metrics_auditId_fkey` FOREIGN KEY (`auditId`) REFERENCES `website_audits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_metrics` ADD CONSTRAINT `audit_metrics_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `audit_targets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
