-- AlterTable
ALTER TABLE `event` ADD COLUMN `location` VARCHAR(191) NULL,
    ADD COLUMN `terms` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Settings` (
    `id` CHAR(36) NOT NULL,
    `appName` VARCHAR(191) NOT NULL DEFAULT 'The Lodge Family',
    `defaultLocale` VARCHAR(191) NOT NULL DEFAULT 'id-ID',
    `timeZone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Jakarta',
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#0F4D39',
    `darkMode` BOOLEAN NOT NULL DEFAULT true,
    `logoUrl` VARCHAR(191) NULL,
    `require2FA` BOOLEAN NOT NULL DEFAULT false,
    `sessionTimeout` INTEGER NOT NULL DEFAULT 60,
    `allowDirectLogin` BOOLEAN NOT NULL DEFAULT true,
    `fromName` VARCHAR(191) NULL,
    `fromEmail` VARCHAR(191) NULL,
    `emailProvider` VARCHAR(191) NOT NULL DEFAULT 'smtp',
    `cloudinaryEnabled` BOOLEAN NOT NULL DEFAULT false,
    `cloudinaryFolder` VARCHAR(191) NULL,
    `webhookUrl` VARCHAR(191) NULL,
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `announcement` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
