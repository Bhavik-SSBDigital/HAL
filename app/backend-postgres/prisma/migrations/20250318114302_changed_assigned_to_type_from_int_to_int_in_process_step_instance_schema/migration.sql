/*
  Warnings:

  - Changed the type of `assignedTo` on the `ProcessStepInstance` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ProcessStepInstance" DROP COLUMN "assignedTo",
ADD COLUMN     "assignedTo" INTEGER NOT NULL;
