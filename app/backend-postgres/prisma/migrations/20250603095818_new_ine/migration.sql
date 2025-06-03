/*
  Warnings:

  - You are about to drop the column `profileFileName` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "profileFileName",
ADD COLUMN     "profilePicFileName" TEXT;
