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
  const usersToAssign = assignment.allowParallel
    ? users
    : users.filter((user) => {
        // Implement your role hierarchy level check here
        // This depends on how your role hierarchy is structured
        return true; // Placeholder - adjust based on your hierarchy logic
      });

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

// processViews.js
// processViews.js
// processViews.js
async function viewProcess(processId, userId) {
  const process = await prisma.processInstance.findUnique({
    where: { id: processId },
    include: {
      initiator: { select: { name: true } },
      documents: {
        include: {
          document: {
            include: {
              documentAccesses: {
                where: { processId: processId },
              },
            },
          },
          rejectedBy: {
            select: { id: true, username: true, name: true },
          },
          signatures: {
            include: {
              user: {
                select: { id: true, username: true, name: true },
              },
            },
          },
          signCoordinates: {
            where: { isSigned: true },
            include: {
              signedBy: {
                select: { id: true, username: true, name: true },
              },
            },
          },
        },
      },
      stepInstances: {
        where: {
          OR: [{ assignedTo: userId }, { pickedById: userId }],
          status: "PENDING",
        },
        include: {
          workflowAssignment: {
            select: {
              assigneeType: true,
            },
          },
        },
      },
      queries: {
        where: {
          OR: [
            { raisedById: userId },
            { recirculationApprovals: { some: { approverId: userId } } },
          ],
        },
        include: {
          raisedBy: { select: { name: true, username: true } },
          documents: {
            include: {
              document: { select: { id: true, name: true } },
            },
          },
        },
      },
      recommendations: {
        where: {
          OR: [{ requestedById: userId }, { recommendedToId: userId }],
        },
        include: {
          requestedBy: { select: { name: true, username: true } },
          recommendedTo: { select: { name: true, username: true } },
        },
      },
    },
  });

  if (!process) throw new Error("Process not found");

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { select: { roleId: true } },
      branches: { select: { id: true } },
    },
  });

  if (!currentUser) throw new Error("User not found");

  const documentsWithAccess = process.documents.map((processDoc) => {
    const accessTypes = new Set();

    processDoc.document.documentAccesses.forEach((access) => {
      if (
        access.userId === userId ||
        currentUser.roles.some((r) => r.roleId === access.roleId) ||
        currentUser.branches.some((b) => b.id === access.departmentId)
      ) {
        accessTypes.add(access.accessType);
      }
    });

    const rejectionDetails = processDoc.rejectedBy
      ? {
          rejectedBy:
            processDoc.rejectedBy.username || processDoc.rejectedBy.name,
          rejectionReason: processDoc.rejectionReason || "No reason provided",
          rejectedAt: processDoc.rejectedAt,
        }
      : null;

    const signatureDetails =
      processDoc.signatures.map((signature) => ({
        signedBy: signature.user.username || signature.user.name,
        remarks: signature.reason || "No remarks provided",
        signedAt: signature.signedAt,
      })) || [];

    const signedCoordinates = processDoc.signCoordinates || [];
    const approvalCount = signatureDetails.length;

    return {
      id: processDoc.document.id,
      name: processDoc.document.name,
      type: processDoc.document.type,
      access: Array.from(accessTypes),
      rejectionDetails: rejectionDetails,
      signedBy: signatureDetails,
      approvalCount: approvalCount,
      signedCoordinates: signedCoordinates.map((coord) => ({
        page: coord.page,
        x: coord.x,
        y: coord.y,
        signedBy: coord.signedBy?.username || coord.signedBy?.name,
      })),
    };
  });

  const arrivalTime = process.stepInstances[0]?.createdAt || null;
  const processStepInstanceId =
    process.stepInstances.length > 0 ? process.stepInstances[0].id : null;
  const toBePicked =
    (!process.stepInstances[0]?.pickedById &&
      process.stepInstances[0].workflowAssignment?.assigneeType ===
        "DEPARTMENT") ||
    process.stepInstances[0].workflowAssignment?.assigneeType === "ROLE";

  return {
    processId: process.id,
    processName: process.name,
    status: process.status,
    createdAt: process.createdAt,
    initiatorName: process.initiator.name,
    arrivedAt: arrivalTime,
    documents: documentsWithAccess,
    processStepInstanceId: processStepInstanceId,
    toBePicked: toBePicked,
    queries: process.queries.map((query) => ({
      id: query.id,
      queryText: query.queryText,
      status: query.status,
      raisedBy: query.raisedBy.name || query.raisedBy.username,
      documents: query.documents.map((doc) => ({
        id: doc.document.id,
        name: doc.document.name,
      })),
    })),
    recommendations: process.recommendations.map((rec) => ({
      id: rec.id,
      status: rec.status,
      requestedBy: rec.requestedBy.name || rec.requestedBy.username,
      recommendedTo: rec.recommendedTo.name || rec.recommendedTo.username,
      remarks: rec.remarks,
    })),
  };
}
export const view_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { processId } = req.params;
    const process = await viewProcess(processId, userData.id);

    return res.status(200).json({ process: process });
  } catch (error) {
    console.log("Error viewing process", error);
    return res.status(500).json({
      message: "Error viewing the process",
    });
  }
};

// processHandling.js
async function handleProcessClaim(userId, stepInstanceId) {
  return prisma.$transaction(async (tx) => {
    // 1. Check for open queries
    const openQueries = await tx.processQuery.count({
      where: {
        stepInstanceId,
        status: { in: ["OPEN", "RECIRCULATION_PENDING"] },
      },
    });

    if (openQueries > 0) {
      throw new Error("Cannot claim step with open queries");
    }

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

async function advanceToNextStep(tx, process) {
  try {
    console.log("Advancing process:", process.id);

    // 1. Verify process has required relations loaded
    if (!process?.workflow?.steps || !Array.isArray(process.workflow.steps)) {
      throw new Error("Invalid process structure - workflow steps not loaded");
    }

    const processDocuments = await tx.processDocument.findMany({
      where: { processId: process.id },
      select: { documentId: true },
    });
    const documentIds = processDocuments.map((pd) => pd.documentId);

    // 2. Handle missing current step differently
    if (!process.currentStep) {
      console.warn(
        `Process ${process.id} has no current step, starting from first step`
      );

      // Find first step in workflow
      const firstStep = process.workflow.steps.sort(
        (a, b) => a.stepNumber - b.stepNumber
      )[0];

      if (!firstStep) {
        throw new Error("Workflow has no steps defined");
      }

      // Update to first step
      await tx.processInstance.update({
        where: { id: process.id },
        data: {
          currentStepId: firstStep.id,
          status: "IN_PROGRESS",
        },
      });
      return;
    }

    // 3. Find next step (original logic)
    const sortedSteps = [...process.workflow.steps].sort(
      (a, b) => a.stepNumber - b.stepNumber
    );
    const nextStep = sortedSteps.find(
      (s) => s.stepNumber === process.currentStep.stepNumber + 1
    );

    if (nextStep) {
      await tx.processInstance.update({
        where: { id: process.id },
        data: { currentStepId: nextStep.id },
      });

      // Initialize next step assignments
      for (const assignment of nextStep.assignments) {
        await processAssignment(tx, process, nextStep, assignment, documentIds);
      }
    } else {
      // 4. Use valid COMPLETED status
      await tx.processInstance.update({
        where: { id: process.id },
        data: {
          status: "COMPLETED", // Must match enum exactly
          currentStepId: null,
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error(`Error advancing process ${process?.id}:`, error);

    // 5. Use valid status value for failure
    if (process?.id) {
      await tx.processInstance.update({
        where: { id: process.id },
        data: {
          status: "REJECTED", // Use existing enum value
          updatedAt: new Date(),
        },
      });
    }

    throw error;
  }
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
            queries: {
              where: {
                OR: [
                  { raisedById: userId },
                  { recirculationApprovals: { some: { approverId: userId } } },
                ],
              },
              select: { id: true, queryText: true, status: true },
            },
            recommendations: {
              where: {
                OR: [{ requestedById: userId }, { recommendedToId: userId }],
                status: "PENDING",
              },
              select: { id: true, remarks: true, status: true },
            },
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
        queries: step.process.queries.map((q) => ({
          id: q.id,
          queryText: q.queryText,
          status: q.status,
        })),
        recommendations: step.process.recommendations.map((r) => ({
          id: r.id,
          remarks: r.remarks,
          status: r.status,
        })),
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

export const complete_process_step = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { stepInstanceId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check for open queries
      const openQueries = await tx.processQuery.count({
        where: {
          stepInstanceId,
          status: { in: ["OPEN", "RECIRCULATION_PENDING"] },
        },
      });

      if (openQueries > 0) {
        throw new Error("Cannot complete step with open queries");
      }

      // 2. Complete the step
      const step = await handleProcessClaim(userData.id, stepInstanceId);

      // 3. Notify relevant users
      await tx.processNotification.create({
        data: {
          stepId: stepInstanceId,
          userId: userData.id,
          type: NotificationType.STEP_ASSIGNMENT,
          status: "COMPLETED",
          metadata: { action: "Step completed" },
        },
      });

      return step;
    });

    return res.status(200).json({
      message: "Process step completed successfully",
      stepId: result.id,
    });
  } catch (error) {
    console.error("Error completing process step:", error);
    return res.status(500).json({
      message: "Error completing process step",
      error: error.message,
    });
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
