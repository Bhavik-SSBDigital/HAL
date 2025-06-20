import { verifyUser } from "../utility/verifyUser.js";

import pkg from "@prisma/client";
const {
  PrismaClient,
  AccessType,
  NotificationType,
  ProcessStatus,
  StepStatus,
} = pkg;

const prisma = new PrismaClient();

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
        status: { in: ["IN_PROGRESS", "IN_PROGRESS"] },
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
    const documentIds =
      req.body.documents?.map((item) => item.documentId) || [];

    if (documentIds.length === 0) {
      return res.status(400).json({
        message: "Documents are required to initiate a process",
      });
    }

    const initiatorId = userData.id;

    const process = await prisma.$transaction(async (tx) => {
      // 1. Create Process Instance
      const process_ = await tx.processInstance.create({
        data: {
          workflowId,
          initiatorId,
          name: processName,
          status: "IN_PROGRESS",
          currentStepId: null,
        },
      });

      // 2. Link documents
      await tx.processDocument.createMany({
        data: documentIds.map((docId) => ({
          processId: process_.id,
          documentId: docId,
        })),
      });

      // 3. Get Workflow Steps
      const workflow = await tx.workflow.findUnique({
        where: { id: workflowId },
        include: { steps: { include: { assignments: true } } },
      });

      if (!workflow || !workflow.steps.length) {
        throw new Error("Workflow or steps not found");
      }

      // 4. Process First Step
      const step = workflow.steps[0];

      for (const assignment of step.assignments) {
        await processAssignment(
          tx,
          process_,
          step,
          assignment,
          documentIds,
          false,
          true,
          workflowId
        );
      }

      // 5. Set first step as current
      await tx.processInstance.update({
        where: { id: process_.id },
        data: { currentStepId: step.id, status: "IN_PROGRESS" },
      });

      // 6. Create initial notifications (assuming this is handled elsewhere)
      return process_;
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
  process_,
  step,
  assignment,
  documentIds,
  isRecirculated,
  fromInitiator,
  workflowId
) {
  console.log("assignment called");
  // Create Assignment Progress
  // if (!fromInitiator) {
  const progress = await tx.assignmentProgress.create({
    data: {
      process: {
        connect: { id: process_.id }, // Connect to existing ProcessInstance
      },
      workflowAssignment: {
        connect: { id: assignment.id }, // Connect to existing WorkflowAssignment
      },
      roleHierarchy: assignment.allowParallel
        ? await buildRoleHierarchy(assignment)
        : null,
      completed: false,
    },
  });
  // }

  // Create Initial Step Instances
  switch (assignment.assigneeType) {
    case "DEPARTMENT":
      await handleDepartmentAssignment(
        tx,
        assignment,
        progress,
        documentIds,
        step,
        fromInitiator,
        workflowId
      );
      break;
    case "ROLE":
      await handleRoleAssignment(
        tx,
        assignment,
        progress,
        documentIds,
        step,
        fromInitiator,
        workflowId
      );
      break;
    case "USER":
      await handleUserAssignment(
        tx,
        assignment,
        progress,
        documentIds,
        step,
        fromInitiator,
        workflowId
      );
      break;
  }
}

// Department Assignment Handler
async function handleDepartmentAssignment(
  tx,
  assignment,
  progress,
  documentIds,
  step
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
          status: "IN_PROGRESS",
          stepId: step.id,
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

async function handleUserAssignment(
  tx,
  assignment,
  progress,
  documentIds,
  step,
  fromInitiator,
  workflowId
) {
  console.log("user assignment called");
  // Direct assignment to specified users

  for (const userId of assignment.assigneeIds) {
    // Create step instance for user
    const stepInstance = fromInitiator
      ? await tx.processStepInstance.create({
          data: {
            processId: progress.processId,
            assignmentId: assignment.id,
            progressId: progress.id,
            assignedTo: userId,
            status: "APPROVED",
            stepId: step.id,
          },
        })
      : await tx.processStepInstance.create({
          data: {
            processId: progress.processId,
            assignmentId: assignment.id,
            progressId: progress.id,
            assignedTo: userId,
            status: "IN_PROGRESS",
            stepId: step.id,
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
    if (!fromInitiator) {
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
  if (fromInitiator) {
    const process = await tx.processInstance.findUnique({
      where: { id: progress.processId }, // Ensure progress.processId exists
    });

    const workflow = await tx.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: { include: { assignments: true } } },
    });

    // 4. Process Second Step
    const step = workflow.steps[1];

    for (const assignment of step.assignments) {
      await processAssignment(
        tx,
        process,
        step,
        assignment,
        documentIds,
        false,
        false,
        workflowId
      );
    }

    console.log("step", step);
    // 5. Set second step as current
    const updatedProcess = await tx.processInstance.update({
      where: { id: process.id },
      data: { currentStepId: step.id, status: "IN_PROGRESS" },
    });
    console.log("updated process", updatedProcess);
  }
}

async function handleRoleAssignment(
  tx,
  assignment,
  progress,
  documentIds,
  step
) {
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
        status: "IN_PROGRESS",
        stepId: step.id,
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
      return res.status(401).json({
        success: false,
        error: {
          message: "Unauthorized request",
          details: "Invalid or missing authorization token.",
          code: "UNAUTHORIZED",
        },
      });
    }

    const process = await prisma.processInstance.findUnique({
      where: { id: processId },
      include: {
        initiator: {
          select: { id: true, username: true, name: true, email: true },
        },
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
                    username: true,
                  },
                },
              },
            },
            rejections: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
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
            status: {
              in: [
                "IN_PROGRESS",
                "FOR_RECIRCULATION",
                "APPROVED",
                "FOR_RECOMMENDATION",
              ],
            },
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
            workflowAssignment: {
              include: {
                step: {
                  select: {
                    id: true,
                    stepName: true,
                    stepNumber: true,
                    stepType: true,
                  },
                },
              },
            },
            pickedBy: {
              select: {
                id: true,
                username: true,
              },
            },
            processQA: {
              where: {
                OR: [{ initiatorId: userData.id }, { entityId: userData.id }],
                status: "OPEN",
              },
              include: {
                initiator: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                process: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            recommendations: {
              include: {
                initiator: {
                  select: { id: true, username: true },
                },
                recommender: {
                  select: { id: true, username: true },
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
          details: "No process found with the specified ID.",
          code: "PROCESS_NOT_FOUND",
        },
      });
    }

    // Fetch assignee details for all assigneeIds in workflowAssignments
    const assigneeIds = [
      ...new Set(
        process.stepInstances.flatMap((step) =>
          step.workflowAssignment?.assigneeIds?.length
            ? step.workflowAssignment.assigneeIds
            : [step.assignedTo]
        )
      ),
    ];

    const assignees = await prisma.user.findMany({
      where: {
        id: { in: assigneeIds },
      },
      select: {
        id: true,
        username: true,
      },
    });

    // Map assignees to a lookup object for efficient access
    const assigneeMap = assignees.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Transform step instances to include stepName and assignees
    const steps = process.stepInstances.map((step) => {
      const assigneeIds = step.workflowAssignment?.assigneeIds?.length
        ? step.workflowAssignment.assigneeIds
        : [step.assignedTo];

      return {
        stepName: step.workflowAssignment?.step?.stepName ?? "Unknown Step",
        stepNumber: step.workflowAssignment?.step?.stepNumber ?? null,
        stepId: step.workflowAssignment?.step?.id ?? null,
        stepType: step.workflowAssignment?.step?.stepType ?? "UNKNOWN",
        assignees: assigneeIds.map((id) => ({
          assigneeId: id,
          assigneeName: assigneeMap[id]?.username ?? "Unknown User",
        })),
      };
    });

    const transformedDocuments = process.documents.map((doc) => {
      const signedBy = doc.signatures.map((sig) => ({
        signedBy: sig.user.username,
        signedAt: sig.signedAt ? sig.signedAt.toISOString() : null,
        remarks: sig.reason || null,
        byRecommender: sig.byRecommender,
        isAttachedWithRecommendation: sig.isAttachedWithRecommendation,
      }));

      // Transform rejections to maintain the same response structure
      const rejectionDetails =
        doc.rejections.length > 0
          ? {
              rejectedBy: doc.rejections[0].user.username,
              rejectionReason: doc.rejections[0].reason || null,
              rejectedAt: doc.rejections[0].rejectedAt
                ? doc.rejections[0].rejectedAt.toISOString()
                : null,
              byRecommender: doc.rejections[0].byRecommender,
              isAttachedWithRecommendation:
                doc.rejections[0].isAttachedWithRecommendation,
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

      const parts = doc.document.path.split("/"); // Split the path by "/"

      // Remove the last part (whether it’s a file name or folder name)
      parts.pop();

      const updatedPath = parts.join("/"); // Join the remaining parts back

      return {
        id: doc.document.id,
        name: doc.document.name,
        type: doc.document.type,
        path: updatedPath,
        tags: doc.document.tags,
        signedBy,
        rejectionDetails,
        documentHistory,
        isRecirculationTrigger: doc.documentHistory.some(
          (history) => history.isRecirculationTrigger
        ),
        access: doc.document.tags.includes("confidential")
          ? ["auditor"]
          : ["auditor", "manager"],
        approvalCount: signedBy.length,
      };
    });

    const queryDetails = await Promise.all(
      process.stepInstances.flatMap((step) =>
        step.processQA.map(async (qa) => {
          const documentHistoryIds = [
            ...(qa.details?.documentChanges?.map(
              (dc) => dc.documentHistoryId
            ) || []),
            ...(qa.details?.documentSummaries?.map(
              (ds) => ds.documentHistoryId
            ) || []),
          ];

          const documentHistories =
            documentHistoryIds.length > 0
              ? await prisma.documentHistory.findMany({
                  where: { id: { in: documentHistoryIds } },
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
                    replacedDocument: {
                      select: {
                        id: true,
                        name: true,
                        path: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        name: true,
                        username: true,
                      },
                    },
                  },
                })
              : [];

          return {
            stepInstanceId: step.id,
            stepName: step.workflowAssignment?.step?.stepName ?? null,
            stepNumber: step.workflowAssignment?.step?.stepNumber ?? null,
            status: step.status,
            taskType: qa.answer ? "RESOLVED" : "QUERY_UPLOAD",
            queryText: qa.question,
            answerText: qa.answer || null,
            initiatorName: qa.initiator.name,
            createdAt: qa.createdAt.toISOString(),
            answeredAt: qa.answeredAt ? qa.answeredAt.toISOString() : null,
            documentChanges:
              qa.details?.documentChanges?.map((dc) => {
                const history = documentHistories.find(
                  (h) => h.id === dc.documentHistoryId
                );
                return {
                  documentId: dc.documentId,
                  requiresApproval: dc.requiresApproval,
                  isReplacement: dc.isReplacement,
                  documentHistoryId: dc.documentHistoryId,
                  document: history?.document
                    ? {
                        id: history.document.id,
                        name: history.document.name,
                        type: history.document.type,
                        path: history.document.path,
                        tags: history.document.tags,
                      }
                    : null,
                  actionDetails: history?.actionDetails,
                  user: history?.user.name,
                  createdAt: history?.createdAt.toISOString(),
                  replacedDocument: history?.replacedDocument
                    ? {
                        id: history.replacedDocument.id,
                        name: history.replacedDocument.name,
                        path: history.replacedDocument.path,
                      }
                    : null,
                };
              }) || [],
            documentSummaries:
              qa.details?.documentSummaries?.map((ds) => {
                const history = documentHistories.find(
                  (h) => h.id === ds.documentHistoryId
                );
                return {
                  documentId: ds.documentId,
                  feedbackText: ds.feedbackText,
                  documentHistoryId: ds.documentHistoryId,
                  documentDetails: history?.document
                    ? {
                        id: history.document.id,
                        name: history.document.name,
                        path: history.document.path,
                      }
                    : null,
                  user: history?.user.username,
                  createdAt: history?.createdAt.toISOString(),
                };
              }) || [],
            assigneeDetails: qa.details?.assigneeDetails
              ? {
                  assignedStepName: qa.details.assigneeDetails.assignedStepName,
                  assignedAssigneeId:
                    qa.details.assigneeDetails.assignedAssigneeId,
                  assignedAssigneeName: qa.details.assigneeDetails
                    .assignedAssigneeId
                    ? (
                        await prisma.user.findUnique({
                          where: {
                            id: parseInt(
                              qa.details.assigneeDetails.assignedAssigneeId
                            ),
                          },
                          select: { username: true },
                        })
                      )?.username || null
                    : null,
                }
              : null,
          };
        })
      )
    );

    const recommendationDetails = await Promise.all(
      process.stepInstances.flatMap((step) =>
        step.recommendations.map(async (rec) => {
          const documentSummaries = rec.documentSummaries || [];
          console.log("rec", rec.details);
          const documentResponses = rec.details?.documentResponses || [];
          const documentIds = documentSummaries.map((ds) =>
            parseInt(ds.documentId)
          );
          const documents = documentIds.length
            ? await prisma.document.findMany({
                where: { id: { in: documentIds } },
                select: { id: true, name: true },
              })
            : [];

          const documentMap = documents.reduce((map, doc) => {
            map[doc.id] = doc.name;
            return map;
          }, {});

          console.log("doc summaries", documentSummaries);
          const documentDetails = documentSummaries.map((ds) => {
            const response = rec.details.documentResponses.find(
              (dr) => parseInt(dr.documentId) === parseInt(ds.documentId)
            );
            console.log("response", response);
            return {
              documentId: ds.documentId,
              documentName: documentMap[ds.documentId] || "Unknown Document",
              queryText: ds.queryText,
              answerText: response?.answerText || null,
            };
          });

          return {
            recommendationId: rec.id,
            stepInstanceId: step.id,
            stepName: step.workflowAssignment?.step?.stepName ?? null,
            stepNumber: step.workflowAssignment?.step?.stepNumber ?? null,
            status: rec.status,
            recommendationText: rec.recommendationText,
            responseText: rec.responseText || null,
            initiatorName: rec.initiator.username,
            recommenderName: rec.recommender.username,
            createdAt: rec.createdAt.toISOString(),
            respondedAt: rec.respondedAt ? rec.respondedAt.toISOString() : null,
            documentDetails,
          };
        })
      )
    );

    const toBePicked = process.stepInstances.some(
      (step) => step.assignedTo === userData.id && step.status === "IN_PROGRESS"
    );

    const workflow = {
      id: process.workflow.id,
      name: process.workflow.name,
      version: process.workflow.version,
    };

    return res.status(200).json({
      process: {
        processName: process.name,
        initiatorName: process.initiator.username,
        status: process.status,
        createdAt: process.createdAt,
        processId: process.id,
        processStepInstanceId:
          process.stepInstances.filter(
            (item) => item.status === "IN_PROGRESS"
          )[0]?.id || null,
        arrivedAt:
          process.stepInstances.filter(
            (item) => item.status === "IN_PROGRESS"
          )[0]?.updatedAt ||
          process.stepInstances.filter(
            (item) => item.status === "IN_PROGRESS"
          )[0]?.createdAt ||
          null,
        updatedAt: process.updatedAt,
        toBePicked,
        isRecirculated: process.isRecirculated,
        documents: transformedDocuments,
        steps,
        queryDetails,
        recommendationDetails,
        workflow,
      },
    });
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
async function handleProcessClaim(userId, stepInstanceId) {
  return prisma.$transaction(async (tx) => {
    // 2. Claim the step
    const step = await tx.processStepInstance.update({
      where: {
        id: stepInstanceId,
        status: "IN_PROGRESS",
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
          status: "IN_PROGRESS",
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
                  status: "IN_PROGRESS",
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
      status: "IN_PROGRESS",
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
          status: "IN_PROGRESS",
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
      status: "IN_PROGRESS",
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
            { status: { in: ["IN_PROGRESS", "IN_PROGRESS"] } },
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
            status: "IN_PROGRESS",
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
        status: "IN_PROGRESS",
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
            //     status: "IN_PROGRESS",
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

    //3a63-43a8-8a2e-780d468ac107

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate step instance

      const stepInstance = await tx.processStepInstance.findUnique({
        where: {
          id: stepInstanceId,
          assignedTo: userData.id,
          status: "IN_PROGRESS",
        },
        include: {
          process: {
            include: {
              currentStep: true, // Ensure 'currentStep' is a valid relation in your Prisma schema
            },
          },
          workflowStep: true,
        },
      });

      if (!stepInstance) {
        throw new Error("Invalid step instance or user not assigned");
      }

      if (stepInstance.status === "FOR_RECIRCULATION") {
        throw new Error("Cannot complete step until recirculation is resolved");
      }

      // 2. Mark step as APPROVED
      const updatedStepInstance = await tx.processStepInstance.update({
        where: { id: stepInstanceId },
        data: {
          status: "APPROVED",
          decisionAt: new Date(),
        },
      });
      console.log("upgraded step instance", updatedStepInstance);

      // 3. Check if all assignments for this step are complete
      const incompleteAssignments = await tx.processStepInstance.findMany({
        where: {
          processId: stepInstance.processId,
          workflowStepId: stepInstance.workflowStepId,
          status: { not: "APPROVED" },
          OR: [
            { pickedById: { not: null } },
            { claimedAt: { not: null } },
            { status: { in: ["IN_PROGRESS", "IN_PROGRESS"] } },
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
            where: { id: stepInstance.stepId },
          });

          const nextStep = await tx.workflowStep.findFirst({
            where: {
              workflowId: stepInstance.process.workflowId,
              stepNumber: { gt: currentStep.stepNumber },
            },
            include: {
              assignments: true,
            },
            orderBy: { stepNumber: "asc" },
          });

          if (nextStep) {
            // 6. Reset FOR_RECIRCULATION steps to IN_PROGRESS
            const forRecirculationSteps = await tx.processStepInstance.findMany(
              {
                where: {
                  processId: stepInstance.process.id,
                  stepId: nextStep.id,
                  status: {
                    in: ["APPROVED", "FOR_RECIRCULATION"],
                  },
                },
              }
            );

            if (forRecirculationSteps && forRecirculationSteps.length > 0) {
              for (const recircStep of forRecirculationSteps) {
                await tx.processStepInstance.update({
                  where: { id: recircStep.id },
                  data: {
                    status: "IN_PROGRESS",
                    recirculationReason: null,
                  },
                });

                await tx.processNotification.create({
                  data: {
                    stepId: recircStep.id,
                    userId: recircStep.assignedTo,
                    type: "STEP_ASSIGNMENT",
                    status: "ACTIVE",
                    metadata: { processId: stepInstance.processId },
                  },
                });
              }
            } else {
              const process = await tx.processInstance.findUnique({
                where: { id: stepInstance.processId },
                include: { documents: true },
              });
              const docsIds = process.documents.map((doc) => doc.documentId);

              for (const assignment of nextStep.assignments) {
                await processAssignment(
                  tx,
                  process,
                  nextStep,
                  assignment,
                  docsIds,
                  false
                );
              }
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
      status: "IN_PROGRESS",
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
      queryRaiserStepInstanceId,
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
        include: {
          process: true,
          workflowAssignment: {
            include: {
              step: {
                select: {
                  id: true,
                  stepName: true,
                  stepNumber: true,
                  stepType: true,
                },
              },
            },
          },
        },
      });

      if (!stepInstance) {
        throw new Error("Invalid step instance or user not assigned");
      }

      // 2. Check if this is a delegated upload task
      let isDelegatedTask;

      if (queryRaiserStepInstanceId) {
        isDelegatedTask = await tx.processQA.findFirst({
          where: {
            stepInstanceId: queryRaiserStepInstanceId,
            status: "OPEN",
          },
        });
      }

      // Prepare details for ProcessQA
      const qaDetails = {
        documentChanges: [],
        documentSummaries: [],
        assigneeDetails:
          assignedStepName && assignedAssigneeId
            ? { assignedStepName, assignedAssigneeId }
            : null,
      };

      let processQA;

      if (!isDelegatedTask) {
        // 3. Create ProcessQA for non-delegated tasks
        processQA = await tx.processQA.create({
          data: {
            processId,
            stepInstanceId,
            initiatorId: userData.id,
            entityId: parseInt(assignedAssigneeId) || userData.id,
            entityType: assignedAssigneeId
              ? "USER"
              : stepInstance.workflowAssignment.assigneeType,
            question: queryText,
            createdAt: new Date(),
            details: qaDetails,
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
            details: qaDetails,
          },
        });
      }

      // 4. Handle document changes (Case 1)
      // 4. Handle document changes (Case 1)
      const documentHistoryEntries = [];
      for (const change of documentChanges) {
        const {
          documentId,
          requiresApproval,
          isReplacement,
          replacesDocumentId,
        } = change;

        // Validate the new document
        const document = await tx.document.findUnique({
          where: { id: documentId },
        });
        if (!document) {
          throw new Error(`Document ${documentId} not found`);
        }

        // Validate the replaced document if isReplacement is true
        let replacedDocument = null;
        if (isReplacement) {
          if (!replacesDocumentId) {
            throw new Error(
              `replacesDocumentId is required when isReplacement is true for document ${documentId}`
            );
          }
          replacedDocument = await tx.document.findUnique({
            where: { id: parseInt(replacesDocumentId) },
          });
          if (!replacedDocument) {
            throw new Error(
              `Replaced document ${replacesDocumentId} not found`
            );
          }
        }

        // Create ProcessDocument entry
        const processDocument = await tx.processDocument.create({
          data: {
            processId,
            documentId,
            isReplacement,
            replacedDocumentId: isReplacement
              ? parseInt(replacesDocumentId)
              : null,
          },
        });

        // Create DocumentHistory entry
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
              originalDocumentId: isReplacement
                ? parseInt(replacesDocumentId)
                : null,
            },
            isRecirculationTrigger: true,
            createdAt: new Date(),
            processDocumentId: processDocument.id,
            replacedDocumentId: isReplacement
              ? parseInt(replacesDocumentId)
              : null,
          },
        });

        documentHistoryEntries.push(history);
        qaDetails.documentChanges.push({
          documentId,
          requiresApproval,
          isReplacement,
          replacesDocumentId: isReplacement
            ? parseInt(replacesDocumentId)
            : null,
          documentHistoryId: history.id,
        });

        // Ensure access for the new document
        await ensureDocumentAccessWithParents(tx, {
          documentId,
          userId: userData.id,
          stepInstanceId,
          processId,
          assignmentId: stepInstance.assignmentId,
          roleId: stepInstance.roleId,
          departmentId: stepInstance.departmentId,
        });

        // Ensure access for the replaced document (if applicable)
        if (isReplacement && replacedDocument) {
          await ensureDocumentAccessWithParents(tx, {
            documentId: parseInt(replacesDocumentId),
            userId: userData.id,
            stepInstanceId,
            processId,
            assignmentId: stepInstance.assignmentId,
            roleId: stepInstance.roleId,
            departmentId: stepInstance.departmentId,
          });
        }
      }

      // 5. Handle document summaries/feedback (Case 2)
      for (const summary of documentSummaries) {
        const { documentId, feedbackText } = summary;
        const document = await tx.document.findUnique({
          where: { id: parseInt(documentId) },
        });
        if (!document) {
          throw new Error(`Document ${documentId} not found`);
        }

        const history = await tx.documentHistory.create({
          data: {
            documentId: parseInt(documentId),
            processId,
            stepInstanceId,
            userId: userData.id,
            actionType: "FEEDBACK",
            actionDetails: { feedbackText },
            isRecirculationTrigger: true,
            createdAt: new Date(),
          },
        });

        qaDetails.documentSummaries.push({
          documentId,
          feedbackText,
          documentHistoryId: history.id,
        });
      }

      // Update ProcessQA with document details
      if (
        qaDetails.documentChanges.length > 0 ||
        qaDetails.documentSummaries.length > 0
      ) {
        await tx.processQA.update({
          where: { id: processQA.id },
          data: { details: qaDetails },
        });
      }

      // 6. Update step instance status
      if (isDelegatedTask && documentChanges.length > 0) {
        // For delegated upload tasks with documents, mark as APPROVED

        // 9. Reset first step instances for engaged assignees
        const firstStep = await tx.workflowStep.findFirst({
          where: { workflowId: stepInstance.process.workflowId },
          orderBy: { stepNumber: "asc" },
        });

        const engagedStepInstances = await tx.processStepInstance.findMany({
          where: {
            processId,
            stepId: firstStep.id,
            OR: [
              { pickedById: { not: null } },
              { claimedAt: { not: null } },
              { status: { in: ["APPROVED"] } },
            ],
          },
        });

        for (const instance of engagedStepInstances) {
          const instanceUpdated = await tx.processStepInstance.update({
            where: { id: instance.id },
            data: {
              status: "IN_PROGRESS",
              isRecirculated: true,
              recirculationReason: queryText,
              claimedAt: null,
              pickedById: null,
              recirculationCycle: { increment: 1 },
            },
          });

          await tx.processNotification.create({
            data: {
              stepId: instance.id,
              userId: instance.assignedTo,
              type: "DOCUMENT_QUERY",
              status: "ACTIVE",
              metadata: { queryText, processId },
            },
          });
        }

        await tx.processStepInstance.update({
          where: { id: stepInstanceId },
          data: {
            status: "APPROVED",
            decisionAt: new Date(),
            isRecirculated: true,
            recirculationReason: queryText,
          },
        });

        await tx.processInstance.update({
          where: { id: stepInstance.processId },
          data: {
            currentStepId: firstStep.id,
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
      // await tx.processInstance.update({
      //   where: { id: processId },
      //   data: { isRecirculated: true },
      // });

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
            stepId: workflowStep.id,
            assignmentId: stepInstance.assignmentId,
            assignedTo: parseInt(assignedAssigneeId),
            status: "IN_PROGRESS",
            createdAt: new Date(),
            deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });

        await tx.processNotification.create({
          data: {
            stepId: newStepInstance.id,
            userId: parseInt(assignedAssigneeId),
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
          status: "IN_PROGRESS",
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
          stepId: { not: stepInstanceId },
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
            status: "IN_PROGRESS",
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

export const createRecommendation = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const {
      processId,
      stepInstanceId,
      recommendationText,
      documentSummaries = [],
      recommenderUsername,
    } = req.body;

    if (
      !processId ||
      !stepInstanceId ||
      !recommendationText ||
      !recommenderUsername
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: processId, stepInstanceId, recommendationText, recommenderUsername",
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
        include: {
          process: true,
        },
      });

      if (!stepInstance) {
        throw new Error("Invalid step instance or user not assigned");
      }

      // 2. Validate recommender
      const recommender = await tx.user.findUnique({
        where: { username: recommenderUsername },
        select: { id: true },
      });

      if (!recommender) {
        throw new Error(
          `Recommender with username ${recommenderUsername} not found`
        );
      }

      // 3. Validate document summaries
      for (const summary of documentSummaries) {
        const { documentId, queryText, requiresApproval } = summary;
        if (!documentId || !queryText || requiresApproval === undefined) {
          throw new Error(
            "Invalid document summary: documentId, queryText, and requiresApproval are required"
          );
        }
        const document = await tx.document.findUnique({
          where: { id: parseInt(documentId) },
        });
        if (!document) {
          throw new Error(
            `Document ${`One with ID ${documentId} not found`} not found`
          );
        }
      }

      // 4. Create Recommendation entry
      const recommendation = await tx.recommendation.create({
        data: {
          processId,
          stepInstanceId,
          initiatorId: userData.id,
          recommenderId: recommender.id,
          recommendationText,
          documentSummaries,
          status: "OPEN",
          createdAt: new Date(),
        },
      });

      // 5. Update step instance status to FOR_RECOMMENDATION
      await tx.processStepInstance.update({
        where: { id: stepInstanceId },
        data: {
          status: "FOR_RECOMMENDATION",
        },
      });

      // 6. Create notification for the recommender
      await tx.processNotification.create({
        data: {
          stepId: stepInstanceId,
          userId: recommender.id,
          type: "DOCUMENT_QUERY", // Reusing DOCUMENT_QUERY type for consistency
          status: "ACTIVE",
          metadata: { recommendationText, processId },
        },
      });

      return recommendation;
    });

    return res.status(200).json({
      message: "Recommendation request submitted successfully",
      recommendationId: result.id,
    });
  } catch (error) {
    console.error("Error creating recommendation:", error);
    return res.status(500).json({
      message: "Error creating recommendation",
      error: error.message,
    });
  }
};

export const signAsRecommender = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { recommendationId, documentId, reason } = req.body;

    if (!recommendationId || !documentId) {
      return res.status(400).json({
        message: "Missing required fields: recommendationId, documentId",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate recommendation and user
      const recommendation = await tx.recommendation.findUnique({
        where: { id: recommendationId },
        include: { process: true },
      });

      if (!recommendation) {
        throw new Error("Recommendation not found");
      }

      if (recommendation.recommenderId !== userData.id) {
        throw new Error("User is not the assigned recommender");
      }

      if (recommendation.status !== "OPEN") {
        throw new Error("Recommendation is not open for signing");
      }

      // 2. Validate document and ensure it requires approval
      const documentSummary = recommendation.documentSummaries?.find(
        (ds) =>
          parseInt(ds.documentId) === parseInt(documentId) &&
          ds.requiresApproval
      );

      if (!documentSummary) {
        throw new Error(
          `Document ${documentId} does not require approval or is not part of this recommendation`
        );
      }

      // 3. Find or create ProcessDocument
      let processDocument = await tx.processDocument.findFirst({
        where: {
          processId: recommendation.processId,
          documentId: parseInt(documentId),
        },
      });

      if (!processDocument) {
        processDocument = await tx.processDocument.create({
          data: {
            processId: recommendation.processId,
            documentId: parseInt(documentId),
          },
        });
      }

      // 4. Create DocumentSignature with recommender flags
      const signature = await tx.documentSignature.create({
        data: {
          processDocumentId: processDocument.id,
          userId: userData.id,
          reason: reason || "Signed as recommender",
          signedAt: new Date(),
          byRecommender: true,
          isAttachedWithRecommendation: false, // Will be updated to true in response
        },
      });

      // 5. Create DocumentHistory entry
      await tx.documentHistory.create({
        data: {
          documentId: parseInt(documentId),
          processId: recommendation.processId,
          stepInstanceId: recommendation.stepInstanceId,
          userId: userData.id,
          actionType: "SIGNED",
          actionDetails: {
            reason: reason || "Signed as recommender",
            byRecommender: true,
          },
          createdAt: new Date(),
          processDocumentId: processDocument.id,
        },
      });

      return signature;
    });

    return res.status(200).json({
      message: "Document signed successfully by recommender",
      signatureId: result.id,
    });
  } catch (error) {
    console.error("Error signing as recommender:", error);
    return res.status(500).json({
      message: "Error signing document",
      error: error.message,
    });
  }
};

export const submitRecommendationResponse = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { recommendationId, responseText, documentResponses = [] } = req.body;

    if (!recommendationId || !responseText) {
      return res.status(400).json({
        message: "Missing required fields: recommendationId, responseText",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate recommendation and user
      const recommendation = await tx.recommendation.findUnique({
        where: { id: recommendationId },
        include: { process: true, stepInstance: true },
      });

      if (!recommendation) {
        throw new Error("Recommendation not found");
      }

      if (recommendation.recommenderId !== userData.id) {
        throw new Error("User is not the assigned recommender");
      }

      if (recommendation.status !== "OPEN") {
        throw new Error("Recommendation is already resolved");
      }

      // 2. Validate document responses
      for (const response of documentResponses) {
        const { documentId, answerText } = response;
        if (!documentId || !answerText) {
          throw new Error(
            "Invalid document response: documentId and answerText are required"
          );
        }
        const documentSummary = recommendation.documentSummaries?.find(
          (ds) => parseInt(ds.documentId) === parseInt(documentId)
        );
        if (!documentSummary) {
          throw new Error(
            `Document ${documentId} is not part of this recommendation`
          );
        }
      }

      // 3. Find and attach signatures
      const signatures = await tx.documentSignature.findMany({
        where: {
          processDocument: {
            processId: recommendation.processId,
            documentId: {
              in: recommendation.documentSummaries.map((ds) =>
                parseInt(ds.documentId)
              ),
            },
          },
          userId: userData.id,
          byRecommender: true,
          isAttachedWithRecommendation: false,
        },
      });

      for (const signature of signatures) {
        await tx.documentSignature.update({
          where: { id: signature.id },
          data: { isAttachedWithRecommendation: true },
        });
      }

      // 4. Create document history for responses
      const documentHistoryEntries = [];
      for (const response of documentResponses) {
        const { documentId, answerText } = response;
        const history = await tx.documentHistory.create({
          data: {
            documentId: parseInt(documentId),
            processId: recommendation.processId,
            stepInstanceId: recommendation.stepInstanceId,
            userId: userData.id,
            actionType: "FEEDBACK",
            actionDetails: { answerText, byRecommender: true },
            createdAt: new Date(),
          },
        });
        documentHistoryEntries.push(history);
      }

      // 5. Update Recommendation with response
      const updatedRecommendation = await tx.recommendation.update({
        where: { id: recommendationId },
        data: {
          responseText,
          details: { documentResponses },
          status: "RESOLVED",
          respondedAt: new Date(),
        },
      });

      // 6. Unfreeze the step instance
      await tx.processStepInstance.update({
        where: { id: recommendation.stepInstanceId },
        data: { status: "IN_PROGRESS" },
      });

      // 7. Create notification for the initiator
      await tx.processNotification.create({
        data: {
          stepId: recommendation.stepInstanceId,
          userId: recommendation.initiatorId,
          type: "DOCUMENT_QUERY",
          status: "ACTIVE",
          metadata: { responseText, processId: recommendation.processId },
        },
      });

      return { recommendation: updatedRecommendation, documentHistoryEntries };
    });

    return res.status(200).json({
      message: "Recommendation response submitted successfully",
      recommendationId: result.recommendation.id,
    });
  } catch (error) {
    console.error("Error submitting recommendation response:", error);
    return res.status(500).json({
      message: "Error submitting recommendation response",
      error: error.message,
    });
  }
};

export const get_recommendations = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized" || !userData?.id) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Unauthorized request",
          details: "Invalid or missing authorization token.",
          code: "UNAUTHORIZED",
        },
      });
    }

    const recommendations = await prisma.recommendation.findMany({
      where: {
        recommenderId: userData.id,
        status: "OPEN",
      },
      include: {
        process: {
          select: { id: true, name: true },
        },
        initiator: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedRecommendations = recommendations.map((rec) => ({
      recommendationId: rec.id,
      processId: rec.processId,
      processName: rec.process.name,
      initiatorUsername: rec.initiator.username,
      recommendationText: rec.recommendationText,
      createdAt: rec.createdAt.toISOString(),
    }));

    return res.status(200).json({
      success: true,
      recommendations: formattedRecommendations,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch recommendations",
        details: error.message,
        code: "RECOMMENDATIONS_FETCH_ERROR",
      },
    });
  }
};

export const get_recommendation = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized" || !userData?.id) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Unauthorized request",
          details: "Invalid or missing authorization token.",
          code: "UNAUTHORIZED",
        },
      });
    }

    const { recommendationId } = req.params;

    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        process: {
          select: { id: true, name: true },
        },
        initiator: {
          select: { id: true, username: true },
        },
      },
    });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Recommendation not found",
          details: "No recommendation found with the specified ID.",
          code: "RECOMMENDATION_NOT_FOUND",
        },
      });
    }

    if (recommendation.recommenderId !== userData.id) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Forbidden",
          details: "User is not the assigned recommender.",
          code: "FORBIDDEN",
        },
      });
    }

    // Fetch document names for documentSummaries
    const documentSummaries = recommendation.documentSummaries || [];
    const documentIds = documentSummaries.map((ds) => parseInt(ds.documentId));
    const documents = documentIds.length
      ? await prisma.document.findMany({
          where: { id: { in: documentIds } },
          select: { id: true, name: true, path: true },
        })
      : [];

    const documentMap = documents.reduce((map, doc) => {
      map[doc.id] = { name: doc.name, path: doc.path };
      return map;
    }, {});

    const formattedDocumentSummaries = documentSummaries.map((ds) => ({
      documentId: ds.documentId,
      documentName: documentMap[ds.documentId]?.name || "Unknown Document",
      documentPath:
        documentMap[ds.documentId]?.path.substring(
          0,
          documentMap[ds.documentId]?.path.lastIndexOf("/")
        ) || "Unknown Path",
      queryText: ds.queryText,
      requiresApproval: ds.requiresApproval,
    }));

    return res.status(200).json({
      success: true,
      recommendation: {
        recommendationId: recommendation.id,
        processId: recommendation.processId,
        processName: recommendation.process.name,
        initiatorUsername: recommendation.initiator.username,
        recommendationText: recommendation.recommendationText,
        documentSummaries: formattedDocumentSummaries,
        status: recommendation.status,
        createdAt: recommendation.createdAt.toISOString(),
        responseText: recommendation.responseText || null,
        respondedAt: recommendation.respondedAt
          ? recommendation.respondedAt.toISOString()
          : null,
        documentResponses: recommendation.details?.documentResponses || [],
      },
    });
  } catch (error) {
    console.error("Error fetching recommendation:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch recommendation",
        details: error.message,
        code: "RECOMMENDATION_FETCH_ERROR",
      },
    });
  }
};
