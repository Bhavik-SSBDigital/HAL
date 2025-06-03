/*
  Warnings:

  - You are about to drop the column `profilePicFileName` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "profilePicFileName",
ADD COLUMN     "profileFileName" TEXT;
