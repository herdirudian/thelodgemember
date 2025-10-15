-- AlterTable
ALTER TABLE `eventregistration` ADD COLUMN `friendlyCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pointredemption` ADD COLUMN `friendlyCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sliderimage` ADD COLUMN `position` INTEGER NULL;

-- AlterTable
ALTER TABLE `ticket` ADD COLUMN `friendlyCode` VARCHAR(191) NULL;
