-- AlterTable
ALTER TABLE `promo` ADD COLUMN `eventId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Promo` ADD CONSTRAINT `Promo_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
