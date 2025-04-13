import { verifyUser } from "../utility/verifyUser.js";

import { PrismaClient, AccessType } from "@prisma/client";

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

    prisma.$transaction(async (tx) => {
      // 1. Create Process Instance
      const process = await tx.processInstance.create({
        data: {
          workflowId,
          initiatorId,
          name: processName,
          status: "PENDING",
          currentStepId: null, // Set after creating steps
        },
      });

      // After creating the process instance
      await tx.processDocument.createMany({
        data: documentIds.map((docId) => ({
          processId: process.id,
          documentId: docId,
        })),
      });

      // 2. Get Workflow Steps
      const workflow = await tx.workflow.findUnique({
        where: { id: workflowId },
        include: { steps: { include: { assignments: true } } },
      });

      // 3. Process Each Step

      const step = workflow.steps[0];

      // Process Assignments
      for (const assignment of step.assignments) {
        console.log("assignment", assignment);
        await processAssignment(tx, process, step, assignment, documentIds);
      }

      // Set first step as current
      await tx.processInstance.update({
        where: { id: process.id },
        data: { currentStepId: step.id },
      });

      return process;
    });

    // Process each assignment individually

    return res.status(200).json({
      message: "Process initiated successfully",
    });
  } catch (error) {
    console.log("Error initiating the process", error);
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

async function processAssignment(tx, process, step, assignment, documentIds) {
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
      await handleDepartmentAssignment(tx, assignment, progress, documentIds);
      break;
    case "ROLE":
      await handleRoleAssignment(tx, assignment, progress, documentIds);
      break;
    case "USER":
      await handleUserAssignment(tx, assignment, progress, documentIds);
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
      },
    });
  }
}

// processViews.js
async function viewProcess(processId, userId) {
  // Get the process with related data
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
    },
  });

  if (!process) throw new Error("Process not found");

  // Get current user's roles and departments
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { select: { roleId: true } },
      branches: { select: { id: true } },
    },
  });

  if (!currentUser) throw new Error("User not found");

  // Process documents with access rights
  const documentsWithAccess = process.documents.map((pd) => {
    const accessTypes = new Set();

    pd.document.documentAccesses.forEach((access) => {
      if (
        access.userId === userId ||
        currentUser.roles.some((r) => r.roleId === access.roleId) ||
        currentUser.branches.some((b) => b.id === access.departmentId)
      ) {
        accessTypes.add(access.accessType);
      }
    });

    return {
      id: pd.document.id,
      name: pd.document.name,
      type: pd.document.type,
      access: Array.from(accessTypes),
    };
  });

  // Get earliest relevant timestamp
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
    toBePicked: toBePicked, // New property added here
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
    // 1. Claim the step with correct includes
    const step = await tx.processStepInstance.update({
      where: {
        id: stepInstanceId,
        status: "PENDING",
        assignedTo: userId,
      },
      data: {
        status: "APPROVED",
        claimedAt: new Date(),
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

    // 2. Handle Role assignments: Delete other pending steps for the same assignment
    if (step.workflowAssignment.assigneeType === "ROLE") {
      // Delete all other pending steps for this assignment
      await tx.processStepInstance.deleteMany({
        where: {
          assignmentId: step.assignmentId,
          status: "PENDING",
          id: { not: step.id },
        },
      });

      // Delete related notifications
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

      // Mark assignment as completed
      await tx.assignmentProgress.update({
        where: { id: step.assignmentProgress.id },
        data: { completed: true },
      });
    }

    // 3. Handle department-specific tracking
    if (step.workflowAssignment.assigneeType === "DEPARTMENT") {
      // For parallel departments, track completed roles
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

    // 4. Check assignment and process completion
    await checkAssignmentCompletion(tx, step.assignmentProgress.id);
    await checkProcessProgress(tx, processId);

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
  // When querying process instances, you MUST include:
  const process = await prisma.processInstance.findUnique({
    where: { id: processId },
    include: {
      currentStep: true, // ← THIS WAS MISSING
      workflow: {
        include: {
          steps: {
            include: { assignments: true },
          },
        },
      },
    },
  });

  // Corrected: Use the right relation name (e.g., workflowAssignment)
  const currentStepAssignments = await tx.assignmentProgress.findMany({
    where: {
      processId,
      workflowAssignment: {
        // Adjusted relation name
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

    // Single optimized query with corrected relation inclusions
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
          },
        },
        workflowAssignment: {
          // Changed from 'assignment' to 'workflowAssignment'
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

    // Transform results with proper null safety
    const response = stepInstances.map((step) => {
      const escalationHours =
        step.workflowAssignment?.step?.escalationTime || 24; // Updated to workflowAssignment
      const assignedAt = step.deadline
        ? new Date(step.deadline.getTime() - escalationHours * 60 * 60 * 1000)
        : null;

      return {
        processId: step.process.id,
        processName: step.process?.name || "Unnamed Process",
        workflowName: step.process?.workflow?.name || "Unknown Workflow",
        initiatorUsername: step.process?.initiator?.username || "System User",
        createdAt: step.createdAt,
        actionType: step.workflowAssignment?.step?.stepType || "GENERAL", // Updated to workflowAssignment
        stepName: step.workflowAssignment?.step?.stepName || "Pending Step", // Updated to workflowAssignment
        currentStepAssignedAt: assignedAt,
        assignmentId: step.assignmentId,
        deadline: step.deadline,
      };
    });

    return res.json(response);
  } catch (error) {
    console.error("Error in get_user_processes:", {
      error: error.message,
      stack: error.stack,
    });
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

    // Call handleProcessClaim with userId and stepInstanceId
    const result = await handleProcessClaim(userData.id, stepInstanceId);

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
