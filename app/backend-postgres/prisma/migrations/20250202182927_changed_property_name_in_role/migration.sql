/*
  Warnings:

  - You are about to drop the column `branchId` on the `Role` table. All the data in the column will be lost.
  - Added the required column `departmentId` to the `Role` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_branchId_fkey";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "branchId",
ADD COLUMN     "departmentId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
