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

// async function initiateProcess(workflowId, initiatorId, documentIds, name) {
//   return prisma.$transaction(async (tx) => {
//     // 1. Create ProcessInstance
//     const processInstance = await tx.processInstance.create({
//       data: {
//         workflowId,
//         initiatorId,
//         name,
//         status: "PENDING",
//       },
//     });

//     // 2. Link Documents to Process
//     await Promise.all(
//       documentIds.map((documentId) =>
//         tx.processDocument.create({
//           data: {
//             processId: processInstance.id,
//             documentId,
//           },
//         })
//       )
//     );

//     // 3. Get Next(Second) Workflow Step
//     const firstStep = await tx.workflowStep.findFirstOrThrow({
//       where: { workflowId, stepNumber: 1 },
//       include: { assignments: true },
//     });

//     // 4. Create Step Instance
//     const stepInstance = await tx.processStepInstance.create({
//       data: {
//         processId: processInstance.id,
//         stepId: firstStep.id,
//         status: "PENDING",
//       },
//     });

//     // 5. Configure Document Access
//     for (const assignment of firstStep.assignments) {
//       for (const assigneeId of assignment.assigneeIds) {
//         for (const accessType of assignment.accessTypes) {
//           for (const documentId of documentIds) {
//             const accessData = {
//               stepInstanceId: stepInstance.id,
//               assignmentId: assignment.id,
//               documentId,
//               accessType,
//               processId: processInstance.id,
//             };

//             switch (assignment.assigneeType) {
//               case "USER":
//                 accessData.userId = assigneeId;
//                 await tx.documentAccess.create({ data: accessData });
//                 break;
//               case "ROLE":
//                 accessData.roleId = assigneeId;
//                 await tx.documentAccess.create({ data: accessData });
//                 break;
//               case "DEPARTMENT":
//                 // DEPARTMENT case now uses selectedRoles instead of assigneeIds
//                 for (const roleId of assignment.selectedRoles) {
//                   await tx.documentAccess.create({
//                     data: {
//                       ...accessData,
//                       roleId: roleId, // Override with roleId
//                     },
//                   });
//                 }
//                 break;
//             }
//           }
//         }
//       }
//     }

//     // 6. Get Assignees for Notifications (existing logic)
//     const allAssignees = await Promise.all(
//       firstStep.assignments.map(async (assignment) => {
//         switch (assignment.assigneeType) {
//           case "USER":
//             return assignment.assigneeIds;
//           case "ROLE":
//             const usersWithRole = await tx.userRole.findMany({
//               where: { roleId: { in: assignment.assigneeIds } },
//               select: { userId: true },
//             });
//             return usersWithRole.map((uwr) => uwr.userId);
//           case "DEPARTMENT":
//             // Modified department case with role filtering
//             const usersWithRoles = await tx.userRole.findMany({
//               where: {
//                 AND: [
//                   { departmentId: { in: assignment.assigneeIds } },
//                   { roleId: { in: assignment.selectedRoles } },
//                 ],
//               },
//               select: { userId: true },
//             });
//             return [...new Set(usersWithRoles.map((uwr) => uwr.userId))];
//           default:
//             return [];
//         }
//       })
//     );

//     const uniqueAssignees = [...new Set(allAssignees.flat())];

//     // 7. Create Notifications (existing logic)
//     await Promise.all(
//       uniqueAssignees.map((userId) =>
//         tx.processNotification.create({
//           data: {
//             stepId: stepInstance.id,
//             userId,
//           },
//         })
//       )
//     );

//     // 8. Set Up Escalations (existing logic)
//     // if (firstStep.escalationTime) {
//     //   await tx.escalation.create({
//     //     data: {
//     //       stepInstanceId: stepInstance.id,
//     //       escalationType: "REMINDER",
//     //       triggerTime: new Date(
//     //         Date.now() + firstStep.escalationTime * 60 * 60 * 1000
//     //       ),
//     //     },
//     //   });
//     // }

//     // if (firstStep.autoApprovalAfter) {
//     //   await tx.escalation.create({
//     //     data: {
//     //       stepInstanceId: stepInstance.id,
//     //       escalationType: "AUTO_APPROVAL",
//     //       triggerTime: new Date(
//     //         Date.now() + firstStep.autoApprovalAfter * 60 * 60 * 1000
//     //       ),
//     //     },
//     //   });
//     // }

//     // // 9. Track Process Initiation (existing logic)
//     // await tx.processTracking.create({
//     //   data: {
//     //     processId: processInstance.id,
//     //     userId: initiatorId,
//     //     actionType: "APPROVAL",
//     //   },
//     // });

//     // 10. Send Notifications (existing logic)
//     // const usersToNotify = await tx.user.findMany({
//     //   where: { id: { in: uniqueAssignees } },
//     // });

//     // usersToNotify.forEach((user) => {
//     //   sendEmailNotification({
//     //     email: user.email,
//     //     subject: "New Process Assignment",
//     //     content: `You've been assigned to step ${firstStep.stepName} in process ${processInstance.id}`,
//     //   });
//     // });

//     return processInstance;
//   });
// }

export const initiate_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { processName, description, workflowId, documents } = req.body;
    const initiator = userData.id;

    // Get workflow with first step and assignments
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          orderBy: { stepNumber: "asc" },
          take: 1,
          include: {
            assignments: {
              include: {
                departmentRoles: {
                  include: {
                    department: true,
                    role: {
                      include: {
                        users: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const firstStep = workflow.steps[0];
    if (!firstStep) {
      return res.status(400).json({ message: "Workflow has no steps" });
    }

    // Create Process Instance
    const processInstance = await prisma.processInstance.create({
      data: {
        name: processName,
        workflowId: workflowId,
        initiatorId: userData.id,
        currentStepId: firstStep.id,
        documents: {
          create: documents.map((doc) => ({
            documentId: doc.documentId,
          })),
        },
      },
    });

    // Process each assignment individually
    const stepInstances = [];
    for (const assignment of firstStep.assignments) {
      let assigneeIds = [];

      // Resolve assignees based on assignment type
      switch (assignment.assigneeType) {
        case "USER":
          assigneeIds = assignment.assigneeIds;
          break;
        case "ROLE":
          const roleUsers = await prisma.userRole.findMany({
            where: { roleId: { in: assignment.assigneeIds } },
            select: { userId: true },
          });
          assigneeIds = roleUsers.map((ru) => ru.userId);
          break;
        case "DEPARTMENT":
          const deptUsers = await prisma.user.findMany({
            where: {
              branches: { some: { id: { in: assignment.assigneeIds } } },
            },
          });
          assigneeIds = deptUsers.map((du) => du.id);
          break;
        default:
          break;
      }

      // Create step instances for each resolved user in this assignment
      for (const userId of assigneeIds) {
        const stepInstance = await prisma.processStepInstance.create({
          data: {
            processId: processInstance.id,
            stepId: firstStep.id,
            assignmentId: assignment.id, // Link to specific workflow assignment
            assignedTo: userId,
            status: "PENDING",
            deadline: new Date(
              Date.now() + (firstStep.escalationTime || 24) * 60 * 60 * 1000
            ),
          },
        });

        // Create document accesses for this assignment
        await prisma.documentAccess.createMany({
          data: documents.map((doc) => ({
            documentId: doc.documentId,
            stepInstanceId: stepInstance.id,
            accessType: "EDIT",
            assignmentId: assignment.id, // Use current assignment ID
            processId: processInstance.id,
            userId: userId,
          })),
        });

        // Create notifications
        await prisma.processNotification.create({
          data: {
            stepId: stepInstance.id,
            userId: userId,
            status: "ACTIVE",
          },
        });

        stepInstances.push(stepInstance);
      }
    }

    return res.status(200).json({
      message: "Process initiated successfully",
      processId: processInstance.id,
      stepCount: stepInstances.length,
    });
  } catch (error) {
    console.log("Error initiating the process", error);
    return res.status(500).json({
      message: "Error initiating the process",
      error: error.message,
    });
  }
};

async function initiateProcess(workflowId, initiatorId, documentIds, name) {
  return prisma.$transaction(async (tx) => {
    // 1. Create Process Instance
    const process = await tx.processInstance.create({
      data: {
        workflowId,
        initiatorId,
        name,
        status: "PENDING",
        currentStepId: null, // Set after creating steps
      },
    });

    // 2. Get Workflow Steps
    const workflow = await tx.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: { include: { assignments: true } } },
    });

    // 3. Process Each Step
    for (const [index, step] of workflow.steps.entries()) {
      const isFirstStep = index === 0;

      // Create Step Instances
      const stepInstance = await tx.workflowStep.update({
        where: { id: step.id },
        data: { processId: process.id },
      });

      // Process Assignments
      for (const assignment of step.assignments) {
        await processAssignment(tx, process, step, assignment, documentIds);
      }

      // Set first step as current
      if (isFirstStep) {
        await tx.processInstance.update({
          where: { id: process.id },
          data: { currentStepId: step.id },
        });
      }
    }

    return process;
  });
}

async function processAssignment(tx, process, step, assignment, documentIds) {
  // Create Assignment Progress
  const progress = await tx.assignmentProgress.create({
    data: {
      assignmentId: assignment.id,
      processId: process.id,
      roleHierarchy: assignment.allowParallel
        ? null
        : await buildRoleHierarchy(assignment),
      completed: false,
    },
  });

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

      // 🔥 THIS IS WHERE THE PARALLEL ACCESS CODE GOES 🔥
      if (assignment.allowParallel) {
        await tx.documentAccess.createMany({
          data: documentIds.map((docId) => ({
            documentId: docId,
            stepInstanceId: stepInstance.id,
            accessType: "EDIT",
            processId: progress.processId,
            roleId: roleId, // Critical for parallel tracking
            departmentId: user.departmentId,
          })),
        });
      } else {
        // For hierarchical access (without role restriction)
        await tx.documentAccess.createMany({
          data: documentIds.map((docId) => ({
            documentId: docId,
            stepInstanceId: stepInstance.id,
            accessType: "EDIT",
            processId: progress.processId,
            departmentId: user.departmentId,
          })),
        });
      }

      // Create notification
      await tx.processNotification.create({
        data: {
          stepInstanceId: stepInstance.id,
          userId: user.userId,
          status: "ACTIVE",
        },
      });
    }
  }
}

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
  const process = await tx.processInstance.findUnique({
    where: { id: processId },
    include: { workflow: { include: { steps: true } } },
  });

  // Check current step completion
  const currentStepAssignments = await tx.assignmentProgress.findMany({
    where: {
      processId,
      assignment: { stepId: process.currentStepId },
    },
  });

  const allCompleted = currentStepAssignments.every((a) => a.completed);

  if (allCompleted) {
    await advanceToNextStep(tx, process);
  }
}

async function advanceToNextStep(tx, process) {
  const nextStep = process.workflow.steps.find(
    (s) => s.stepNumber === process.currentStep.stepNumber + 1
  );

  if (nextStep) {
    // Update process current step
    await tx.processInstance.update({
      where: { id: process.id },
      data: { currentStepId: nextStep.id },
    });

    // Initialize next step assignments
    for (const assignment of nextStep.assignments) {
      await processAssignment(tx, process, nextStep, assignment);
    }
  } else {
    await tx.processInstance.update({
      where: { id: process.id },
      data: { status: "COMPLETED" },
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
        createdAt: step.process.createdAt,
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
