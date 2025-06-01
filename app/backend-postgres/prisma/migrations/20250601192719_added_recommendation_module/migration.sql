-- AlterEnum
ALTER TYPE "StepStatus" ADD VALUE 'FOR_RECOMMENDATION';

-- AlterTable
ALTER TABLE "DocumentSignature" ADD COLUMN     "byRecommender" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAttachedWithRecommendation" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "initiatorId" INTEGER NOT NULL,
    "recommenderId" INTEGER NOT NULL,
    "recommendationText" TEXT NOT NULL,
    "documentSummaries" JSONB,
    "responseText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "details" JSONB,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_recommenderId_fkey" FOREIGN KEY ("recommenderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
