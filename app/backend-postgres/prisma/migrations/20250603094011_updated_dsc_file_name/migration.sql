/*
  Warnings:

  - You are about to drop the column `dscFilePickName` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "dscFilePickName",
ADD COLUMN     "dscFileName" TEXT;
