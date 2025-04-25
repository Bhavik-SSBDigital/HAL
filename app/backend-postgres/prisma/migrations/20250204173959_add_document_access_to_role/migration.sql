/*
  Warnings:

  - You are about to drop the column `uploadable` on the `Role` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_departmentId_fkey";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "uploadable",
ADD COLUMN     "fullAccessDownloadable" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "fullAccessReadable" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "fullAccessWritable" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "isRootLevel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentRoleId" INTEGER,
ALTER COLUMN "departmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
