/*
  Warnings:

  - A unique constraint covering the columns `[messageId,userId]` on the table `Email` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "microsoftId" TEXT,
ADD COLUMN     "microsoftTokens" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Email_messageId_userId_key" ON "Email"("messageId", "userId");
