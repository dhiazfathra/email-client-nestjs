-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_isDeleted_idx" ON "User"("isDeleted");

-- CreatePartialIndex
-- This creates a unique index on email that only applies to non-deleted users
CREATE UNIQUE INDEX "User_email_where_not_deleted" ON "User"("email") WHERE ("isDeleted" = false);
