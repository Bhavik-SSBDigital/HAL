-- AlterTable
ALTER TABLE "DocumentHighlight" ADD COLUMN     "contextFlag" TEXT,
ADD COLUMN     "processInstanceId" TEXT,
ADD COLUMN     "queryDoubtResponseId" TEXT,
ADD COLUMN     "recommendationDoubtId" TEXT,
ADD COLUMN     "recommendationDoubtResponseId" TEXT,
ADD COLUMN     "tempContextType" TEXT;

-- CreateTable
CREATE TABLE "RecommendationDoubt" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "raisedById" INTEGER NOT NULL,
    "doubtText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "RecommendationDoubt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationDoubtResponse" (
    "id" TEXT NOT NULL,
    "doubtId" TEXT NOT NULL,
    "respondedById" INTEGER NOT NULL,
    "responseText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationDoubtResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QueryDoubtResponseHighlights" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_QueryDoubtResponseHighlights_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_QueryDoubtResponseHighlights_B_index" ON "_QueryDoubtResponseHighlights"("B");

-- CreateIndex
CREATE INDEX "DocumentHighlight_queryDoubtResponseId_idx" ON "DocumentHighlight"("queryDoubtResponseId");

-- CreateIndex
CREATE INDEX "DocumentHighlight_recommendationDoubtId_idx" ON "DocumentHighlight"("recommendationDoubtId");

-- CreateIndex
CREATE INDEX "DocumentHighlight_recommendationDoubtResponseId_idx" ON "DocumentHighlight"("recommendationDoubtResponseId");

-- CreateIndex
CREATE INDEX "DocumentHighlight_processInstanceId_idx" ON "DocumentHighlight"("processInstanceId");

-- AddForeignKey
ALTER TABLE "RecommendationDoubt" ADD CONSTRAINT "RecommendationDoubt_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ProcessRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDoubt" ADD CONSTRAINT "RecommendationDoubt_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDoubtResponse" ADD CONSTRAINT "RecommendationDoubtResponse_doubtId_fkey" FOREIGN KEY ("doubtId") REFERENCES "RecommendationDoubt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDoubtResponse" ADD CONSTRAINT "RecommendationDoubtResponse_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_queryDoubtResponseId_fkey" FOREIGN KEY ("queryDoubtResponseId") REFERENCES "QueryDoubtResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_recommendationDoubtId_fkey" FOREIGN KEY ("recommendationDoubtId") REFERENCES "RecommendationDoubt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_recommendationDoubtResponseId_fkey" FOREIGN KEY ("recommendationDoubtResponseId") REFERENCES "RecommendationDoubtResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QueryDoubtResponseHighlights" ADD CONSTRAINT "_QueryDoubtResponseHighlights_A_fkey" FOREIGN KEY ("A") REFERENCES "DocumentHighlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QueryDoubtResponseHighlights" ADD CONSTRAINT "_QueryDoubtResponseHighlights_B_fkey" FOREIGN KEY ("B") REFERENCES "QueryDoubtResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
