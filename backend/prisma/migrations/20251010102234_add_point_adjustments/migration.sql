-- CreateTable
CREATE TABLE `PointAdjustment` (
    `id` CHAR(36) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `adminName` VARCHAR(191) NOT NULL,
    `type` ENUM('ADD', 'SUBTRACT') NOT NULL,
    `points` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `previousBalance` INTEGER NULL,
    `newBalance` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PointAdjustment` ADD CONSTRAINT `PointAdjustment_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `Member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
