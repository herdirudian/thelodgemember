-- AlterTable
ALTER TABLE `registrationcode` ADD COLUMN `quota` INTEGER NULL,
    ADD COLUMN `usedCount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `sliderimage` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
