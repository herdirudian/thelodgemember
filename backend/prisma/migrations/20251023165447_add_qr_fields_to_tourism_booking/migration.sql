-- AlterTable
ALTER TABLE `tourismticketbooking` ADD COLUMN `friendlyCode` VARCHAR(191) NULL,
    ADD COLUMN `qrPayloadHash` VARCHAR(191) NULL,
    ADD COLUMN `redeemedAt` DATETIME(3) NULL;
