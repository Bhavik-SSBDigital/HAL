import { verifyUser } from "../utility/verifyUser.js";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*

EXAMPLE ON HOW TO CHECK DOCUMENT ACCESS

// Check if user has edit access to document
const hasEditAccess = await checkDocumentAccess(user.id, documentId, "EDIT");

// Get all access types for document
const accessRecords = await prisma.documentAccess.findMany({
  where: {
    documentId,
    OR: [
      { userId: user.id },
      { roleId: { in: userRoles } },
      { departmentId: { in: userDepartments } },
    ],
    stepInstance: { status: "PENDING" },
  },
  select: { accessType: true },
});

*/
async function checkDocumentAccess(userId, documentId, requiredAccess) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });

  const userDepartments = await prisma.department.findMany({
    where: { users: { some: { id: userId } } },
    select: { id: true },
  });

  return prisma.documentAccess.findFirst({
    where: {
      documentId,
      accessType: requiredAccess,
      stepInstance: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        process: { status: "IN_PROGRESS" },
      },
      OR: [
        { userId },
        { roleId: { in: userRoles.map((r) => r.roleId) } },
        { departmentId: { in: userDepartments.map((d) => d.id) } },
      ],
    },
  });
}

async function initiateProcess(workflowId, initiatorId, documentIds, name) {
  return prisma.$transaction(async (tx) => {
    // 1. Create ProcessInstance
    const processInstance = await tx.processInstance.create({
      data: {
        workflowId,
        initiatorId,
        name,
        status: "PENDING",
      },
    });

    // 2. Link Documents to Process
    await Promise.all(
      documentIds.map((documentId) =>
        tx.processDocument.create({
          data: {
            processId: processInstance.id,
            documentId,
          },
        })
      )
    );

    // 3. Get First Workflow Step
    const firstStep = await tx.workflowStep.findFirstOrThrow({
      where: { workflowId, stepNumber: 1 },
      include: { assignments: true },
    });
    // 3. Get Next(Second) Workflow Step
    const secondStep = await tx.workflowStep.findFirstOrThrow({
      where: { workflowId, stepNumber: 2 },
      include: { assignments: true },
    });

    const firstStepInstance = await tx.processStepInstance.create({
      data: {
        processId: processInstance.id,
        stepId: firstStep.id,
        status: "COMPLETED",
      },
    });

    // 4. Create Step Instance
    const stepInstance = await tx.processStepInstance.create({
      data: {
        processId: processInstance.id,
        stepId: secondStep.id,
        status: "PENDING",
      },
    });

    // 5. Configure Document Access
    for (const assignment of secondStep.assignments) {
      for (const assigneeId of assignment.assigneeIds) {
        for (const accessType of assignment.accessTypes) {
          for (const documentId of documentIds) {
            const accessData = {
              stepInstanceId: stepInstance.id,
              assignmentId: assignment.id,
              documentId,
              accessType,
              processId: processInstance.id,
            };

            switch (assignment.assigneeType) {
              case "USER":
                accessData.userId = assigneeId;
                await tx.documentAccess.create({ data: accessData });
                break;
              case "ROLE":
                accessData.roleId = assigneeId;
                await tx.documentAccess.create({ data: accessData });
                break;
              case "DEPARTMENT":
                // DEPARTMENT case now uses selectedRoles instead of assigneeIds
                for (const roleId of assignment.selectedRoles) {
                  await tx.documentAccess.create({
                    data: {
                      ...accessData,
                      roleId: roleId, // Override with roleId
                    },
                  });
                }
                break;
            }
          }
        }
      }
    }

    // 6. Get Assignees for Notifications (existing logic)
    const allAssignees = await Promise.all(
      secondStep.assignments.map(async (assignment) => {
        switch (assignment.assigneeType) {
          case "USER":
            return assignment.assigneeIds;
          case "ROLE":
            const usersWithRole = await tx.userRole.findMany({
              where: { roleId: { in: assignment.assigneeIds } },
              select: { userId: true },
            });
            return usersWithRole.map((uwr) => uwr.userId);
          case "DEPARTMENT":
            // Modified department case with role filtering
            const usersWithRoles = await tx.userRole.findMany({
              where: {
                AND: [
                  { departmentId: { in: assignment.assigneeIds } },
                  { roleId: { in: assignment.selectedRoles } },
                ],
              },
              select: { userId: true },
            });
            return [...new Set(usersWithRoles.map((uwr) => uwr.userId))];
          default:
            return [];
        }
      })
    );

    const uniqueAssignees = [...new Set(allAssignees.flat())];

    // 7. Create Notifications (existing logic)
    await Promise.all(
      uniqueAssignees.map((userId) =>
        tx.processNotification.create({
          data: {
            stepId: stepInstance.id,
            userId,
          },
        })
      )
    );

    // 8. Set Up Escalations (existing logic)
    // if (secondStep.escalationTime) {
    //   await tx.escalation.create({
    //     data: {
    //       stepInstanceId: stepInstance.id,
    //       escalationType: "REMINDER",
    //       triggerTime: new Date(
    //         Date.now() + secondStep.escalationTime * 60 * 60 * 1000
    //       ),
    //     },
    //   });
    // }

    // if (secondStep.autoApprovalAfter) {
    //   await tx.escalation.create({
    //     data: {
    //       stepInstanceId: stepInstance.id,
    //       escalationType: "AUTO_APPROVAL",
    //       triggerTime: new Date(
    //         Date.now() + secondStep.autoApprovalAfter * 60 * 60 * 1000
    //       ),
    //     },
    //   });
    // }

    // // 9. Track Process Initiation (existing logic)
    // await tx.processTracking.create({
    //   data: {
    //     processId: processInstance.id,
    //     userId: initiatorId,
    //     actionType: "APPROVAL",
    //   },
    // });

    // 10. Send Notifications (existing logic)
    // const usersToNotify = await tx.user.findMany({
    //   where: { id: { in: uniqueAssignees } },
    // });

    // usersToNotify.forEach((user) => {
    //   sendEmailNotification({
    //     email: user.email,
    //     subject: "New Process Assignment",
    //     content: `You've been assigned to step ${secondStep.stepName} in process ${processInstance.id}`,
    //   });
    // });

    return processInstance;
  });
}

export const initiate_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { processName, description, workflowId, documents } = req.body;

    const initiator = userData.id;

    await initiateProcess(
      workflowId,
      userData.id,
      documents.map((item) => item.documentId),
      processName
    );

    return res.status(200).json({
      message: "Process initiated successfully",
    });
  } catch (error) {
    console.log("Error initiating the process", error);
    return res.status(500).json({
      message: "Error initiating the process",
    });
  }
};
