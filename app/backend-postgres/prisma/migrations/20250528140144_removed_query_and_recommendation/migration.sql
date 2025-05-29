/*
  Warnings:

  - The values [RECOMMENDATION] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.
  - The values [QUERY,QUERY_RESPONSE,RECOMMENDATION_REQUEST,RECOMMENDATION_COMPLETE,RECIRCULATION_REQUEST,RECIRCULATION_APPROVAL,QUERY_DOUBT,QUERY_DOUBT_RESPONSE,RECOMMENDATION_CLARIFICATION_REQUEST,RECOMMENDATION_CLARIFICATION_RESPONSE] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [RECOMMENDATION] on the enum `StepType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `queryId` on the `ProcessNotification` table. All the data in the column will be lost.
  - You are about to drop the column `recommendationId` on the `ProcessNotification` table. All the data in the column will be lost.
  - You are about to drop the `DocumentHighlight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessQuery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessQueryDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessQueryResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessQuerySummary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProcessRecommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QueryDocumentApproval` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QueryDocumentReference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QueryDocumentSummary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QueryDoubt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QueryDoubtResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QueryRecirculationApproval` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecommendationDocumentHighlight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecommendationDocumentSummary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecommendationDoubt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecommendationDoubtResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecommendationResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecommendationSummary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_QueryDoubtResponseHighlights` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActionType_new" AS ENUM ('APPROVAL', 'REVIEW', 'NOTIFICATION');
ALTER TABLE "WorkflowAssignment" ALTER COLUMN "actionType" TYPE "ActionType_new" USING ("actionType"::text::"ActionType_new");
ALTER TABLE "ProcessTracking" ALTER COLUMN "actionType" TYPE "ActionType_new" USING ("actionType"::text::"ActionType_new");
ALTER TYPE "ActionType" RENAME TO "ActionType_old";
ALTER TYPE "ActionType_new" RENAME TO "ActionType";
DROP TYPE "ActionType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('STEP_ASSIGNMENT', 'DOCUMENT_UPLOAD', 'DOCUMENT_APPROVAL', 'PROCESS_COMPLETION');
ALTER TABLE "ProcessNotification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "StepType_new" AS ENUM ('APPROVAL', 'REVIEW', 'NOTIFICATION');
ALTER TABLE "WorkflowStep" ALTER COLUMN "stepType" DROP DEFAULT;
ALTER TABLE "WorkflowStep" ALTER COLUMN "stepType" TYPE "StepType_new" USING ("stepType"::text::"StepType_new");
ALTER TYPE "StepType" RENAME TO "StepType_old";
ALTER TYPE "StepType_new" RENAME TO "StepType";
DROP TYPE "StepType_old";
ALTER TABLE "WorkflowStep" ALTER COLUMN "stepType" SET DEFAULT 'APPROVAL';
COMMIT;

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_createdById_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_queryDoubtId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_queryDoubtResponseId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_queryId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_queryResponseId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_recommendationDoubtId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_recommendationDoubtResponseId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_recommendationId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHighlight" DROP CONSTRAINT "DocumentHighlight_recommendationResponseId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessNotification" DROP CONSTRAINT "ProcessNotification_queryId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessNotification" DROP CONSTRAINT "ProcessNotification_recommendationId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQuery" DROP CONSTRAINT "ProcessQuery_processId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQuery" DROP CONSTRAINT "ProcessQuery_raisedById_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQuery" DROP CONSTRAINT "ProcessQuery_stepInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQueryDocument" DROP CONSTRAINT "ProcessQueryDocument_documentId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQueryDocument" DROP CONSTRAINT "ProcessQueryDocument_queryId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQueryDocument" DROP CONSTRAINT "ProcessQueryDocument_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQueryResponse" DROP CONSTRAINT "ProcessQueryResponse_queryId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQueryResponse" DROP CONSTRAINT "ProcessQueryResponse_respondedById_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQuerySummary" DROP CONSTRAINT "ProcessQuerySummary_queryId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessRecommendation" DROP CONSTRAINT "ProcessRecommendation_processId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessRecommendation" DROP CONSTRAINT "ProcessRecommendation_recommendedToId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessRecommendation" DROP CONSTRAINT "ProcessRecommendation_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "QueryDocumentApproval" DROP CONSTRAINT "QueryDocumentApproval_approverId_fkey";

-- DropForeignKey
ALTER TABLE "QueryDocumentApproval" DROP CONSTRAINT "QueryDocumentApproval_queryDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "QueryDocumentReference" DROP CONSTRAINT "QueryDocumentReference_documentId_fkey";

-- DropForeignKey
ALTER TABLE "QueryDocumentReference" DROP CONSTRAINT "QueryDocumentReference_responseId_fkey";

-- DropForeignKey
ALTER TABLE "QueryDocumentSummary" DROP CONSTRAINT "QueryDocumentSummary_documentId_fkey";

-- DropForeignKey
ALTER TABLE "QueryDocumentSummary" DROP CONSTRAINT "QueryDocumentSummary_queryId_fkey";

-- DropForeignKey
ALTER TABLE "QueryDoubt" DROP CONSTRAINT "QueryDoubt_queryId_fkey";

-- DropForeignKey
ALTER TABLE "QueryDoubt" DROP CONSTRAINT "QueryDoubt_raisedById_fkey";

-- DropForeignKey
ALTER TABLE "QueryDoubtResponse" DROP CONSTRAINT "QueryDoubtResponse_doubtId_fkey";

-- DropForeignKey
ALTER TABLE "QueryDoubtResponse" DROP CONSTRAINT "QueryDoubtResponse_respondedById_fkey";

-- DropForeignKey
ALTER TABLE "QueryRecirculationApproval" DROP CONSTRAINT "QueryRecirculationApproval_approverId_fkey";

-- DropForeignKey
ALTER TABLE "QueryRecirculationApproval" DROP CONSTRAINT "QueryRecirculationApproval_queryId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationDocumentHighlight" DROP CONSTRAINT "RecommendationDocumentHighlight_documentId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationDocumentHighlight" DROP CONSTRAINT "RecommendationDocumentHighlight_recommendationId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationDocumentSummary" DROP CONSTRAINT "RecommendationDocumentSummary_documentId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationDocumentSummary" DROP CONSTRAINT "RecommendationDocumentSummary_recommendationId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationDoubt" DROP CONSTRAINT "RecommendationDoubt_raisedById_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationDoubt" DROP CONSTRAINT "RecommendationDoubt_recommendationId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationDoubtResponse" DROP CONSTRAINT "RecommendationDoubtResponse_doubtId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationDoubtResponse" DROP CONSTRAINT "RecommendationDoubtResponse_respondedById_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationResponse" DROP CONSTRAINT "RecommendationResponse_recommendationId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationResponse" DROP CONSTRAINT "RecommendationResponse_respondedById_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationSummary" DROP CONSTRAINT "RecommendationSummary_recommendationId_fkey";

-- DropForeignKey
ALTER TABLE "_QueryDoubtResponseHighlights" DROP CONSTRAINT "_QueryDoubtResponseHighlights_A_fkey";

-- DropForeignKey
ALTER TABLE "_QueryDoubtResponseHighlights" DROP CONSTRAINT "_QueryDoubtResponseHighlights_B_fkey";

-- AlterTable
ALTER TABLE "ProcessNotification" DROP COLUMN "queryId",
DROP COLUMN "recommendationId";

-- DropTable
DROP TABLE "DocumentHighlight";

-- DropTable
DROP TABLE "ProcessQuery";

-- DropTable
DROP TABLE "ProcessQueryDocument";

-- DropTable
DROP TABLE "ProcessQueryResponse";

-- DropTable
DROP TABLE "ProcessQuerySummary";

-- DropTable
DROP TABLE "ProcessRecommendation";

-- DropTable
DROP TABLE "QueryDocumentApproval";

-- DropTable
DROP TABLE "QueryDocumentReference";

-- DropTable
DROP TABLE "QueryDocumentSummary";

-- DropTable
DROP TABLE "QueryDoubt";

-- DropTable
DROP TABLE "QueryDoubtResponse";

-- DropTable
DROP TABLE "QueryRecirculationApproval";

-- DropTable
DROP TABLE "RecommendationDocumentHighlight";

-- DropTable
DROP TABLE "RecommendationDocumentSummary";

-- DropTable
DROP TABLE "RecommendationDoubt";

-- DropTable
DROP TABLE "RecommendationDoubtResponse";

-- DropTable
DROP TABLE "RecommendationResponse";

-- DropTable
DROP TABLE "RecommendationSummary";

-- DropTable
DROP TABLE "_QueryDoubtResponseHighlights";

-- DropEnum
DROP TYPE "QueryStatus";

-- DropEnum
DROP TYPE "RecommendationStatus";
