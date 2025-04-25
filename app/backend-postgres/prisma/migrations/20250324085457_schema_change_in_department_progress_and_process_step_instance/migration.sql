-- AlterTable
ALTER TABLE "AssignmentProgress" ADD COLUMN     "completedRoles" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "ProcessStepInstance" ADD COLUMN     "decisionAt" TIMESTAMP(3),
ADD COLUMN     "decisionComment" TEXT;
