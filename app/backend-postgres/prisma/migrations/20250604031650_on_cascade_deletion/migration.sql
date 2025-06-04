-- DropForeignKey
ALTER TABLE "AssignmentProgress" DROP CONSTRAINT "AssignmentProgress_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "AssignmentProgress" DROP CONSTRAINT "AssignmentProgress_processId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_adminId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_headId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_parentDepartmentId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentRoleAssignment" DROP CONSTRAINT "DepartmentRoleAssignment_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentRoleAssignment" DROP CONSTRAINT "DepartmentRoleAssignment_roleId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentRoleAssignment" DROP CONSTRAINT "DepartmentRoleAssignment_workflowAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentStepProgress" DROP CONSTRAINT "DepartmentStepProgress_assignmentProgressId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentStepProgress" DROP CONSTRAINT "DepartmentStepProgress_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentStepProgress" DROP CONSTRAINT "DepartmentStepProgress_processId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentStepProgress" DROP CONSTRAINT "DepartmentStepProgress_stepId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_parentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_grantedById_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_processId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_roleId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_stepInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAccess" DROP CONSTRAINT "DocumentAccess_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHistory" DROP CONSTRAINT "DocumentHistory_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHistory" DROP CONSTRAINT "DocumentHistory_processDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHistory" DROP CONSTRAINT "DocumentHistory_processId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHistory" DROP CONSTRAINT "DocumentHistory_replacedDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHistory" DROP CONSTRAINT "DocumentHistory_stepInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHistory" DROP CONSTRAINT "DocumentHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentRejection" DROP CONSTRAINT "DocumentRejection_processDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentRejection" DROP CONSTRAINT "DocumentRejection_processStepInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentRejection" DROP CONSTRAINT "DocumentRejection_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentSignature" DROP CONSTRAINT "DocumentSignature_processDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentSignature" DROP CONSTRAINT "DocumentSignature_processStepInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentSignature" DROP CONSTRAINT "DocumentSignature_userId_fkey";

-- DropForeignKey
ALTER TABLE "Escalation" DROP CONSTRAINT "Escalation_stepInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessClaim" DROP CONSTRAINT "ProcessClaim_userId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessDocument" DROP CONSTRAINT "ProcessDocument_documentId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessDocument" DROP CONSTRAINT "ProcessDocument_processId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessDocument" DROP CONSTRAINT "ProcessDocument_rejectedById_fkey";

-- DropForeignKey
ALTER TABLE "ProcessDocument" DROP CONSTRAINT "ProcessDocument_replacedDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessInstance" DROP CONSTRAINT "ProcessInstance_currentStepId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessInstance" DROP CONSTRAINT "ProcessInstance_initiatorId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessInstance" DROP CONSTRAINT "ProcessInstance_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessNotification" DROP CONSTRAINT "ProcessNotification_stepId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessNotification" DROP CONSTRAINT "ProcessNotification_userId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQA" DROP CONSTRAINT "ProcessQA_initiatorId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQA" DROP CONSTRAINT "ProcessQA_processId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessQA" DROP CONSTRAINT "ProcessQA_stepInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessStepInstance" DROP CONSTRAINT "ProcessStepInstance_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessStepInstance" DROP CONSTRAINT "ProcessStepInstance_pickedById_fkey";

-- DropForeignKey
ALTER TABLE "ProcessStepInstance" DROP CONSTRAINT "ProcessStepInstance_processId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessStepInstance" DROP CONSTRAINT "ProcessStepInstance_progressId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessStepInstance" DROP CONSTRAINT "ProcessStepInstance_stepId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessTracking" DROP CONSTRAINT "ProcessTracking_processId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_initiatorId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_processId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_recommenderId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_stepInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_parentRoleId_fkey";

-- DropForeignKey
ALTER TABLE "SignCoordinate" DROP CONSTRAINT "SignCoordinate_processDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "SignCoordinate" DROP CONSTRAINT "SignCoordinate_signedById_fkey";

-- DropForeignKey
ALTER TABLE "SignCoordinate" DROP CONSTRAINT "SignCoordinate_stepId_fkey";

-- DropForeignKey
ALTER TABLE "SystemLog" DROP CONSTRAINT "SystemLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT "Token_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_createdById_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_userId_fkey";

-- DropForeignKey
ALTER TABLE "Workflow" DROP CONSTRAINT "Workflow_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Workflow" DROP CONSTRAINT "Workflow_previousVersionId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowAssignment" DROP CONSTRAINT "WorkflowAssignment_stepId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowStep" DROP CONSTRAINT "WorkflowStep_workflowId_fkey";

-- AlterTable
ALTER TABLE "ProcessStepInstance" ADD COLUMN     "recirculationCycle" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Workflow" ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_headId_fkey" FOREIGN KEY ("headId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAssignment" ADD CONSTRAINT "WorkflowAssignment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentRoleAssignment" ADD CONSTRAINT "DepartmentRoleAssignment_workflowAssignmentId_fkey" FOREIGN KEY ("workflowAssignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentRoleAssignment" ADD CONSTRAINT "DepartmentRoleAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentRoleAssignment" ADD CONSTRAINT "DepartmentRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessNotification" ADD CONSTRAINT "ProcessNotification_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProcessStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessNotification" ADD CONSTRAINT "ProcessNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessClaim" ADD CONSTRAINT "ProcessClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessInstance" ADD CONSTRAINT "ProcessInstance_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessInstance" ADD CONSTRAINT "ProcessInstance_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessInstance" ADD CONSTRAINT "ProcessInstance_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentProgress" ADD CONSTRAINT "AssignmentProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentProgress" ADD CONSTRAINT "AssignmentProgress_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkflowAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "AssignmentProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_pickedById_fkey" FOREIGN KEY ("pickedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepInstance" ADD CONSTRAINT "ProcessStepInstance_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessTracking" ADD CONSTRAINT "ProcessTracking_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_replacedDocumentId_fkey" FOREIGN KEY ("replacedDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_processStepInstanceId_fkey" FOREIGN KEY ("processStepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQA" ADD CONSTRAINT "ProcessQA_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQA" ADD CONSTRAINT "ProcessQA_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessQA" ADD CONSTRAINT "ProcessQA_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentStepProgress" ADD CONSTRAINT "DepartmentStepProgress_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentStepProgress" ADD CONSTRAINT "DepartmentStepProgress_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentStepProgress" ADD CONSTRAINT "DepartmentStepProgress_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentStepProgress" ADD CONSTRAINT "DepartmentStepProgress_assignmentProgressId_fkey" FOREIGN KEY ("assignmentProgressId") REFERENCES "AssignmentProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignCoordinate" ADD CONSTRAINT "SignCoordinate_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignCoordinate" ADD CONSTRAINT "SignCoordinate_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignCoordinate" ADD CONSTRAINT "SignCoordinate_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_replacedDocumentId_fkey" FOREIGN KEY ("replacedDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_recommenderId_fkey" FOREIGN KEY ("recommenderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRejection" ADD CONSTRAINT "DocumentRejection_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRejection" ADD CONSTRAINT "DocumentRejection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRejection" ADD CONSTRAINT "DocumentRejection_processStepInstanceId_fkey" FOREIGN KEY ("processStepInstanceId") REFERENCES "ProcessStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
