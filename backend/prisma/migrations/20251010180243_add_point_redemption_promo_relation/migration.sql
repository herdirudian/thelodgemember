-- AlterTable
ALTER TABLE `pointredemption` ADD COLUMN `promoId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `PointRedemption` ADD CONSTRAINT `PointRedemption_promoId_fkey` FOREIGN KEY (`promoId`) REFERENCES `Promo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
