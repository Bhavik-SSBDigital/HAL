-- AlterTable
ALTER TABLE "DocumentSignature" ADD COLUMN     "processStepInstanceId" TEXT;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_processStepInstanceId_fkey" FOREIGN KEY ("processStepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
