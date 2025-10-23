/*
  Warnings:

  - A unique constraint covering the columns `[membershipNumber]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `member` ADD COLUMN `membershipNumber` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Member_membershipNumber_key` ON `Member`(`membershipNumber`);
