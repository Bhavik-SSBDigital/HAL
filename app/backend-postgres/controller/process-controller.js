import { verifyUser } from "../utility/verifyUser.js";

import { PrismaClient, AccessType, NotificationType } from "@prisma/client";

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

export const initiate_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { processName, description, workflowId } = req.body;
    const documentIds = req.body.documents.map((item) => item.documentId) || [];

    if (documentIds.length === 0) {
      return res.status(400).json({
        message: "Documents are required to initiate a process",
      });
    }

    const initiatorId = userData.id;

    const process = await prisma.$transaction(async (tx) => {
      // 1. Create Process Instance
      const process = await tx.processInstance.create({
        data: {
          workflowId,
          initiatorId,
          name: processName,
          status: "PENDING",
          currentStepId: null,
        },
      });

      // 2. Link documents
      await tx.processDocument.createMany({
        data: documentIds.map((docId) => ({
          processId: process.id,
          documentId: docId,
        })),
      });

      // 3. Get Workflow Steps
      const workflow = await tx.workflow.findUnique({
        where: { id: workflowId },
        include: { steps: { include: { assignments: true } } },
      });

      // 4. Process First Step
      const step = workflow.steps[0];
      console.log("step", step);
      for (const assignment of step.assignments) {
        await processAssignment(
          tx,
          process,
          step,
          assignment,
          documentIds,
          false
        );
      }

      // 5. Set first step as current
      await tx.processInstance.update({
        where: { id: process.id },
        data: { currentStepId: step.id, status: "IN_PROGRESS" },
      });

      // 6. Create initial notifications

      return process;
    });

    return res.status(200).json({
      message: "Process initiated successfully",
      processId: process.id,
    });
  } catch (error) {
    console.error("Error initiating the process", error);
    return res.status(500).json({
      message: "Error initiating the process",
      error: error.message,
    });
  }
};

async function ensureDocumentAccessWithParents(
  tx,
  {
    documentId,
    userId,
    stepInstanceId,
    processId,
    assignmentId,
    roleId = null,
    departmentId = null,
  }
) {
  // First get all parent folders up to root
  const parents = await getDocumentParentHierarchy(tx, documentId);

  console.log("parents", parents);

  // Check which parents the user doesn't already have access to
  const existingAccess = await tx.documentAccess.findMany({
    where: {
      documentId: { in: parents.map((p) => p.id) },
      userId: userId,
      processId: processId,
    },
    select: { documentId: true },
  });

  const existingAccessIds = new Set(existingAccess.map((a) => a.documentId));
  const parentsToCreate = parents.filter((p) => !existingAccessIds.has(p.id));

  if (parentsToCreate.length > 0) {
    await tx.documentAccess.createMany({
      data: parentsToCreate.map((parent) => ({
        documentId: parent.id,
        stepInstanceId: stepInstanceId,
        accessType: [AccessType.READ], // VIEW access for parents
        processId: processId,
        assignmentId: assignmentId,
        userId: userId,
        roleId: roleId,
        departmentId: departmentId,
      })),
    });
  }

  // Now create access for the actual document
  await tx.documentAccess.create({
    data: {
      documentId: documentId,
      stepInstanceId: stepInstanceId,
      accessType: [AccessType.EDIT], // Actual requested access
      processId: processId,
      assignmentId: assignmentId,
      userId: userId,
      roleId: roleId,
      departmentId: departmentId,
    },
  });
}

async function getDocumentParentHierarchy(tx, documentId) {
  const parents = [];
  let currentDocId = documentId;

  while (currentDocId) {
    const doc = await tx.document.findUnique({
      where: { id: currentDocId },
      select: { parentId: true },
    });

    if (!doc || !doc.parentId) break;

    parents.push({ id: doc.parentId });
    currentDocId = doc.parentId;
  }

  return parents;
}

async function processAssignment(
  tx,
  process,
  step,
  assignment,
  documentIds,
  isRecirculated
) {
  // Create Assignment Progress
  const progress = await tx.assignmentProgress.create({
    data: {
      assignmentId: assignment.id,
      processId: process.id,
      roleHierarchy: assignment.allowParallel
        ? await buildRoleHierarchy(assignment)
        : null,
      completed: false,
    },
  });

  console.log("progress", progress);

  console.log("doc ids", documentIds);

  // Create Initial Step Instances
  switch (assignment.assigneeType) {
    case "DEPARTMENT":
      await handleDepartmentAssignment(
        tx,
        assignment,
        progress,
        documentIds,
        isRecirculated
      );
      break;
    case "ROLE":
      await handleRoleAssignment(
        tx,
        assignment,
        progress,
        documentIds,
        isRecirculated
      );
      break;
    case "USER":
      await handleUserAssignment(
        tx,
        assignment,
        progress,
        documentIds,
        isRecirculated
      );
      break;
  }
}

// Department Assignment Handler
async function handleDepartmentAssignment(
  tx,
  assignment,
  progress,
  documentIds
) {
  // Get current hierarchy level
  const hierarchy = JSON.parse(progress.roleHierarchy);
  const currentLevel = assignment.allowParallel ? 0 : progress.currentLevel;
  const currentRoles = hierarchy[currentLevel];

  // Create step instances for each role in current level
  for (const roleId of currentRoles) {
    // Get department users with this role
    const users = await tx.userRole.findMany({
      where: {
        roleId,
        departmentId: { in: assignment.assigneeIds },
      },
      select: { userId: true, departmentId: true },
    });

    // Create step instance for each user
    for (const user of users) {
      const stepInstance = await tx.processStepInstance.create({
        data: {
          processId: progress.processId,
          assignmentId: assignment.id,
          progressId: progress.id,
          assignedTo: user.userId,
          roleId: roleId,
          departmentId: user.departmentId,
          status: "PENDING",
        },
      });

      // Handle document access with parent hierarchy for each document
      for (const docId of documentIds) {
        await ensureDocumentAccessWithParents(tx, {
          documentId: docId,
          userId: user.userId,
          stepInstanceId: stepInstance.id,
          processId: progress.processId,
          assignmentId: assignment.id,
          roleId: assignment.allowParallel ? roleId : null,
          departmentId: user.departmentId,
        });
      }

      // Create notification
      await tx.processNotification.create({
        data: {
          stepInstance: {
            connect: { id: stepInstance.id },
          },
          user: {
            connect: { id: user.userId },
          },
          status: "ACTIVE",
          type: NotificationType.STEP_ASSIGNMENT,
        },
      });
    }
  }
}

async function handleUserAssignment(tx, assignment, progress, documentIds) {
  // Direct assignment to specified users
  console.log("assignment", assignment);
  for (const userId of assignment.assigneeIds) {
    // Create step instance for user
    const stepInstance = await tx.processStepInstance.create({
      data: {
        processId: progress.processId,
        assignmentId: assignment.id,
        progressId: progress.id,
        assignedTo: userId,
        status: "PENDING",
      },
    });

    // Handle document access with parent hierarchy for each document
    for (const docId of documentIds) {
      await ensureDocumentAccessWithParents(tx, {
        documentId: docId,
        userId: userId,
        stepInstanceId: stepInstance.id,
        processId: progress.processId,
        assignmentId: assignment.id,
      });
    }

    // Create user notification
    await tx.processNotification.create({
      data: {
        stepInstance: {
          connect: { id: stepInstance.id },
        },
        user: {
          connect: { id: userId },
        },
        status: "ACTIVE",
        type: NotificationType.STEP_ASSIGNMENT,
      },
    });
  }
}

async function handleRoleAssignment(tx, assignment, progress, documentIds) {
  // Get current hierarchy level (if hierarchical)
  const currentLevel = assignment.allowParallel ? 0 : progress.currentLevel;

  // Get all users with the assigned roles
  const users = await tx.userRole.findMany({
    where: {
      roleId: { in: assignment.assigneeIds },
    },
    select: { userId: true, roleId: true, departmentId: true },
  });

  // Filter users by current level if hierarchical
  let usersToAssign = [];

  if (assignment.allowParallel) {
    usersToAssign = users;
  } else {
    const hierarchy = JSON.parse(progress.roleHierarchy);
    const currentLevel = assignment.allowParallel ? 0 : progress.currentLevel;
    const currentRoles = hierarchy[currentLevel];

    usersToAssign = await tx.userRole.findMany({
      where: {
        roleId: { in: assignment.assigneeIds },
      },
      select: { userId: true, roleId: true, departmentId: true },
    });
  }

  for (const user of usersToAssign) {
    const stepInstance = await tx.processStepInstance.create({
      data: {
        processId: progress.processId,
        assignmentId: assignment.id,
        progressId: progress.id,
        assignedTo: user.userId,
        roleId: user.roleId,
        departmentId: user.departmentId,
        status: "PENDING",
      },
    });

    // Handle document access with parent hierarchy for each document
    for (const docId of documentIds) {
      await ensureDocumentAccessWithParents(tx, {
        documentId: docId,
        userId: user.userId,
        stepInstanceId: stepInstance.id,
        processId: progress.processId,
        assignmentId: assignment.id,
        roleId: assignment.allowParallel ? user.roleId : null,
        departmentId: user.departmentId,
      });
    }

    // Create notification
    await tx.processNotification.create({
      data: {
        stepInstance: {
          connect: { id: stepInstance.id },
        },
        user: {
          connect: { id: user.userId },
        },
        status: "ACTIVE",
        type: NotificationType.STEP_ASSIGNMENT,
      },
    });
  }
}

export const view_process = async (req, res) => {
  try {
    const { processId } = req.params;
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized" || !userData?.id) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const process = await prisma.processInstance.findUnique({
      where: { id: processId },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
        currentStep: {
          select: {
            id: true,
            stepName: true,
            stepNumber: true,
            stepType: true,
          },
        },
        documents: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                type: true,
                path: true,
                tags: true,
              },
            },
            signatures: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                  },
                },
              },
            },
            rejectedBy: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
            documentHistory: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                  },
                },
                replacedDocument: {
                  select: {
                    id: true,
                    name: true,
                    path: true,
                  },
                },
              },
            },
          },
        },
        stepInstances: {
          where: {
            assignedTo: userData.id,
            status: { in: ["PENDING", "IN_PROGRESS", "FOR_RECIRCULATION"] },
          },
          include: {
            workflowStep: {
              select: {
                id: true,
                stepName: true,
                stepNumber: true,
                stepType: true,
              },
            },
            processQA: {
              where: {
                status: "OPEN",
                initiatorId: { not: userData.id },
                entityId: userData.id,
              },
              include: {
                initiator: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!process) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Process not found",
          code: "PROCESS_NOT_FOUND",
        },
      });
    }

    // Fetch workflow steps with engaged assignees
    const workflowSteps = await prisma.workflowStep.findMany({
      where: {
        workflowId: process.workflow.id,
        processStepInstances: {
          some: {
            processId,
            OR: [
              { pickedById: { not: null } },
              { status: { in: ["APPROVED", "IN_PROGRESS"] } },
            ],
          },
        },
      },
      select: {
        stepName: true,
        stepNumber: true,
        processStepInstances: {
          where: {
            processId,
            OR: [
              { pickedById: { not: null } },
              { status: { in: ["APPROVED", "IN_PROGRESS"] } },
            ],
          },
          select: {
            assignedTo: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { stepNumber: "asc" },
    });

    const workflow = workflowSteps.map((step) => ({
      stepName: step.stepName,
      stepNumber: step.stepNumber,
      engagedAssignees: step.processStepInstances
        .map((instance) => ({
          assigneeName: instance.user.name,
          assigneeId: instance.assignedTo,
        }))
        .filter(
          (value, index, self) =>
            index === self.findIndex((t) => t.assigneeId === value.assigneeId)
        ),
    }));

    const transformedDocuments = process.documents.map((doc) => {
      const signedBy = doc.signatures.map((sig) => ({
        signedBy: sig.user.name,
        signedAt: sig.signedAt ? sig.signedAt.toISOString() : null,
        remarks: sig.reason || null,
      }));

      const rejectionDetails = doc.rejectedBy
        ? {
            rejectedBy: doc.rejectedBy.name,
            rejectionReason: doc.rejectionReason,
            rejectedAt: doc.rejectedAt ? doc.rejectedAt.toISOString() : null,
          }
        : null;

      const documentHistory = doc.documentHistory.map((history) => ({
        actionType: history.actionType,
        user: history.user.name,
        createdAt: history.createdAt.toISOString(),
        details: history.actionDetails,
        replacedDocument: history.replacedDocument
          ? {
              id: history.replacedDocument.id,
              name: history.replacedDocument.name,
              path: history.replacedDocument.path,
            }
          : null,
        isRecirculationTrigger: history.isRecirculationTrigger,
      }));

      return {
        id: doc.document.id,
        name: doc.document.name,
        type: doc.document.type,
        path: doc.document.path,
        signedBy,
        rejectionDetails,
        documentHistory,
        isRecirculationTrigger: doc.documentHistory.some(
          (h) => h.isRecirculationTrigger
        ),
        access: doc.document.tags.includes("confidential")
          ? ["auditor"]
          : ["auditor", "manager"],
        approvalCount: signedBy.length,
      };
    });

    const transformedStepInstances = process.stepInstances.map((step) => ({
      stepInstanceId: step.id,
      stepName: step.workflowStep.stepName,
      stepNumber: step.workflowStep.stepNumber,
      status: step.status,
      taskType: step.processQA.length > 0 ? "QUERY_UPLOAD" : "REGULAR",
      queryDetails:
        step.processQA.length > 0
          ? {
              queryText: step.processQA[0].question,
              initiatorName: step.processQA[0].initiator.name,
              createdAt: step.processQA[0].createdAt.toISOString(),
            }
          : null,
    }));

    const toBePicked = process.stepInstances.some(
      (step) => step.assignedTo === userData.id && step.status === "PENDING"
    );

    const response = {
      process: {
        processId: process.id,
        processStepInstanceId: process.currentStep?.id || null,
        toBePicked,
        isRecirculated: process.isRecirculated,
        documents: transformedDocuments,
        stepInstances: transformedStepInstances,
        workflow,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error getting process:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to view process",
        details: error.message,
        code: "PROCESS_VIEW_ERROR",
      },
    });
  }
};
// export const view_process = async (req, res, next) => {
//   try {
// const accessToken = req.headers["authorization"]?.substring(7);
// const userData = await verifyUser(accessToken);

// if (userData === "Unauthorized") {
//   return res.status(401).json({ message: "Unauthorized request" });
// }

//     req.user = userData;

//     const { processId } = req.params;
//     const process = await viewProcess(processId, userData.id);

//     return res.status(200).json({ process: process });
//   } catch (error) {
//     console.log("Error viewing process", error);
//     return res.status(500).json({
//       message: "Error viewing the process",
//     });
//   }
// };

// processHandling.js
async function handleProcessClaim(userId, stepInstanceId) {
  return prisma.$transaction(async (tx) => {
    // 2. Claim the step
    const step = await tx.processStepInstance.update({
      where: {
        id: stepInstanceId,
        status: "PENDING",
        assignedTo: userId,
      },
      data: {
        status: "APPROVED",
        claimedAt: new Date(),
        pickedById: userId,
      },
      include: {
        workflowAssignment: {
          include: { departmentRoles: true },
        },
        assignmentProgress: {
          include: {
            departmentStepProgress: true,
          },
        },
        process: {
          select: { id: true },
        },
      },
    });

    const processId = step.process.id;

    // 3. Handle Role assignments
    if (step.workflowAssignment.assigneeType === "ROLE") {
      await tx.processStepInstance.deleteMany({
        where: {
          assignmentId: step.assignmentId,
          status: "PENDING",
          id: { not: step.id },
        },
      });

      await tx.processNotification.deleteMany({
        where: {
          stepInstanceId: {
            in: (
              await tx.processStepInstance.findMany({
                where: {
                  assignmentId: step.assignmentId,
                  status: "PENDING",
                  id: { not: step.id },
                },
                select: { id: true },
              })
            ).map((si) => si.id),
          },
        },
      });

      await tx.assignmentProgress.update({
        where: { id: step.assignmentProgress.id },
        data: { completed: true },
      });
    }

    // 4. Handle department-specific tracking
    if (step.workflowAssignment.assigneeType === "DEPARTMENT") {
      if (step.workflowAssignment.allowParallel) {
        await tx.departmentStepProgress.update({
          where: {
            id: step.assignmentProgress.departmentStepProgress.id,
          },
          data: {
            completedRoles: { push: step.roleId },
          },
        });
      }
      await updateDepartmentProgress(tx, step);
    }

    // 5. Check assignment and process completion
    await checkAssignmentCompletion(tx, step.assignmentProgress.id);
    await checkProcessProgress(tx, processId);

    // 6. Notify about step completion
    await tx.processNotification.create({
      data: {
        stepId: step.id,
        userId: userId,
        type: NotificationType.STEP_ASSIGNMENT,
        status: "COMPLETED",
        metadata: { action: "Step claimed and approved" },
      },
    });

    return step;
  });
}

async function updateDepartmentProgress(tx, step) {
  const progress = await tx.departmentStepProgress.findUnique({
    where: { id: step.assignmentProgress.departmentStepProgress.id },
  });

  // For parallel departments
  if (step.workflowAssignment.allowParallel) {
    const allCompleted = progress.requiredRoles.every((r) =>
      progress.completedRoles.includes(r)
    );

    if (allCompleted) {
      await tx.assignmentProgress.update({
        where: { id: step.assignmentProgress.id },
        data: { completed: true },
      });
    }
    return;
  }

  // Original hierarchical logic...
}

async function advanceHierarchyLevel(tx, progress) {
  const nextLevel = progress.currentLevel + 1;
  const hierarchy = JSON.parse(progress.roleHierarchy);
  const currentRoles = hierarchy[progress.currentLevel];
  const nextRoles = hierarchy[nextLevel];

  // Delete pending step instances for current roles
  await tx.processStepInstance.deleteMany({
    where: {
      progressId: progress.id,
      roleId: { in: currentRoles },
      status: "PENDING",
    },
  });

  // Create new step instances for next roles
  for (const roleId of nextRoles) {
    const users = await tx.userRole.findMany({
      where: {
        roleId,
        departmentId: {
          in: await getAssignmentDepartments(progress.assignmentId),
        },
      },
    });

    for (const user of users) {
      await tx.processStepInstance.create({
        data: {
          processId: progress.processId,
          assignmentId: progress.assignmentId,
          progressId: progress.id,
          assignedTo: user.userId,
          roleId,
          departmentId: user.departmentId,
          status: "PENDING",
        },
      });
    }
  }

  // Update current level
  await tx.assignmentProgress.update({
    where: { id: progress.id },
    data: { currentLevel: nextLevel },
  });
}

// processChecks.js
async function checkAssignmentCompletion(tx, progressId) {
  const pending = await tx.processStepInstance.count({
    where: {
      progressId,
      status: "PENDING",
    },
  });

  if (pending === 0) {
    await tx.assignmentProgress.update({
      where: { id: progressId },
      data: { completed: true, completedAt: new Date() },
    });
  }
}

async function checkProcessProgress(tx, processId) {
  const process = await tx.processInstance.findUnique({
    where: { id: processId },
    include: {
      currentStep: true,
      workflow: {
        include: {
          steps: {
            include: { assignments: true },
          },
        },
      },
      queries: {
        where: { status: "RECIRCULATION_PENDING" },
      },
    },
  });

  if (process.queries.length > 0) {
    return; // Wait for recirculation approval
  }

  const currentStepAssignments = await tx.assignmentProgress.findMany({
    where: {
      processId,
      workflowAssignment: {
        stepId: process.currentStepId,
      },
    },
  });

  const allCompleted = currentStepAssignments.every((a) => a.completed);

  if (allCompleted) {
    await advanceToNextStep(tx, process);
  }
}

async function advanceToNextStep(processId, currentStepId) {
  return prisma.$transaction(async (tx) => {
    const currentStep = await tx.workflowStep.findUnique({
      where: { id: currentStepId },
    });

    const nextStep = await tx.workflowStep.findFirst({
      where: {
        workflowId: currentStep.workflowId,
        stepNumber: { gt: currentStep.stepNumber },
      },
      orderBy: { stepNumber: "asc" },
    });

    // Check for open queries
    const openQueries = await tx.processQA.findMany({
      where: {
        processId,
        answer: null,
        status: "OPEN",
      },
    });

    if (openQueries.length > 0) {
      return {
        status: "WAITING_QUERIES",
        openQueriesCount: openQueries.length,
      };
    }

    if (nextStep) {
      // Check if all preceding steps are complete
      const incompleteSteps = await tx.processStepInstance.findMany({
        where: {
          processId,
          workflowStep: {
            stepNumber: { lt: nextStep.stepNumber },
          },
          status: { not: "APPROVED" },
          OR: [
            { pickedById: { not: null } },
            { claimedAt: { not: null } },
            { status: { in: ["PENDING", "IN_PROGRESS"] } },
          ],
        },
      });

      if (incompleteSteps.length > 0) {
        return {
          status: "WAITING_PRECEDING_STEPS",
          incompleteStepsCount: incompleteSteps.length,
        };
      }

      // Reset FOR_RECIRCULATION steps for next step
      const forRecirculationSteps = await tx.processStepInstance.findMany({
        where: {
          processId,
          workflowStepId: nextStep.id,
          status: "FOR_RECIRCULATION",
        },
      });

      for (const recircStep of forRecirculationSteps) {
        await tx.processStepInstance.update({
          where: { id: recircStep.id },
          data: {
            status: "PENDING",
            recirculationReason: null,
          },
        });

        await tx.processNotification.create({
          data: {
            stepInstanceId: recircStep.id,
            userId: recircStep.assignedTo,
            type: "STEP_ASSIGNED",
            status: "ACTIVE",
            metadata: { processId },
          },
        });
      }

      await tx.processInstance.update({
        where: { id: processId },
        data: { currentStepId: nextStep.id },
      });

      return { status: "ADVANCED", nextStepId: nextStep.id };
    } else {
      await tx.processInstance.update({
        where: { id: processId },
        data: { status: "COMPLETED", currentStepId: null },
      });
      return { status: "COMPLETED" };
    }
  });
}

async function buildRoleHierarchy(selectedRoleIds, direction, allowParallel) {
  // Flatten hierarchy if parallel allowed
  if (allowParallel) return [selectedRoleIds];

  // Existing hierarchy logic with equal level handling
  const roles = await prisma.role.findMany({
    where: { id: { in: selectedRoleIds } },
    include: { parentRole: true, childRoles: true },
  });

  // Group equal-level roles by parent ID
  const roleMap = roles.reduce((acc, role) => {
    const key = role.parentRoleId || "root";
    acc[key] = acc[key] || [];
    acc[key].push(role.id);
    return acc;
  }, {});

  // Build levels based on direction
  return direction === "UPWARDS"
    ? Object.values(roleMap).reverse()
    : Object.values(roleMap);
}

export const get_user_processes = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const userId = userData.id;

    const stepInstances = await prisma.processStepInstance.findMany({
      where: {
        assignedTo: userId,
        status: "PENDING",
      },
      include: {
        process: {
          include: {
            workflow: {
              select: { name: true },
            },
            initiator: {
              select: { username: true },
            },
            // queries: {
            //   where: {
            //     OR: [
            //       { raisedById: userId },
            //       { recirculationApprovals: { some: { approverId: userId } } },
            //     ],
            //   },
            //   select: { id: true, queryText: true, status: true },
            // },
            // recommendations: {
            //   where: {
            //     OR: [{ requestedById: userId }, { recommendedToId: userId }],
            //     status: "PENDING",
            //   },
            //   select: { id: true, remarks: true, status: true },
            // },
          },
        },
        workflowAssignment: {
          include: {
            step: {
              select: {
                stepType: true,
                stepName: true,
                escalationTime: true,
              },
            },
          },
        },
      },
    });

    const response = stepInstances.map((step) => {
      const escalationHours =
        step.workflowAssignment?.step?.escalationTime || 24;
      const assignedAt = step.deadline
        ? new Date(step.deadline.getTime() - escalationHours * 60 * 60 * 1000)
        : null;

      return {
        processId: step.process.id,
        processName: step.process?.name || "Unnamed Process",
        workflowName: step.process?.workflow?.name || "Unknown Workflow",
        initiatorUsername: step.process?.initiator?.username || "System User",
        createdAt: step.createdAt,
        actionType: step.workflowAssignment?.step?.stepType || "GENERAL",
        stepName: step.workflowAssignment?.step?.stepName || "Pending Step",
        currentStepAssignedAt: assignedAt,
        assignmentId: step.assignmentId,
        deadline: step.deadline,
        // queries: step.process.queries.map((q) => ({
        //   id: q.id,
        //   queryText: q.queryText,
        //   status: q.status,
        // })),
        // recommendations: step.process.recommendations.map((r) => ({
        //   id: r.id,
        //   remarks: r.remarks,
        //   status: r.status,
        // })),
      };
    });

    return res.json(response);
  } catch (error) {
    console.error("Error in get_user_processes:", error);
    return res.status(500).json({
      message: "Failed to retrieve processes",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const complete_process_step = async (req, res) => {
  try {
    const { stepInstanceId } = req.body;
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate step instance
      const stepInstance = await tx.processStepInstance.findUnique({
        where: {
          id: stepInstanceId,
          assignedTo: userData.id,
          status: "IN_PROGRESS",
        },
        include: { process: true, workflowStep: true },
      });

      if (!stepInstance) {
        throw new Error("Invalid step instance or user not assigned");
      }

      if (stepInstance.status === "FOR_RECIRCULATION") {
        throw new Error("Cannot complete step until recirculation is resolved");
      }

      // 2. Mark step as APPROVED
      await tx.processStepInstance.update({
        where: { id: stepInstanceId },
        data: {
          status: "APPROVED",
          decisionAt: new Date(),
        },
      });

      // 3. Check if all assignments for this step are complete
      const incompleteAssignments = await tx.processStepInstance.findMany({
        where: {
          processId: stepInstance.processId,
          workflowStepId: stepInstance.workflowStepId,
          status: { not: "APPROVED" },
          OR: [
            { pickedById: { not: null } },
            { claimedAt: { not: null } },
            { status: { in: ["PENDING", "IN_PROGRESS"] } },
          ],
        },
      });

      if (incompleteAssignments.length === 0) {
        // 4. Step is complete, check for open queries
        const openQueries = await tx.processQA.findMany({
          where: {
            processId: stepInstance.processId,
            answer: null,
            status: "OPEN",
          },
        });

        if (openQueries.length === 0) {
          // 5. No open queries, advance to next step
          const currentStep = await tx.workflowStep.findUnique({
            where: { id: stepInstance.workflowStepId },
          });

          const nextStep = await tx.workflowStep.findFirst({
            where: {
              workflowId: stepInstance.process.workflowId,
              stepNumber: { gt: currentStep.stepNumber },
            },
            orderBy: { stepNumber: "asc" },
          });

          if (nextStep) {
            // 6. Reset FOR_RECIRCULATION steps to PENDING
            const forRecirculationSteps = await tx.processStepInstance.findMany(
              {
                where: {
                  processId: stepInstance.processId,
                  workflowStepId: nextStep.id,
                  status: "FOR_RECIRCULATION",
                },
              }
            );

            for (const recircStep of forRecirculationSteps) {
              await tx.processStepInstance.update({
                where: { id: recircStep.id },
                data: {
                  status: "PENDING",
                  recirculationReason: null,
                },
              });

              await tx.processNotification.create({
                data: {
                  stepInstanceId: recircStep.id,
                  userId: recircStep.assignedTo,
                  type: "STEP_ASSIGNED",
                  status: "ACTIVE",
                  metadata: { processId: stepInstance.processId },
                },
              });
            }

            // 7. Update currentStepId
            await tx.processInstance.update({
              where: { id: stepInstance.processId },
              data: { currentStepId: nextStep.id },
            });
          } else {
            // No next step, complete process
            await tx.processInstance.update({
              where: { id: stepInstance.processId },
              data: { status: "COMPLETED", currentStepId: null },
            });
          }
        }
      }

      return { message: "Step completed successfully" };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error completing step:", error);
    return res
      .status(500)
      .json({ message: "Error completing step", error: error.message });
  }
};

async function checkPendingQueries(tx, stepInstanceId) {
  const count = await tx.processQuery.count({
    where: {
      stepInstanceId,
      status: { in: ["OPEN", "RECIRCULATION_PENDING"] },
    },
  });
  return count > 0;
}

async function getUserRecommendations(tx, userId) {
  return await tx.processRecommendation.findMany({
    where: {
      OR: [{ requestedById: userId }, { recommendedToId: userId }],
      status: "PENDING",
    },
    select: {
      id: true,
      processId: true,
      remarks: true,
      status: true,
    },
  });
}

export const createQuery = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const {
      processId,
      stepInstanceId,
      queryText,
      documentChanges = [],
      documentSummaries = [],
      assignedStepName,
      assignedAssigneeId,
    } = req.body;

    if (!processId || !stepInstanceId || !queryText) {
      return res.status(400).json({
        message:
          "Missing required fields: processId, stepInstanceId, queryText",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate step instance and user access
      const stepInstance = await tx.processStepInstance.findUnique({
        where: {
          id: stepInstanceId,
          assignedTo: userData.id,
          status: "IN_PROGRESS",
        },
        include: { process: true, workflowAssignment: true },
      });

      if (!stepInstance) {
        throw new Error("Invalid step instance or user not assigned");
      }

      // 2. Check if this is a delegated upload task
      const isDelegatedTask = await tx.processQA.findFirst({
        where: {
          stepInstanceId,
          initiatorId: { not: userData.id }, // Initiated by someone else
          entityId: userData.id, // Assigned to current user
          answer: null, // Not yet answered
        },
      });

      let processQA;
      if (!isDelegatedTask) {
        // 3. Create ProcessQA for non-delegated tasks
        processQA = await tx.processQA.create({
          data: {
            processId,
            stepInstanceId,
            initiatorId: userData.id,
            entityId: assignedAssigneeId || userData.id,
            entityType: assignedAssigneeId
              ? "USER"
              : stepInstance.workflowAssignment.assigneeType,
            question: queryText,
            createdAt: new Date(),
          },
        });
      } else {
        // Update existing ProcessQA for delegated task
        processQA = await tx.processQA.update({
          where: { id: isDelegatedTask.id },
          data: {
            answer: queryText,
            answeredAt: new Date(),
            status: "RESOLVED",
          },
        });
      }

      // 4. Handle document changes (Case 1)
      const documentHistoryEntries = [];
      for (const change of documentChanges) {
        const { documentId, requiresApproval, isReplacement } = change;
        const document = await tx.document.findUnique({
          where: { id: documentId },
        });
        if (!document) {
          throw new Error(`Document ${documentId} not found`);
        }

        const processDocument = await tx.processDocument.create({
          data: {
            processId,
            documentId,
            isReplacement,
            replacedDocumentId: isReplacement ? documentId : null,
          },
        });

        const history = await tx.documentHistory.create({
          data: {
            documentId,
            processId,
            stepInstanceId,
            userId: userData.id,
            actionType: isReplacement ? "REPLACED" : "UPLOADED",
            actionDetails: {
              isReplacement,
              requiresApproval,
              originalDocumentId: isReplacement ? documentId : null,
            },
            isRecirculationTrigger: true,
            createdAt: new Date(),
          },
        });

        documentHistoryEntries.push(history);

        await ensureDocumentAccessWithParents(tx, {
          documentId,
          userId: userData.id,
          stepInstanceId,
          processId,
          assignmentId: stepInstance.assignmentId,
          roleId: stepInstance.roleId,
          departmentId: stepInstance.departmentId,
        });
      }

      // 5. Handle document summaries/feedback (Case 2)
      for (const summary of documentSummaries) {
        const { documentId, feedbackText } = summary;
        const document = await tx.document.findUnique({
          where: { id: documentId },
        });
        if (!document) {
          throw new Error(`Document ${documentId} not found`);
        }

        await tx.documentHistory.create({
          data: {
            documentId,
            processId,
            stepInstanceId,
            userId: userData.id,
            actionType: "FEEDBACK",
            actionDetails: { feedbackText },
            isRecirculationTrigger: true,
            createdAt: new Date(),
          },
        });
      }

      // 6. Update step instance status
      if (isDelegatedTask && documentChanges.length > 0) {
        // For delegated upload tasks with documents, mark as APPROVED
        await tx.processStepInstance.update({
          where: { id: stepInstanceId },
          data: {
            status: "APPROVED",
            decisionAt: new Date(),
            isRecirculated: true,
            recirculationReason: queryText,
          },
        });
      } else {
        // For non-delegated tasks or delegation, mark as FOR_RECIRCULATION
        await tx.processStepInstance.update({
          where: { id: stepInstanceId },
          data: {
            status: "FOR_RECIRCULATION",
            recirculationReason: queryText,
            isRecirculated: true,
          },
        });
      }

      // 7. Update process to indicate recirculation
      await tx.processInstance.update({
        where: { id: processId },
        data: { isRecirculated: true },
      });

      // 8. If assignedStepName and assignedAssigneeId provided, create new step instance
      if (assignedStepName && assignedAssigneeId) {
        const workflowStep = await tx.workflowStep.findFirst({
          where: {
            workflowId: stepInstance.process.workflowId,
            stepName: assignedStepName,
          },
        });

        if (!workflowStep) {
          throw new Error(`Step ${assignedStepName} not found in workflow`);
        }

        const newStepInstance = await tx.processStepInstance.create({
          data: {
            processId,
            workflowStepId: workflowStep.id,
            assignedTo: assignedAssigneeId,
            status: "PENDING",
            createdAt: new Date(),
            deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });

        await tx.processNotification.create({
          data: {
            stepInstanceId: newStepInstance.id,
            userId: assignedAssigneeId,
            type: "DOCUMENT_QUERY",
            status: "ACTIVE",
            metadata: { queryText, processId },
          },
        });
      }

      // 9. Reset first step instances for engaged assignees
      const firstStep = await tx.workflowStep.findFirst({
        where: { workflowId: stepInstance.process.workflowId },
        orderBy: { stepNumber: "asc" },
      });

      const engagedStepInstances = await tx.processStepInstance.findMany({
        where: {
          processId,
          workflowStepId: firstStep.id,
          OR: [
            { pickedById: { not: null } },
            { claimedAt: { not: null } },
            { status: { in: ["APPROVED", "IN_PROGRESS"] } },
          ],
        },
      });

      for (const instance of engagedStepInstances) {
        await tx.processStepInstance.update({
          where: { id: instance.id },
          data: {
            status: "PENDING",
            isRecirculated: true,
            recirculationReason: queryText,
            claimedAt: null,
            pickedById: null,
          },
        });

        await tx.processNotification.create({
          data: {
            stepInstanceId: instance.id,
            userId: instance.assignedTo,
            type: "DOCUMENT_QUERY",
            status: "ACTIVE",
            metadata: { queryText, processId },
          },
        });
      }

      return { processQA, documentHistoryEntries };
    });

    return res.status(200).json({
      message: "Query submitted successfully, process set for recirculation",
      queryId: result.processQA.id,
    });
  } catch (error) {
    console.error("Error creating query:", error);
    return res.status(500).json({
      message: "Error creating query",
      error: error.message,
    });
  }
};

export const assignDocumentUpload = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const {
      processId,
      stepInstanceId,
      stepName,
      assigneeId,
      queryText,
      documentId,
    } = req.body;

    if (
      !processId ||
      !stepInstanceId ||
      !stepName ||
      !assigneeId ||
      !queryText ||
      !documentId
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate current step instance
      const stepInstance = await tx.processStepInstance.findUnique({
        where: {
          id: stepInstanceId,
          assignedTo: userData.id,
          status: "IN_PROGRESS",
        },
        include: { process: true },
      });

      if (!stepInstance) {
        throw new Error("Invalid step instance or user not assigned");
      }

      // 2. Find the target step
      const workflowStep = await tx.workflowStep.findFirst({
        where: {
          workflowId: stepInstance.process.workflowId,
          stepName,
        },
      });

      if (!workflowStep) {
        throw new Error(`Step ${stepName} not found in workflow`);
      }

      // 3. Create new step instance for assignee
      const newStepInstance = await tx.processStepInstance.create({
        data: {
          processId,
          workflowStepId: workflowStep.id,
          assignedTo: assigneeId,
          status: "PENDING",
          createdAt: new Date(),
          deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      // 4. Create ProcessQA
      const processQA = await tx.processQA.create({
        data: {
          processId,
          stepInstanceId: newStepInstance.id,
          initiatorId: userData.id,
          entityId: assigneeId,
          entityType: "USER",
          question: queryText,
          createdAt: new Date(),
        },
      });

      // 5. Update current step to FOR_RECIRCULATION
      await tx.processStepInstance.update({
        where: { id: stepInstanceId },
        data: {
          status: "FOR_RECIRCULATION",
          recirculationReason: queryText,
          isRecirculated: true,
        },
      });

      // 6. Update process to indicate recirculation
      await tx.processInstance.update({
        where: { id: processId },
        data: { isRecirculated: true },
      });

      // 7. Log document history
      await tx.documentHistory.create({
        data: {
          documentId,
          processId,
          stepInstanceId,
          userId: userData.id,
          actionType: "FEEDBACK",
          actionDetails: {
            queryText,
            assignedTo: assigneeId,
            assignedStep: stepName,
          },
          isRecirculationTrigger: true,
          createdAt: new Date(),
        },
      });

      // 8. Create notification for assignee
      await tx.processNotification.create({
        data: {
          stepInstanceId: newStepInstance.id,
          userId: assigneeId,
          type: "DOCUMENT_QUERY",
          status: "ACTIVE",
          metadata: { queryText, processId, documentId },
        },
      });

      // 9. Reset first step instances for assignees who previously engaged
      const firstStep = await tx.workflowStep.findFirst({
        where: { workflowId: stepInstance.process.workflowId },
        orderBy: { stepNumber: "asc" },
      });

      const engagedStepInstances = await tx.processStepInstance.findMany({
        where: {
          processId,
          workflowStepId: firstStep.id,
          OR: [
            { pickedById: { not: null } },
            { claimedAt: { not: null } },
            { status: { in: ["APPROVED", "IN_PROGRESS"] } },
          ],
        },
      });

      for (const instance of engagedStepInstances) {
        await tx.processStepInstance.update({
          where: { id: instance.id },
          data: {
            status: "PENDING",
            isRecirculated: true,
            recirculationReason: queryText,
            claimedAt: null,
            pickedById: null,
          },
        });

        await tx.processNotification.create({
          data: {
            stepInstanceId: instance.id,
            userId: instance.assignedTo,
            type: "DOCUMENT_QUERY",
            status: "ACTIVE",
            metadata: { queryText, processId },
          },
        });
      }

      return processQA;
    });

    return res.status(200).json({
      message: "Document upload assigned successfully",
      queryId: result.id,
    });
  } catch (error) {
    console.error("Error assigning document upload:", error);
    return res.status(500).json({
      message: "Error assigning document upload",
      error: error.message,
    });
  }
};
