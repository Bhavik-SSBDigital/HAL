import { PrismaClient } from "@prisma/client";
import { verifyUser } from "../utility/verifyUser.js";
const prisma = new PrismaClient();

// Helper function to format timestamp
const formatDate = (date) => {
  return new Date(date).toLocaleString("en-US", { timeZone: "UTC" });
};

// Helper function to get assignment details for a process step instance
const getAssignmentDetails = async (processStepInstanceId, processId) => {
  try {
    if (!processStepInstanceId || typeof processStepInstanceId !== "string") {
      return {
        workflow: "Unknown",
        assignmentType: "Unknown",
        role: "N/A",
        department: "N/A",
      };
    }

    const stepInstance = await prisma.processStepInstance.findUnique({
      where: { id: processStepInstanceId },
      include: {
        workflowStep: {
          include: {
            workflow: true,
          },
        },
        process: true,
        workflowAssignment: {
          include: {
            departmentRoles: {
              include: {
                department: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!stepInstance)
      return {
        workflow: "Unknown",
        assignmentType: "Unknown",
        role: "N/A",
        department: "N/A",
      };

    const workflowName = stepInstance.workflowStep?.workflow?.name || "Unknown";
    const assignmentType =
      stepInstance.workflowAssignment?.assigneeType || "Unknown";
    let roleName = "N/A";
    let departmentName = "N/A";

    if (stepInstance.workflowAssignment?.departmentRoles?.length > 0) {
      const deptRole = stepInstance.workflowAssignment.departmentRoles[0];
      roleName = deptRole.role?.role || "N/A";
      departmentName = deptRole.department?.name || "N/A";
    } else if (stepInstance.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: stepInstance.roleId },
        select: { role: true },
      });
      roleName = role?.role || "N/A";
    } else if (stepInstance.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: stepInstance.departmentId },
        select: { name: true },
      });
      departmentName = department?.name || "N/A";
    }

    return {
      workflow: workflowName,
      assignmentType,
      role: roleName,
      department: departmentName,
    };
  } catch (error) {
    console.error("Error fetching assignment details:", error);
    return {
      workflow: "Unknown",
      assignmentType: "Unknown",
      role: "N/A",
      department: "N/A",
    };
  }
};

// Helper function to get user details
const getUserDetails = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, name: true },
    });
    return user
      ? `${user.name || user.username} (${user.username})`
      : "Unknown User";
  } catch (error) {
    console.error("Error fetching user details:", error);
    return "Unknown User";
  }
};

// Helper function to get document details
const getDocumentDetails = async (documentId) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { name: true, type: true, path: true, tags: true },
    });
    return document
      ? {
          name: document.name,
          type: document.type,
          path: document.path,
          tags: document.tags,
        }
      : { name: "Unknown", type: "Unknown", path: "N/A", tags: [] };
  } catch (error) {
    console.error("Error fetching document details:", error);
    return { name: "Unknown", type: "Unknown", path: "N/A", tags: [] };
  }
};

// Helper function to format path
export const make_path = (path_) => {
  const parts = path_.split("/");
  parts.pop();
  const updatedPath = parts.join("/");
  return updatedPath;
};

export const get_user_activity_log = async (req, res) => {
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

    const { processId, stepInstanceId } = req.params;

    const process = await prisma.processInstance.findUnique({
      where: { id: processId },
      select: {
        id: true,
        name: true,
        workflow: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!process) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Process not found",
          details: "Invalid process ID.",
          code: "NOT_FOUND",
        },
      });
    }

    let stepInstance = null;
    let timeStart = new Date(0);
    let timeEnd = new Date();

    if (stepInstanceId) {
      stepInstance = await prisma.processStepInstance.findUnique({
        where: { id: stepInstanceId },
        include: {
          process: { select: { id: true } },
          workflowStep: { select: { stepName: true, stepNumber: true } },
        },
      });

      if (!stepInstance || stepInstance.processId !== processId) {
        return res.status(404).json({
          success: false,
          error: {
            message: "Step instance not found",
            details: "Invalid step instance ID or process ID.",
            code: "NOT_FOUND",
          },
        });
      }

      timeStart = stepInstance.createdAt;
      timeEnd = stepInstance.decisionAt || new Date();
    }

    const isAssignee = stepInstance
      ? stepInstance.assignedTo === userData.id
      : await prisma.processStepInstance.findFirst({
          where: {
            processId,
            assignedTo: userData.id,
            OR: [{ status: "IN_PROGRESS" }, { status: "APPROVED" }],
          },
        });

    const isRecommender = await prisma.recommendation.findFirst({
      where: {
        processId,
        OR: [{ initiatorId: userData.id }, { recommenderId: userData.id }],
      },
    });

    const isQueryInvolved = await prisma.processQA.findFirst({
      where: {
        processId,
        OR: [
          { initiatorId: userData.id },
          { entityId: userData.id, status: "RESOLVED" },
        ],
      },
    });

    const isInitiator = await prisma.processInstance.findFirst({
      where: { id: processId, initiatorId: userData.id },
    });

    if (!isAssignee && !isRecommender && !isQueryInvolved && !isInitiator) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Forbidden",
          details: "User has no involvement in this process.",
          code: "FORBIDDEN",
        },
      });
    }

    const userStepInstances = await prisma.processStepInstance.findMany({
      where: {
        processId,
        assignedTo: userData.id,
        OR: [{ status: "IN_PROGRESS" }, { status: "APPROVED" }],
      },
      select: {
        id: true,
        createdAt: true,
        decisionAt: true,
        status: true,
        workflowStep: { select: { stepName: true, stepNumber: true } },
      },
    });

    const [
      documentSignatures,
      documentRejections,
      processDocuments,
      processQAs,
      recommendations,
      processInstance,
    ] = await Promise.all([
      prisma.documentSignature.findMany({
        where: {
          processDocument: { processId },
          userId: userData.id,
          signedAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          processDocument: {
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
            },
          },
          user: { select: { id: true, username: true } },
          processStepInstance: {
            select: {
              workflowStep: { select: { stepName: true, stepNumber: true } },
            },
          },
        },
      }),
      prisma.documentRejection.findMany({
        where: {
          processDocument: { processId },
          userId: userData.id,
          rejectedAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          processDocument: {
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
            },
          },
          user: { select: { id: true, username: true } },
          processStepInstance: {
            select: {
              workflowStep: { select: { stepName: true, stepNumber: true } },
            },
          },
        },
      }),
      prisma.processDocument.findMany({
        where: {
          processId,
          document: {
            createdById: userData.id,
            createdOn: { gte: timeStart, lte: timeEnd }, // Use createdOn
          },
        },
        include: {
          document: {
            select: {
              id: true,
              name: true,
              type: true,
              path: true,
              tags: true,
              createdById: true,
              createdOn: true,
            },
          },
        },
      }),
      prisma.processQA.findMany({
        where: {
          processId,
          OR: [
            { initiatorId: userData.id },
            { entityId: userData.id, status: "RESOLVED" },
          ],
          createdAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          initiator: { select: { id: true, name: true } },
          stepInstance: {
            include: {
              workflowStep: { select: { stepName: true, stepNumber: true } },
            },
          },
        },
      }),
      prisma.recommendation.findMany({
        where: {
          processId,
          OR: [{ initiatorId: userData.id }, { recommenderId: userData.id }],
          createdAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          initiator: { select: { id: true, username: true } },
          recommender: { select: { id: true, username: true } },
          process: { select: { id: true, name: true } },
          stepInstance: {
            include: {
              workflowStep: { select: { stepName: true, stepNumber: true } },
            },
          },
        },
      }),
      prisma.processInstance.findFirst({
        where: { id: processId, initiatorId: userData.id },
        select: {
          id: true,
          name: true,
          createdAt: true,
          initiator: { select: { username: true, id: true } },
        },
      }),
    ]);

    const getStepInstanceDetails = async (stepInstanceId) => {
      if (!stepInstanceId) return null;
      return await prisma.processStepInstance.findUnique({
        where: { id: stepInstanceId },
        include: {
          workflowStep: { select: { stepName: true, stepNumber: true } },
        },
      });
    };

    const activities = [].concat(
      ...(processInstance
        ? [
            {
              actionType: "PROCESS_INITIATED",
              description: `Initiated process "${processInstance.name}"`,
              createdAt: processInstance.createdAt.toISOString(),
              details: {
                processId: processInstance.id,
                processName: processInstance.name,
                initiatorName: await getUserDetails(
                  processInstance.initiator.id
                ),
                workflow: process.workflow?.name || "N/A",
                assignmentType: "N/A",
                role: "N/A",
                department: "N/A",
              },
            },
          ]
        : []),
      ...(await Promise.all(
        processDocuments.map(async (pd) => {
          const documentDetails = await getDocumentDetails(pd.documentId);
          const assignmentDetails = await getAssignmentDetails(
            pd.stepInstanceId,
            pd.processId
          );
          const stepInstance = pd.stepInstanceId
            ? await getStepInstanceDetails(pd.stepInstanceId)
            : null;
          return {
            actionType: "DOCUMENT_UPLOADED",
            description: `Uploaded document "${documentDetails.name}"`,
            createdAt: pd.document.createdOn.toISOString(), // Use createdOn
            details: {
              documentId: pd.documentId,
              name: documentDetails.name,
              type: documentDetails.type,
              path: make_path(documentDetails.path),
              tags: documentDetails.tags,
              uploadedBy: await getUserDetails(pd.document.createdById),
              stepInstanceId: pd.stepInstanceId || null,
              stepName: stepInstance?.workflowStep?.stepName || "N/A",
              workflow: assignmentDetails.workflow,
              assignmentType: assignmentDetails.assignmentType,
              role: assignmentDetails.role,
              department: assignmentDetails.department,
            },
          };
        })
      )),
      ...(await Promise.all(
        documentSignatures.map(async (sig) => {
          const documentDetails = await getDocumentDetails(
            sig.processDocument.documentId
          );
          const assignmentDetails = await getAssignmentDetails(
            sig.processStepInstanceId,
            sig.processDocument.processId
          );
          return {
            actionType: "DOCUMENT_SIGNED",
            description: `Signed "${documentDetails.name}"`,
            createdAt: sig.signedAt.toISOString(),
            details: {
              documentId: sig.processDocument.documentId,
              name: documentDetails.name,
              type: documentDetails.type,
              path: make_path(documentDetails.path),
              tags: documentDetails.tags,
              signedBy: await getUserDetails(sig.userId),
              signedAt: sig.signedAt.toISOString(),
              remarks: sig.reason || null,
              byRecommender: sig.byRecommender,
              isAttachedWithRecommendation: sig.isAttachedWithRecommendation,
              stepInstanceId: sig.processStepInstanceId || null,
              stepName:
                sig.processStepInstance?.workflowStep?.stepName || "N/A",
              workflow: assignmentDetails.workflow,
              assignmentType: assignmentDetails.assignmentType,
              role: assignmentDetails.role,
              department: assignmentDetails.department,
            },
          };
        })
      )),
      ...(await Promise.all(
        documentRejections.map(async (dr) => {
          const documentDetails = await getDocumentDetails(
            dr.processDocument.documentId
          );
          const assignmentDetails = await getAssignmentDetails(
            dr.processStepInstanceId,
            dr.processDocument.processId
          );
          return {
            actionType: "DOCUMENT_REJECTED",
            description: `Rejected "${documentDetails.name}"`,
            createdAt: dr.rejectedAt.toISOString(),
            details: {
              documentId: dr.processDocument.documentId,
              name: documentDetails.name,
              type: documentDetails.type,
              path: make_path(documentDetails.path),
              tags: documentDetails.tags,
              rejectedBy: await getUserDetails(dr.userId),
              rejectionReason: dr.reason || null,
              rejectedAt: dr.rejectedAt.toISOString(),
              byRecommender: dr.byRecommender,
              isAttachedWithRecommendation: dr.isAttachedWithRecommendation,
              stepInstanceId: dr.processStepInstanceId || null,
              stepName: dr.processStepInstance?.workflowStep?.stepName || "N/A",
              workflow: assignmentDetails.workflow,
              assignmentType: assignmentDetails.assignmentType,
              role: assignmentDetails.role,
              department: assignmentDetails.department,
            },
          };
        })
      )),
      ...(
        await Promise.all(
          processQAs.map(async (qa) => {
            const assignmentDetails = await getAssignmentDetails(
              qa.stepInstanceId,
              qa.processId
            );
            const initiatorDetails = await getUserDetails(qa.initiatorId);
            const actions = [];

            if (qa.initiatorId === userData.id) {
              actions.push({
                actionType: "QUERY_RAISED",
                description: `Raised query: "${qa.question}"`,
                createdAt: qa.createdAt.toISOString(),
                details: {
                  stepInstanceId: qa.stepInstanceId || null,
                  stepName: qa.stepInstance?.workflowStep?.stepName || "N/A",
                  stepNumber: qa.stepInstance?.workflowStep?.stepNumber || null,
                  status: qa.stepInstance?.status || null,
                  queryText: qa.question,
                  initiatorName: initiatorDetails,
                  createdAt: qa.createdAt.toISOString(),
                  taskType: "QUERY_UPLOAD",
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              });
            }

            if (qa.entityId === userData.id && qa.status === "RESOLVED") {
              actions.push({
                actionType: "QUERY_RESOLVED",
                description: `Resolved query: "${qa.question}"`,
                createdAt:
                  qa.answeredAt?.toISOString() || qa.createdAt.toISOString(),
                details: {
                  stepInstanceId: qa.stepInstanceId || null,
                  stepName: qa.stepInstance?.workflowStep?.stepName || "N/A",
                  stepNumber: qa.stepInstance?.workflowStep?.stepNumber || null,
                  status: qa.stepInstance?.status || null,
                  queryText: qa.question,
                  initiatorName: initiatorDetails,
                  createdAt: qa.createdAt.toISOString(),
                  taskType: "RESOLVED",
                  answerText: qa.answer || null,
                  answeredAt: qa.answeredAt?.toISOString() || null,
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              });
            }

            return actions;
          })
        )
      ).flat(),
      ...(
        await Promise.all(
          recommendations.map(async (rec) => {
            const assignmentDetails = await getAssignmentDetails(
              rec.stepInstanceId,
              rec.processId
            );
            const initiatorDetails = await getUserDetails(rec.initiatorId);
            const recommenderDetails = await getUserDetails(rec.recommenderId);
            const documentSummaries = rec.documentSummaries || [];
            const documentResponses = rec.details?.documentResponses || [];
            const documentIds = documentSummaries.map((ds) =>
              parseInt(ds.documentId)
            );
            const documents = documentIds.length
              ? await prisma.document.findMany({
                  where: { id: { in: documentIds } },
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    path: true,
                    tags: true,
                  },
                })
              : [];

            const documentMap = documents.reduce((map, doc) => {
              map[doc.id] = {
                name: doc.name,
                type: doc.type,
                path: make_path(doc.path),
                tags: doc.tags,
              };
              return map;
            }, {});

            const documentDetails = documentSummaries.map((ds) => {
              const response = documentResponses.find(
                (dr) => dr.documentId === parseInt(ds.documentId)
              );
              return {
                documentId: ds.documentId,
                documentName:
                  documentMap[ds.documentId]?.name || "Unknown Document",
                documentType: documentMap[ds.documentId]?.type || "Unknown",
                documentPath: documentMap[ds.documentId]?.path || "N/A",
                tags: documentMap[ds.documentId]?.tags || [],
                queryText: ds.queryText,
                answerText: response?.answerText || null,
                requiresApproval: ds.requiresApproval,
              };
            });

            const actions = [];

            if (rec.initiatorId === userData.id) {
              actions.push({
                actionType: "RECOMMENDATION_REQUESTED",
                description: `Requested recommendation: "${rec.recommendationText}"`,
                createdAt: rec.createdAt.toISOString(),
                details: {
                  recommendationId: rec.id,
                  processId: rec.processId,
                  processName: rec.process.name,
                  stepInstanceId: rec.stepInstanceId || null,
                  stepName: rec.stepInstance?.workflowStep?.stepName || "N/A",
                  stepNumber:
                    rec.stepInstance?.workflowStep?.stepNumber || null,
                  status: rec.status,
                  recommendationText: rec.recommendationText,
                  initiatorName: initiatorDetails,
                  recommenderName: recommenderDetails,
                  createdAt: rec.createdAt.toISOString(),
                  responseText: rec.responseText || null,
                  respondedAt: rec.respondedAt
                    ? rec.respondedAt.toISOString()
                    : null,
                  documentDetails,
                  documentResponses: documentResponses || [],
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              });
            }

            if (
              rec.recommenderId === userData.id &&
              rec.status === "RESOLVED"
            ) {
              actions.push({
                actionType: "RECOMMENDATION_PROVIDED",
                description: `Provided recommendation: "${
                  rec.responseText || "No response"
                }"`,
                createdAt:
                  rec.respondedAt?.toISOString() || rec.createdAt.toISOString(),
                details: {
                  recommendationId: rec.id,
                  processId: rec.processId,
                  processName: rec.process.name,
                  stepInstanceId: rec.stepInstanceId || null,
                  stepName: rec.stepInstance?.workflowStep?.stepName || "N/A",
                  stepNumber:
                    rec.stepInstance?.workflowStep?.stepNumber || null,
                  status: rec.status,
                  recommendationText: rec.recommendationText,
                  initiatorName: initiatorDetails,
                  recommenderName: recommenderDetails,
                  createdAt: rec.createdAt.toISOString(),
                  responseText: rec.responseText || null,
                  respondedAt: rec.respondedAt
                    ? rec.respondedAt.toISOString()
                    : null,
                  documentDetails,
                  documentResponses: documentResponses || [],
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              });
            }

            return actions;
          })
        )
      ).flat(),
      ...(
        await Promise.all(
          userStepInstances.map(async (step) => {
            if (step.status === "APPROVED" && step.decisionAt) {
              const assignmentDetails = await getAssignmentDetails(
                step.id,
                processId
              );
              return {
                actionType: "STEP_COMPLETED",
                description: `Completed step "${step.workflowStep?.stepName}"`,
                createdAt: step.decisionAt.toISOString(),
                details: {
                  stepInstanceId: step.id,
                  stepName: step.workflowStep?.stepName,
                  stepNumber: step.workflowStep?.stepNumber || null,
                  completedBy: await getUserDetails(userData.id),
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              };
            }
            return null;
          })
        )
      ).filter(Boolean)
    );

    const sortedActivities = activities
      .filter(Boolean)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (sortedActivities.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: "No activities found",
          details: "User has no recorded actions in this process or step.",
          code: "NO_ACTIVITIES",
        },
      });
    }

    return res.status(200).json({
      success: true,
      process: {
        processId,
        processName: process.name,
        processStepInstanceId: stepInstanceId || null,
        stepName: stepInstance?.workflowStep?.stepName || null,
        recirculationCycle: stepInstance?.recirculationCycle || 0,
        activities: sortedActivities,
      },
    });
  } catch (error) {
    console.error("Error in get_user_activity_log:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch user activity log",
        details: error.message,
        code: "ACTIVITY_LOG_ERROR",
      },
    });
  }
};
export const get_user_activity_logs = async (req, res) => {
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

    const [
      stepInstances,
      recommenderProcesses,
      queryProcesses,
      initiatedProcesses,
    ] = await Promise.all([
      prisma.processStepInstance.findMany({
        where: {
          assignedTo: userData.id,
          OR: [{ status: "IN_PROGRESS" }, { status: "APPROVED" }],
        },
        include: {
          process: { select: { id: true, name: true } },
          workflowStep: { select: { stepName: true, stepNumber: true } },
        },
      }),
      prisma.recommendation.findMany({
        where: {
          OR: [{ initiatorId: userData.id }, { recommenderId: userData.id }],
        },
        select: {
          processId: true,
          process: { select: { id: true, name: true } },
        },
      }),
      prisma.processQA.findMany({
        where: {
          OR: [
            { initiatorId: userData.id },
            { entityId: userData.id, status: "RESOLVED" },
          ],
        },
        select: {
          processId: true,
          process: { select: { id: true, name: true } },
        },
      }),
      prisma.processInstance.findMany({
        where: { initiatorId: userData.id },
        select: { id: true, name: true },
      }),
    ]);

    const allProcessIds = [
      ...new Set([
        ...stepInstances.map((s) => s.processId),
        ...recommenderProcesses.map((r) => r.processId),
        ...queryProcesses.map((q) => q.processId),
        ...initiatedProcesses.map((p) => p.id),
      ]),
    ];

    const logs = await Promise.all(
      allProcessIds.map(async (processId) => {
        const process = await prisma.processInstance.findUnique({
          where: { id: processId },
          select: {
            id: true,
            name: true,
            createdAt: true,
            initiator: { select: { username: true } },
            workflow: { select: { name: true } },
          },
        });

        if (!process) return null;

        const userSteps = stepInstances.filter(
          (s) => s.processId === processId
        );

        const [
          signatureCount,
          rejectionCount,
          documentCount,
          queryCount,
          recommendationCount,
          initiated,
        ] = await Promise.all([
          prisma.documentSignature.count({
            where: {
              processDocument: { processId },
              userId: userData.id,
            },
          }),
          prisma.documentRejection.count({
            where: {
              processDocument: { processId },
              userId: userData.id,
            },
          }),
          prisma.processDocument.count({
            where: {
              processId,
              document: {
                createdById: userData.id,
              },
            },
          }),
          prisma.processQA.count({
            where: {
              processId,
              OR: [
                { initiatorId: userData.id },
                { entityId: userData.id, status: "RESOLVED" },
              ],
            },
          }),
          prisma.recommendation.count({
            where: {
              processId,
              OR: [
                { initiatorId: userData.id },
                { recommenderId: userData.id },
              ],
            },
          }),
          prisma.processInstance.findFirst({
            where: { id: processId, initiatorId: userData.id },
            select: { id: true },
          }),
        ]);

        const hasActivity =
          signatureCount > 0 ||
          rejectionCount > 0 ||
          documentCount > 0 ||
          queryCount > 0 ||
          recommendationCount > 0 ||
          initiated;

        if (!hasActivity) return null;

        const steps = userSteps.length
          ? await Promise.all(
              userSteps.map(async (s) => {
                const assignmentDetails = await getAssignmentDetails(
                  s.id,
                  processId
                );
                return {
                  stepInstanceId: s.id,
                  stepName: s.workflowStep?.stepName || "Unknown Step",
                  stepNumber: s.workflowStep?.stepNumber || null,
                  recirculationCycle: s.recirculationCycle || 0,
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                };
              })
            )
          : null;

        const lastActivities = await Promise.all([
          prisma.documentSignature.findFirst({
            where: {
              processDocument: { processId },
              userId: userData.id,
            },
            orderBy: { signedAt: "desc" },
            select: { signedAt: true },
          }),
          prisma.documentRejection.findFirst({
            where: {
              processDocument: { processId },
              userId: userData.id,
            },
            orderBy: { rejectedAt: "desc" },
            select: { rejectedAt: true },
          }),
          prisma.processDocument.findFirst({
            where: {
              processId,
              document: { createdById: userData.id },
            },
            orderBy: { document: { createdOn: "desc" } }, // Use document.createdOn
            select: { document: { select: { createdOn: true } } },
          }),
          prisma.processQA.findFirst({
            where: {
              processId,
              OR: [
                { initiatorId: userData.id },
                { entityId: userData.id, status: "RESOLVED" },
              ],
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
          prisma.recommendation.findFirst({
            where: {
              processId,
              OR: [
                { initiatorId: userData.id },
                { recommenderId: userData.id },
              ],
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
          prisma.processInstance.findFirst({
            where: {
              id: processId,
              initiatorId: userData.id,
            },
            select: { createdAt: true },
          }),
        ]);

        const timestamps = lastActivities
          .flatMap((activity) => {
            if (!activity) return [];
            return [
              activity.signedAt ||
                activity.rejectedAt ||
                (activity.document
                  ? activity.document.createdOn
                  : activity.createdAt),
            ].filter(Boolean);
          })
          .map((date) => new Date(date));

        const lastActivityAt =
          timestamps.length > 0
            ? new Date(Math.max(...timestamps)).toISOString()
            : process.createdAt.toISOString();

        return {
          processId: process.id,
          processName: process.name,
          initiatorName: await getUserDetails(process.initiator),
          createdAt: process.createdAt.toISOString(),
          steps,
          actionSummary: {
            signatures: signatureCount,
            rejections: rejectionCount,
            documents: documentCount,
            queries: queryCount,
            recommendations: recommendationCount,
            initiated: initiated ? 1 : 0,
          },
          lastActivityAt,
        };
      })
    );

    const validLogs = logs
      .filter((log) => log)
      .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));

    return res.status(200).json({
      success: true,
      logs: validLogs,
    });
  } catch (error) {
    console.error("Error fetching user activity logs:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch user activity logs",
        details: error.message,
        code: "ACTIVITY_LOGS_ERROR",
      },
    });
  }
};

export const get_process_activity_logs = async (req, res) => {
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

    const { processId, stepInstanceId } = req.params;

    const process = await prisma.processInstance.findUnique({
      where: { id: processId },
      include: {
        workflow: { select: { name: true } },
        initiator: true,
      },
    });

    if (!process) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Process not found",
          details: "Invalid process ID.",
          code: "NOT_FOUND",
        },
      });
    }

    let stepInstance = null;
    let timeStart = new Date(0);
    let timeEnd = new Date();

    if (stepInstanceId) {
      stepInstance = await prisma.processStepInstance.findUnique({
        where: { id: stepInstanceId },
        include: {
          process: { select: { id: true } },
          workflowStep: { select: { stepName: true, stepNumber: true } },
        },
      });

      if (!stepInstance || stepInstance.processId !== processId) {
        return res.status(404).json({
          success: false,
          error: {
            message: "Step instance not found",
            details: "Invalid step instance ID or process ID.",
            code: "NOT_FOUND",
          },
        });
      }

      timeStart = stepInstance.createdAt;
      timeEnd = stepInstance.decisionAt || new Date();
    }

    const hasAccess = await prisma.documentAccess.findFirst({
      where: {
        processId,
        OR: [
          { userId: userData.id },
          {
            roleId: {
              in: (
                await prisma.userRole.findMany({
                  where: { userId: userData.id },
                })
              ).map((ur) => ur.roleId),
            },
          },
          {
            departmentId: {
              in: (
                await prisma.department.findMany({
                  where: { users: { some: { id: userData.id } } },
                })
              ).map((d) => d.id),
            },
          },
        ],
      },
    });

    // if (!hasAccess && process.initiatorId !== userData.id) {
    //   return res.status(403).json({
    //     success: false,
    //     error: {
    //       message: "Forbidden",
    //       details: "User has no access to this process.",
    //       code: "FORBIDDEN",
    //     },
    //   });
    // }

    const userStepInstances = await prisma.processStepInstance.findMany({
      where: { processId },
      select: {
        id: true,
        createdAt: true,
        decisionAt: true,
        status: true,
        workflowStep: { select: { stepName: true, stepNumber: true } },
        assignedTo: true,
      },
    });

    const [
      documentSignatures,
      documentRejections,
      processDocuments,
      processQAs,
      recommendations,
      processInstance,
    ] = await Promise.all([
      prisma.documentSignature.findMany({
        where: {
          processDocument: { processId },
          signedAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          processDocument: {
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
            },
          },
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.documentRejection.findMany({
        where: {
          processDocument: { processId },
          rejectedAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          processDocument: {
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
            },
          },
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.processDocument.findMany({
        where: {
          processId,
          document: { createdOn: { gte: timeStart, lte: timeEnd } }, // Use createdOn
        },
        include: {
          document: {
            select: {
              id: true,
              name: true,
              type: true,
              path: true,
              tags: true,
              createdById: true,
              createdOn: true,
            },
          },
          rejectedBy: { select: { id: true, username: true } },
        },
      }),
      prisma.processQA.findMany({
        where: {
          processId,
          createdAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          initiator: { select: { id: true, name: true } },
          stepInstance: {
            include: {
              workflowStep: { select: { stepName: true, stepNumber: true } },
            },
          },
        },
      }),
      prisma.recommendation.findMany({
        where: {
          processId,
          createdAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          initiator: { select: { id: true, username: true } },
          recommender: { select: { id: true, username: true } },
          process: { select: { id: true, name: true } },
          stepInstance: {
            include: {
              workflowStep: { select: { stepName: true, stepNumber: true } },
            },
          },
        },
      }),
      prisma.processInstance.findFirst({
        where: { id: processId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          initiator: { select: { id: true, username: true } },
        },
      }),
    ]);

    const activities = await Promise.all([
      ...(processInstance
        ? [
            {
              actionType: "PROCESS_INITIATED",
              description: `Initiated process "${processInstance.name}"`,
              createdAt: processInstance.createdAt.toISOString(),
              details: {
                processId: processInstance.id,
                processName: processInstance.name,
                initiatorName: await getUserDetails(
                  processInstance.initiatorId
                ),
                workflow: process.workflow?.name || "N/A",
                assignmentType: "N/A",
                role: "N/A",
                department: "N/A",
              },
            },
          ]
        : []),
      ...(await Promise.all(
        processDocuments.map(async (pd) => {
          const documentDetails = await getDocumentDetails(pd.documentId);
          const assignmentDetails = await getAssignmentDetails(
            null, // ProcessDocument has no stepInstanceId
            pd.processId
          );
          return {
            actionType: "DOCUMENT_UPLOADED",
            description: `Uploaded document "${documentDetails.name}"`,
            createdAt: pd.document.createdOn.toISOString(), // Use createdOn
            details: {
              documentId: pd.documentId,
              name: documentDetails.name,
              type: documentDetails.type,
              path: make_path(documentDetails.path),
              tags: documentDetails.tags,
              uploadedBy: await getUserDetails(pd.document.createdById),
              stepInstanceId: null,
              stepName: "N/A",
              workflow: assignmentDetails.workflow,
              assignmentType: assignmentDetails.assignmentType,
              role: assignmentDetails.role,
              department: assignmentDetails.department,
            },
          };
        })
      )),
      ...(await Promise.all(
        documentSignatures.map(async (sig) => {
          const documentDetails = await getDocumentDetails(
            sig.processDocument.documentId
          );
          const assignmentDetails = await getAssignmentDetails(
            sig.processStepInstanceId,
            sig.processDocument.processId
          );
          return {
            actionType: "DOCUMENT_SIGNED",
            description: `Signed "${documentDetails.name}"`,
            createdAt: sig.signedAt.toISOString(),
            details: {
              documentId: sig.processDocument.documentId,
              name: documentDetails.name,
              type: documentDetails.type,
              path: make_path(documentDetails.path),
              tags: documentDetails.tags,
              signedBy: await getUserDetails(sig.userId),
              signedAt: sig.signedAt.toISOString(),
              remarks: sig.reason || null,
              byRecommender: sig.byRecommender,
              isAttachedWithRecommendation: sig.isAttachedWithRecommendation,
              stepInstanceId: sig.processStepInstanceId || null,
              stepName:
                sig.processStepInstance?.workflowStep?.stepName || "N/A",
              workflow: assignmentDetails.workflow,
              assignmentType: assignmentDetails.assignmentType,
              role: assignmentDetails.role,
              department: assignmentDetails.department,
            },
          };
        })
      )),
      ...(await Promise.all(
        documentRejections.map(async (dr) => {
          const documentDetails = await getDocumentDetails(
            dr.processDocument.documentId
          );
          const assignmentDetails = await getAssignmentDetails(
            dr.processStepInstanceId,
            dr.processDocument.processId
          );
          return {
            actionType: "DOCUMENT_REJECTED",
            description: `Rejected "${documentDetails.name}"`,
            createdAt: dr.rejectedAt.toISOString(),
            details: {
              documentId: dr.processDocument.documentId,
              name: documentDetails.name,
              type: documentDetails.type,
              path: make_path(documentDetails.path),
              tags: documentDetails.tags,
              rejectedBy: await getUserDetails(dr.userId),
              rejectionReason: dr.reason || null,
              rejectedAt: dr.rejectedAt.toISOString(),
              byRecommender: dr.byRecommender,
              isAttachedWithRecommendation: dr.isAttachedWithRecommendation,
              stepInstanceId: dr.processStepInstanceId || null,
              stepName: dr.processStepInstance?.workflowStep?.stepName || "N/A",
              workflow: assignmentDetails.workflow,
              assignmentType: assignmentDetails.assignmentType,
              role: assignmentDetails.role,
              department: assignmentDetails.department,
            },
          };
        })
      )),
      ...(
        await Promise.all(
          processQAs.map(async (qa) => {
            const assignmentDetails = await getAssignmentDetails(
              qa.stepInstanceId,
              qa.processId
            );
            const initiatorDetails = await getUserDetails(qa.initiatorId);
            const actions = [];

            if (qa.initiatorId === userData.id) {
              actions.push({
                actionType: "QUERY_RAISED",
                description: `Raised query: "${qa.question}"`,
                createdAt: qa.createdAt.toISOString(),
                details: {
                  stepInstanceId: qa.stepInstanceId || null,
                  stepName: qa.stepInstance?.workflowStep?.stepName || "N/A",
                  stepNumber: qa.stepInstance?.workflowStep?.stepNumber || null,
                  status: qa.stepInstance?.status || null,
                  queryText: qa.question,
                  initiatorName: initiatorDetails,
                  createdAt: qa.createdAt.toISOString(),
                  taskType: "QUERY_UPLOAD",
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              });
            }

            if (qa.entityId === userData.id && qa.status === "RESOLVED") {
              actions.push({
                actionType: "QUERY_RESOLVED",
                description: `Resolved query: "${qa.question}"`,
                createdAt:
                  qa.answeredAt?.toISOString() || qa.createdAt.toISOString(),
                details: {
                  stepInstanceId: qa.stepInstanceId || null,
                  stepName: qa.stepInstance?.workflowStep?.stepName || "N/A",
                  stepNumber: qa.stepInstance?.workflowStep?.stepNumber || null,
                  status: qa.stepInstance?.status || null,
                  queryText: qa.question,
                  initiatorName: initiatorDetails,
                  createdAt: qa.createdAt.toISOString(),
                  taskType: "RESOLVED",
                  answerText: qa.answer || null,
                  answeredAt: qa.answeredAt?.toISOString() || null,
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              });
            }

            return actions;
          })
        )
      ).flat(),
      ...(
        await Promise.all(
          recommendations.map(async (rec) => {
            const assignmentDetails = await getAssignmentDetails(
              rec.stepInstanceId,
              rec.processId
            );
            const initiatorDetails = await getUserDetails(rec.initiatorId);
            const recommenderDetails = await getUserDetails(rec.recommenderId);
            const documentSummaries = rec.documentSummaries || [];
            const documentResponses = rec.details?.documentResponses || [];
            const documentIds = documentSummaries.map((ds) =>
              parseInt(ds.documentId)
            );
            const documents = documentIds.length
              ? await prisma.document.findMany({
                  where: { id: { in: documentIds } },
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    path: true,
                    tags: true,
                  },
                })
              : [];

            const documentMap = documents.reduce((map, doc) => {
              map[doc.id] = {
                name: doc.name,
                type: doc.type,
                path: make_path(doc.path),
                tags: doc.tags,
              };
              return map;
            }, {});

            const documentDetails = documentSummaries.map((ds) => {
              const response = documentResponses.find(
                (dr) => dr.documentId === parseInt(ds.documentId)
              );
              return {
                documentId: ds.documentId,
                documentName:
                  documentMap[ds.documentId]?.name || "Unknown Document",
                documentType: documentMap[ds.documentId]?.type || "Unknown",
                documentPath: documentMap[ds.documentId]?.path || "N/A",
                tags: documentMap[ds.documentId]?.tags || [],
                queryText: ds.queryText,
                answerText: response?.answerText || null,
                requiresApproval: ds.requiresApproval,
              };
            });

            const actions = [];

            if (rec.initiatorId === userData.id) {
              actions.push({
                actionType: "RECOMMENDATION_REQUESTED",
                description: `Requested recommendation: "${rec.recommendationText}"`,
                createdAt: rec.createdAt.toISOString(),
                details: {
                  recommendationId: rec.id,
                  processId: rec.processId,
                  processName: rec.process.name,
                  stepInstanceId: rec.stepInstanceId || null,
                  stepName: rec.stepInstance?.workflowStep?.stepName || "N/A",
                  stepNumber:
                    rec.stepInstance?.workflowStep?.stepNumber || null,
                  status: rec.status,
                  recommendationText: rec.recommendationText,
                  initiatorName: initiatorDetails,
                  recommenderName: recommenderDetails,
                  createdAt: rec.createdAt.toISOString(),
                  responseText: rec.responseText || null,
                  respondedAt: rec.respondedAt
                    ? rec.respondedAt.toISOString()
                    : null,
                  documentDetails,
                  documentResponses: documentResponses || [],
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              });
            }

            if (
              rec.recommenderId === userData.id &&
              rec.status === "RESOLVED"
            ) {
              actions.push({
                actionType: "RECOMMENDATION_PROVIDED",
                description: `Provided recommendation: "${
                  rec.responseText || "No response"
                }"`,
                createdAt:
                  rec.respondedAt?.toISOString() || rec.createdAt.toISOString(),
                details: {
                  recommendationId: rec.id,
                  processId: reg.processId,
                  processName: rec.process.name,
                  stepInstanceId: rec.stepInstanceId || null,
                  stepName: rec.stepInstance?.workflowStep?.stepName || "N/A",
                  stepNumber:
                    rec.stepInstance?.workflowStep?.stepNumber || null,
                  status: rec.status,
                  recommendationText: rec.recommendationText,
                  initiatorName: initiatorDetails,
                  recommenderName: recommenderDetails,
                  createdAt: rec.createdAt.toISOString(),
                  responseText: rec.responseText || null,
                  respondedAt: rec.respondedAt
                    ? rec.respondedAt.toISOString()
                    : null,
                  documentDetails,
                  documentResponses: documentResponses || [],
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              });
            }

            return actions;
          })
        )
      ).flat(),
      ...(
        await Promise.all(
          userStepInstances.map(async (step) => {
            if (step.status === "APPROVED" && step.decisionAt) {
              const assignmentDetails = await getAssignmentDetails(
                step.id,
                processId
              );
              return {
                actionType: "STEP_COMPLETED",
                description: `Completed step "${step.workflowStep?.stepName}"`,
                createdAt: step.decisionAt.toISOString(),
                details: {
                  stepInstanceId: step.id,
                  stepName: step.workflowStep?.stepName,
                  stepNumber: step.workflowStep?.stepNumber || null,
                  completedBy: await getUserDetails(step.assignedTo),
                  workflow: assignmentDetails.workflow,
                  assignmentType: assignmentDetails.assignmentType,
                  role: assignmentDetails.role,
                  department: assignmentDetails.department,
                },
              };
            }
            return null;
          })
        )
      ).filter((action) => action !== null),
    ]);

    const allActivities = (await Promise.all(activities))
      .flat()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (allActivities.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: "No activities found",
          details: "No recorded actions in this process or step.",
          code: "NO_ACTIVITIES",
        },
      });
    }

    return res.status(200).json({
      success: true,
      process: {
        processId,
        processName: process.name,
        processStepInstanceId: stepInstanceId || null,
        stepName: stepInstance?.workflowStep?.stepName || null,
        recirculationCycle: stepInstance?.recirculationCycle || 0,
        activities: allActivities,
      },
    });
  } catch (error) {
    console.error("Error fetching process activity logs:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to fetch process activity logs",
        details: error.message,
        code: "ACTIVITY_LOG_ERROR",
      },
    });
  }
};
