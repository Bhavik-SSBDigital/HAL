-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "fullAccessUploadable" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "uploadable" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
