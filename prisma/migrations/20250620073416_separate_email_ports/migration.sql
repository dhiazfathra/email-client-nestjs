/*
  Warnings:

  - You are about to drop the column `emailPort` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailPort",
ADD COLUMN     "imapPort" INTEGER,
ADD COLUMN     "pop3Port" INTEGER,
ADD COLUMN     "smtpPort" INTEGER;
