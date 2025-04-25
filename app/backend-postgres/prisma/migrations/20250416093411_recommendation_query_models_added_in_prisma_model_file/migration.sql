/*
  Warnings:

  - Added the required column `type` to the `ProcessNotification` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STEP_ASSIGNMENT', 'QUERY', 'QUERY_RESPONSE', 'DOCUMENT_UPLOAD', 'DOCUMENT_APPROVAL', 'PROCESS_COMPLETION', 'RECOMMENDATION_REQUEST', 'RECOMMENDATION_COMPLETE', 'RECIRCULATION_REQUEST', 'RECIRCULATION_APPROVAL', 'QUERY_DOUBT', 'QUERY_DOUBT_RESPONSE', 'RECOMMENDATION_CLARIFICATION_REQUEST', 'RECOMMENDATION_CLARIFICATION_RESPONSE');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED', 'CLARIFICATION_REQUESTED');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED', 'RECIRCULATION_PENDING');

-- AlterTable
ALTER TABLE "ProcessNotification" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "queryId" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "recommendationId" TEXT,
ADD COLUMN     "type" "NotificationType" NOT NULL;

-- AlterTable
ALTER TABLE "ProcessStepInstance" ADD COLUMN     "isRecirculated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalStepInstanceId" TEXT,
ADD COLUMN     "recirculationReason" TEXT;

-- CreateTable
CREATE TABLE "ProcessRecommendation" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "recommendedToId" INTEGER NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationDocumentHighlight" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "documentId" INTEGER NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "coordinates" JSONB NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationDocumentHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationResponse" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "respondedById" INTEGER NOT NULL,
    "responseText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessQuery" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "stepInstanceId" TEXT,
    "raisedById" INTEGER NOT NULL,
    "queryText" TEXT NOT NULL,
    "status" "QueryStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "recirculationFromStepId" TEXT,

    CONSTRAINT "ProcessQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessQueryResponse" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "respondedById" INTEGER NOT NULL,
    "responseText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessQueryResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessQueryDocument" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "documentId" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "replacesDocumentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessQueryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryDocumentApproval" (
    "id" TEXT NOT NULL,
    "queryDocumentId" TEXT NOT NULL,
    "approverId" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "QueryDocumentApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryDocumentReference" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "documentId" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "coordinates" JSONB,
    "comments" TEXT,

    CONSTRAINT "QueryDocumentReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryRecirculationApproval" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "approverId" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "QueryRecirculationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentHighlight" (
    "id" TEXT NOT NULL,
    "documentId" INTEGER NOT NULL,
    "coordinates" JSONB NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    "queryId" TEXT,
    "queryResponseId" TEXT,
    "queryDoubtId" TEXT,
    "recommendationId" TEXT,
    "recommendationResponseId" TEXT,

    CONSTRAINT "DocumentHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryDoubt" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "raisedById" INTEGER NOT NULL,
    "doubtText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "QueryDoubt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryDoubtResponse" (
    "id" TEXT NOT NULL,
    "doubtId" TEXT NOT NULL,
    "respondedById" INTEGER NOT NULL,
    "responseText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryDoubtResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryDocumentSummary" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "documentId" INTEGER NOT NULL,
    "summaryText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryDocumentSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessQuerySummary" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessQuerySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationDocumentSummary" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "documentId" INTEGER NOT NULL,
    "summaryText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationDocumentSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationSummary" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentHighlight_documentId_idx" ON "DocumentHighlight"("documentId");

-- CreateIndex
CREATE INDEX "DocumentHighlight_queryId_idx" ON "DocumentHighlight"("queryId");

-- CreateIndex
CREATE INDEX "DocumentHighlight_queryResponseId_idx" ON "DocumentHighlight"("queryResponseId");

-- CreateIndex
CREATE INDEX "DocumentHighlight_queryDoubtId_idx" ON "DocumentHighlight"("queryDoubtId");

-- CreateIndex
CREATE INDEX "DocumentHighlight_recommendationId_idx" ON "DocumentHighlight"("recommendationId");

-- CreateIndex
CREATE INDEX "DocumentHighlight_recommendationResponseId_idx" ON "DocumentHighlight"("recommendationResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessQuerySummary_queryId_key" ON "ProcessQuerySummary"("queryId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationSummary_recommendationId_key" ON "RecommendationSummary"("recommendationId");

-- AddForeignKey
ALTER TABLE "ProcessNotification" ADD CONSTRAINT "ProcessNotification_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ProcessRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessNotification" ADD CONSTRAINT "ProcessNotification_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProcessQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRecommendation" ADD CONSTRAINT "ProcessRecommendation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRecommendation" ADD CONSTRAINT "ProcessRecommendation_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRecommendation" ADD CONSTRAINT "ProcessRecommendation_recommendedToId_fkey" FOREIGN KEY ("recommendedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDocumentHighlight" ADD CONSTRAINT "RecommendationDocumentHighlight_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ProcessRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDocumentHighlight" ADD CONSTRAINT "RecommendationDocumentHighlight_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationResponse" ADD CONSTRAINT "RecommendationResponse_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ProcessRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationResponse" ADD CONSTRAINT "RecommendationResponse_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQuery" ADD CONSTRAINT "ProcessQuery_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQuery" ADD CONSTRAINT "ProcessQuery_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQuery" ADD CONSTRAINT "ProcessQuery_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQueryResponse" ADD CONSTRAINT "ProcessQueryResponse_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProcessQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQueryResponse" ADD CONSTRAINT "ProcessQueryResponse_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQueryDocument" ADD CONSTRAINT "ProcessQueryDocument_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProcessQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQueryDocument" ADD CONSTRAINT "ProcessQueryDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQueryDocument" ADD CONSTRAINT "ProcessQueryDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDocumentApproval" ADD CONSTRAINT "QueryDocumentApproval_queryDocumentId_fkey" FOREIGN KEY ("queryDocumentId") REFERENCES "ProcessQueryDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDocumentApproval" ADD CONSTRAINT "QueryDocumentApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDocumentReference" ADD CONSTRAINT "QueryDocumentReference_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "ProcessQueryResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDocumentReference" ADD CONSTRAINT "QueryDocumentReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryRecirculationApproval" ADD CONSTRAINT "QueryRecirculationApproval_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProcessQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryRecirculationApproval" ADD CONSTRAINT "QueryRecirculationApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProcessQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_queryResponseId_fkey" FOREIGN KEY ("queryResponseId") REFERENCES "ProcessQueryResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_queryDoubtId_fkey" FOREIGN KEY ("queryDoubtId") REFERENCES "QueryDoubt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ProcessRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHighlight" ADD CONSTRAINT "DocumentHighlight_recommendationResponseId_fkey" FOREIGN KEY ("recommendationResponseId") REFERENCES "RecommendationResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDoubt" ADD CONSTRAINT "QueryDoubt_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProcessQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDoubt" ADD CONSTRAINT "QueryDoubt_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDoubtResponse" ADD CONSTRAINT "QueryDoubtResponse_doubtId_fkey" FOREIGN KEY ("doubtId") REFERENCES "QueryDoubt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDoubtResponse" ADD CONSTRAINT "QueryDoubtResponse_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDocumentSummary" ADD CONSTRAINT "QueryDocumentSummary_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProcessQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryDocumentSummary" ADD CONSTRAINT "QueryDocumentSummary_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQuerySummary" ADD CONSTRAINT "ProcessQuerySummary_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ProcessQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDocumentSummary" ADD CONSTRAINT "RecommendationDocumentSummary_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ProcessRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDocumentSummary" ADD CONSTRAINT "RecommendationDocumentSummary_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationSummary" ADD CONSTRAINT "RecommendationSummary_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ProcessRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
