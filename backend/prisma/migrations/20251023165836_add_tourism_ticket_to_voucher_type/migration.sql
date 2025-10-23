-- AlterTable
ALTER TABLE `redeemhistory` MODIFY `voucherType` ENUM('TICKET', 'POINTS', 'EVENT', 'TOURISM_TICKET') NOT NULL;
