/*
  Warnings:

  - You are about to drop several permission columns. These are being moved to DocumentAccess model.
  - Changing accessType from scalar to array requires data migration
*/

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('STANDARD', 'FULL');

-- CreateEnum
CREATE TYPE "DocAccessThrough" AS ENUM ('PROCESS', 'ADMINISTRATION', 'SELF');

-- Step 1: Add new columns first
ALTER TABLE "DocumentAccess" ADD COLUMN     "accessLevel" "AccessLevel" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "DocumentAccess" ADD COLUMN     "docAccessThrough" "DocAccessThrough" NOT NULL DEFAULT 'SELF';
ALTER TABLE "DocumentAccess" ADD COLUMN     "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DocumentAccess" ADD COLUMN     "grantedById" INTEGER;

-- Step 2: Handle accessType conversion safely
-- Create temporary column
ALTER TABLE "DocumentAccess" ADD COLUMN "accessType_new" "AccessType"[] DEFAULT ARRAY[]::"AccessType"[];

-- Migrate existing data (convert single values to arrays)
UPDATE "DocumentAccess" SET "accessType_new" = ARRAY["accessType"]::"AccessType"[] WHERE "accessType" IS NOT NULL;

-- Drop old column
ALTER TABLE "DocumentAccess" DROP COLUMN "accessType";

-- Rename new column
ALTER TABLE "DocumentAccess" RENAME COLUMN "accessType_new" TO "accessType";

-- Step 3: Remove old permission columns (after confirming data is migrated)
ALTER TABLE "Role" DROP COLUMN "downloadable";
ALTER TABLE "Role" DROP COLUMN "fullAccessDownloadable";
ALTER TABLE "Role" DROP COLUMN "fullAccessReadable";
ALTER TABLE "Role" DROP COLUMN "fullAccessUploadable";
ALTER TABLE "Role" DROP COLUMN "fullAccessWritable";
ALTER TABLE "Role" DROP COLUMN "readable";
ALTER TABLE "Role" DROP COLUMN "uploadable";
ALTER TABLE "Role" DROP COLUMN "writable";

ALTER TABLE "User" DROP COLUMN "downloadable";
ALTER TABLE "User" DROP COLUMN "readable";
ALTER TABLE "User" DROP COLUMN "uploadable";
ALTER TABLE "User" DROP COLUMN "writable";

-- Add foreign keys
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;