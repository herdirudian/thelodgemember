-- CreateTable
CREATE TABLE `SliderImage` (
    `id` CHAR(36) NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
