/*
  Warnings:

  - You are about to drop the `DocHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Highlight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Process` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('APPROVAL', 'REVIEW', 'RECOMMENDATION', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('USER', 'ROLE', 'DEPARTMENT', 'UNIT');

-- CreateEnum
CREATE TYPE "AssigneeType" AS ENUM ('USER', 'ROLE', 'DEPARTMENT', 'UNIT');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('APPROVAL', 'REVIEW', 'RECOMMENDATION', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('REMINDER', 'ESCALATION', 'AUTO_APPROVAL');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('PENDING', 'TRIGGERED', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "DocHistory" DROP CONSTRAINT "DocHistory_changedById_fkey";

-- DropForeignKey
ALTER TABLE "DocHistory" DROP CONSTRAINT "DocHistory_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Highlight" DROP CONSTRAINT "Highlight_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Log" DROP CONSTRAINT "Log_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_processId_fkey";

-- DropTable
DROP TABLE "DocHistory";

-- DropTable
DROP TABLE "Highlight";

-- DropTable
DROP TABLE "Log";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Process";

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL,
    "previousWorkflowId" TEXT,
    "createdById" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "allowParallel" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAssignment" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "assigneeIds" INTEGER[],
    "assigneeType" "AssigneeType" NOT NULL,

    CONSTRAINT "WorkflowAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessInstance" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "initiatorId" INTEGER NOT NULL,
    "currentStepId" TEXT,
    "status" "ProcessStatus" NOT NULL DEFAULT 'PENDING',
    "escalationTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStepInstance" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "assignedTo" INTEGER NOT NULL,
    "assignedType" "AssigneeType" NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessStepInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "escalationType" "EscalationType" NOT NULL,
    "triggerTime" TIMESTAMP(3) NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessTracking" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessDocument" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "documentId" INTEGER NOT NULL,

    CONSTRAINT "ProcessDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessQA" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "initiatorId" INTEGER NOT NULL,
    "entityId" INTEGER NOT NULL,
    "entityType" "AssigneeType" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "ProcessQA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_workflowId_stepNumber_key" ON "WorkflowStep"("workflowId", "stepNumber");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_previousWorkflowId_fkey" FOREIGN KEY ("previousWorkflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAssignment" ADD CONSTRAINT "WorkflowAssignment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessInstance" ADD CONSTRAINT "ProcessInstance_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessInstance" ADD CONSTRAINT "ProcessInstance_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessInstance" ADD CONSTRAINT "ProcessInstance_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessTracking" ADD CONSTRAINT "ProcessTracking_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQA" ADD CONSTRAINT "ProcessQA_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQA" ADD CONSTRAINT "ProcessQA_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQA" ADD CONSTRAINT "ProcessQA_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
