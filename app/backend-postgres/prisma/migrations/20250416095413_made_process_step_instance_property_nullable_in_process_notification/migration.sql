-- DropForeignKey
ALTER TABLE "ProcessNotification" DROP CONSTRAINT "ProcessNotification_stepId_fkey";

-- AlterTable
ALTER TABLE "ProcessNotification" ALTER COLUMN "stepId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ProcessNotification" ADD CONSTRAINT "ProcessNotification_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProcessStepInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
