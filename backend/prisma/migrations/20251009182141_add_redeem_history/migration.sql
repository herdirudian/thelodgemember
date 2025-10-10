-- CreateTable
CREATE TABLE `RedeemHistory` (
    `id` CHAR(36) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `memberName` VARCHAR(191) NOT NULL,
    `voucherType` ENUM('TICKET', 'POINTS', 'EVENT') NOT NULL,
    `voucherId` VARCHAR(191) NOT NULL,
    `voucherLabel` VARCHAR(191) NULL,
    `redeemedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NOT NULL,
    `adminName` VARCHAR(191) NOT NULL,
    `proofUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
