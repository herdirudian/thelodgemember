-- CreateTable
CREATE TABLE `AdminActivity` (
    `id` CHAR(36) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `adminName` VARCHAR(191) NULL,
    `adminRole` ENUM('CASHIER', 'MODERATOR', 'OWNER', 'SUPER_ADMIN') NULL,
    `method` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `status` INTEGER NOT NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `requestBody` VARCHAR(191) NULL,
    `query` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
