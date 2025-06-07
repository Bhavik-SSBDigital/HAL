import { PrismaClient } from "@prisma/client";
import { verifyUser } from "../utility/verifyUser.js";
const prisma = new PrismaClient();

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

    // Validate process
    const process = await prisma.processInstance.findUnique({
      where: { id: processId },
      select: { id: true, name: true },
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
    let timeStart = new Date(0); // Default to epoch start
    let timeEnd = new Date(); // Default to now

    if (stepInstanceId) {
      // Validate step instance if provided
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

    // Check user involvement: assignee, recommender, query initiator, resolver, or initiator
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

    // Fetch all step instances for the user in this process
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

    const stepInstanceIds = userStepInstances.map((s) => s.id);

    // Fetch actions
    const [
      documentHistory,
      documentSignatures,
      documentRejections,
      processQAs,
      recommendations,
      processInstance,
    ] = await Promise.all([
      prisma.documentHistory.findMany({
        where: {
          processId,
          userId: userData.id,
          createdAt: { gte: timeStart, lte: timeEnd },
        },
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
          replacedDocument: { select: { id: true, name: true, path: true } },
          user: { select: { id: true, name: true, username: true } },
        },
      }),
      prisma.documentSignature.findMany({
        where: {
          processDocument: { processId },
          userId: userData.id,
          signedAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          processDocument: {
            include: {
              document: { select: { id: true, name: true, path: true } },
            },
          },
          user: { select: { id: true, username: true } },
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
              document: { select: { id: true, name: true, path: true } },
            },
          },
          user: { select: { id: true, username: true } },
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
        },
      }),
      prisma.processInstance.findFirst({
        where: { id: processId, initiatorId: userData.id },
        select: {
          id: true,
          name: true,
          createdAt: true,
          initiator: { select: { username: true } },
        },
      }),
    ]);

    // Format actions
    const activities = [];

    // Process Initiation
    if (processInstance) {
      activities.push({
        actionType: "PROCESS_INITIATED",
        description: `Initiated process "${processInstance.name}"`,
        createdAt: processInstance.createdAt.toISOString(),
        details: {
          processId: processInstance.id,
          processName: processInstance.name,
          initiatorName: processInstance.initiator.username,
        },
      });
    }

    // Document History
    // documentHistory.forEach((history) => {
    //   activities.push({
    //     actionType: `DOCUMENT_${history.actionType}`,
    //     description: `${history.actionType.toLowerCase()} "${
    //       history.document.name
    //     }"`,
    //     createdAt: history.createdAt.toISOString(),
    //     details: {
    //       documentId: history.document.id,
    //       name: history.document.name,
    //       type: history.document.type,
    //       path: history.document.path,
    //       tags: history.document.tags,
    //       actionDetails: history.actionDetails || [],
    //       replacedDocument: history.replacedDocument
    //         ? {
    //             id: history.replacedDocument.id,
    //             name: history.replacedDocument.name,
    //             path: history.replacedDocument.path,
    //           }
    //         : null,
    //       user: history.user.name,
    //       isRecirculationTrigger: history.isRecirculationTrigger,
    //     },
    //   });
    // });

    // Document Signatures
    documentSignatures.forEach((sig) => {
      activities.push({
        actionType: "DOCUMENT_SIGNED",
        description: `Signed "${sig.processDocument.document.name}"`,
        createdAt: sig.signedAt.toISOString(),
        details: {
          signedBy: sig.user.username,
          signedAt: sig.signedAt.toISOString(),
          remarks: sig.reason || null,
          byRecommender: sig.byRecommender,
          isAttachedWithRecommendation: sig.isAttachedWithRecommendation,
          documentId: sig.processDocument.documentId,
          name: sig.processDocument.document.name,
          path: make_path(sig.processDocument.document.path),
        },
      });
    });

    // Document Rejections
    documentRejections.forEach((dr) => {
      activities.push({
        actionType: "DOCUMENT_REJECTED",
        description: `Rejected "${dr.processDocument.document.name}"`,
        createdAt: dr.rejectedAt.toISOString(),
        details: {
          rejectedBy: dr.user.username,
          rejectionReason: dr.reason || null,
          rejectedAt: dr.rejectedAt.toISOString(),
          byRecommender: dr.byRecommender,
          isAttachedWithRecommendation: dr.isAttachedWithRecommendation,
          documentId: dr.processDocument.documentId,
          name: dr.processDocument.document.name,
          path: make_path(dr.processDocument.document.path),
        },
      });
    });

    // Process QAs
    const queryDetails = await Promise.all(
      processQAs.map(async (qa) => {
        const documentHistoryIds = [
          ...(qa.details?.documentChanges?.map((dc) => dc.documentHistoryId) ||
            []),
          ...(qa.details?.documentSummaries?.map(
            (ds) => ds.documentHistoryId
          ) || []),
        ];
        const documentHistories = documentHistoryIds.length
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
                  select: { id: true, name: true, path: true },
                },
                user: { select: { id: true, name: true, username: true } },
              },
            })
          : [];

        const baseDetails = {
          stepInstanceId: qa.stepInstanceId || null,
          stepName: qa.stepInstance?.workflowStep?.stepName || null,
          stepNumber: qa.stepInstance?.workflowStep?.stepNumber || null,
          status: qa.stepInstance?.status || null,
          queryText: qa.question,
          initiatorName: qa.initiator.name,
          createdAt: qa.createdAt.toISOString(),
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
                      path: make_path(history.document.path),
                      tags: history.document.tags,
                    }
                  : null,
                actionDetails: history?.actionDetails || null,
                user: history?.user?.name || null,
                createdAt: history?.createdAt?.toISOString() || null,
                replacedDocument: history?.replacedDocument
                  ? {
                      id: history.replacedDocument.id,
                      name: history.replacedDocument.name,
                      path: make_path(history.replacedDocument.path),
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
                      path: make_path(history.document.path),
                    }
                  : null,
                user: history?.user?.username || null,
                createdAt: history?.createdAt?.toISOString() || null,
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

        const actions = [];
        if (qa.initiatorId === userData.id) {
          actions.push({
            actionType: "QUERY_RAISED",
            description: `Raised query: "${qa.question}"`,
            createdAt: qa.createdAt.toISOString(),
            details: { ...baseDetails, taskType: "QUERY_UPLOAD" },
          });
        }
        if (qa.entityId === userData.id && qa.status === "RESOLVED") {
          actions.push({
            actionType: "QUERY_RESOLVED",
            description: `Resolved query: "${qa.question}"`,
            createdAt:
              qa.answeredAt?.toISOString() || qa.createdAt.toISOString(),
            details: {
              ...baseDetails,
              taskType: "RESOLVED",
              answerText: qa.answer || null,
              answeredAt: qa.answeredAt?.toISOString() || null,
            },
          });
        }
        return actions;
      })
    );

    // Recommendations
    const recommendationDetails = await Promise.all(
      recommendations.map(async (rec) => {
        const documentSummaries = rec.documentSummaries || [];
        const documentResponses = rec.details?.documentResponses || [];
        const documentIds = documentSummaries.map((ds) =>
          parseInt(ds.documentId)
        );
        const documents = documentIds.length
          ? await prisma.document.findMany({
              where: { id: { in: documentIds } },
              select: { id: true, name: true, path: true },
            })
          : [];

        const documentMap = documents.reduce((map, doc) => {
          map[doc.id] = { name: doc.name, path: make_path(doc.path) };
          return map;
        }, {});

        const documentDetails = documentSummariess.map((ds) => {
          const response = documentResponses.find(
            (dr) => dr.documentId === parseInt(ds.documentId)
          );
          return {
            documentId: ds.documentId,
            documentName:
              documentMap[ds.documentId]?.name || "Unknown Document",
            documentPath: documentMap[ds.documentId]?.path
              ? documentMap[ds.documentId].path.substring(
                  0,
                  documentMap[ds.documentId].path.lastIndexOf("/")
                )
              : "Unknown Path",
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
              stepName: stepInstance?.workflowStep?.stepName || null,
              stepNumber: stepInstance?.workflowStep?.stepNumber || null,
              status: rec.status,
              recommendationText: rec.recommendationText,
              initiatorName: rec.initiator.username,
              recommenderName: rec.recommender.username,
              createdAt: rec.createdAt.toISOString(),
              responseText: rec.responseText || null,
              respondedAt: rec.respondedAt
                ? rec.respondedAt.toISOString()
                : null,
              documentDetails,
              documentResponses: documentResponses || [],
            },
          });
        }
        if (rec.recommenderId === userData.id && rec.status === "RESOLVED") {
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
              stepName: stepInstance?.workflowStep?.stepName || null,
              stepNumber: stepInstance?.workflowStep?.stepNumber || null,
              status: rec.status,
              recommendationText: rec.recommendationText,
              initiatorName: rec.initiator.username,
              recommenderName: rec.recommender.username,
              createdAt: rec.createdAt.toISOString(),
              responseText: rec.responseText || null,
              respondedAt: rec.respondedAt
                ? rec.respondedAt.toISOString()
                : null,
              documentDetails,
              documentResponses: documentResponses || [],
            },
          });
        }
        return actions;
      })
    );

    // Step Completion
    userStepInstances.forEach((step) => {
      if (step.status === "APPROVED" && step.decisionAt) {
        activities.push({
          actionType: "STEP_COMPLETED",
          description: `Completed step "${step.workflowStep?.stepName}"`,
          createdAt: step.decisionAt.toISOString(),
          details: {
            stepInstanceId: step.id,
            stepName: step.workflowStep?.stepName,
            stepNumber: step.workflowStep?.stepNumber || null,
          },
        });
      }
    });

    // Combine and sort actions
    const allActivities = [
      ...activities,
      ...queryDetails.flat(),
      ...recommendationDetails.flat(),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // If no activities, return 404 to indicate no relevant user actions
    if (allActivities.length === 0) {
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
        activities: allActivities,
      },
    });
  } catch (error) {
    console.error("Error fetching user activity log:", error);
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

    // Fetch process IDs where user is involved
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

    // Fetch logs for each process
    const logs = await Promise.all(
      allProcessIds.map(async (processId) => {
        const process = await prisma.processInstance.findUnique({
          where: { id: processId },
          select: {
            id: true,
            name: true,
            createdAt: true,
            initiator: { select: { username: true } },
          },
        });

        if (!process) return null;

        const userSteps = stepInstances.filter(
          (s) => s.processId === processId
        );
        const stepInstanceIds = userSteps.map((s) => s.id);

        // Count actions
        const [
          documentHistoryCount,
          signatureCount,
          rejectionCount,
          queryCount,
          recommendationCount,
          initiated,
        ] = await Promise.all([
          prisma.documentHistory.count({
            where: {
              processId,
              userId: userData.id,
            },
          }),
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

        // Check if the user has any meaningful activity
        const hasActivity =
          documentHistoryCount > 0 ||
          signatureCount > 0 ||
          rejectionCount > 0 ||
          queryCount > 0 ||
          recommendationCount > 0 ||
          initiated;

        // Skip processes with no user activity
        if (!hasActivity) return null;

        const steps = userSteps.length
          ? userSteps.map((s) => ({
              stepInstanceId: s.id,
              stepName: s.workflowStep?.stepName || "Unknown Step",
              stepNumber: s.workflowStep?.stepNumber || null,
              recirculationCycle: s.recirculationCycle || 0,
            }))
          : null;

        // Find last activity timestamp
        const lastActivity = await prisma.$queryRaw`
            SELECT MAX("createdAt") as "lastActivityAt"
            FROM (
              SELECT "createdAt" FROM "DocumentHistory" WHERE "processId" = ${processId} AND "userId" = ${userData.id}
              UNION
              SELECT "signedAt" as "createdAt" FROM "DocumentSignature" WHERE "processDocumentId" IN (SELECT id FROM "ProcessDocument" WHERE "processId" = ${processId}) AND "userId" = ${userData.id}
              UNION
              SELECT "rejectedAt" as "createdAt" FROM "DocumentRejection" WHERE "processDocumentId" IN (SELECT id FROM "ProcessDocument" WHERE "processId" = ${processId}) AND "userId" = ${userData.id}
              UNION
              SELECT "createdAt" FROM "ProcessQA" WHERE "processId" = ${processId} AND ("initiatorId" = ${userData.id} OR ("entityId" = ${userData.id} AND status = 'RESOLVED'))
              UNION
              SELECT "createdAt" FROM "Recommendation" WHERE "processId" = ${processId} AND ("initiatorId" = ${userData.id} OR "recommenderId" = ${userData.id})
              UNION
              SELECT "createdAt" FROM "ProcessInstance" WHERE id = ${processId} AND "initiatorId" = ${userData.id}
            ) as activities
          `;

        return {
          processId: process.id,
          processName: process.name,
          initiatorName: process.initiator.username,
          createdAt: process.createdAt.toISOString(),
          steps,
          actionSummary: {
            documents: documentHistoryCount,
            signatures: signatureCount,
            rejections: rejectionCount,
            queries: queryCount,
            recommendations: recommendationCount,
            initiated: initiated ? 1 : 0,
          },
          lastActivityAt:
            lastActivity[0]?.lastActivityAt?.toISOString() ||
            process.createdAt.toISOString(),
        };
      })
    );

    // Filter out null results and sort by last activity
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

    // Validate process
    const process = await prisma.processInstance.findUnique({
      where: { id: processId },
      select: { id: true, name: true },
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
    let timeStart = new Date(0); // Default to epoch start
    let timeEnd = new Date(); // Default to now

    if (stepInstanceId) {
      // Validate step instance if provided
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

    // Check user involvement: assignee, recommender, query initiator, resolver, or initiator
    // const isAssignee = stepInstance
    //   ? stepInstance.assignedTo === userData.id
    //   : await prisma.processStepInstance.findFirst({
    //       where: {
    //         processId,
    //         assignedTo: userData.id,
    //         OR: [{ status: "IN_PROGRESS" }, { status: "APPROVED" }],
    //       },
    //     });
    // const isRecommender = await prisma.recommendation.findFirst({
    //   where: {
    //     processId,
    //     OR: [{ initiatorId: userData.id }, { recommenderId: userData.id }],
    //   },
    // });
    // const isQueryInvolved = await prisma.processQA.findFirst({
    //   where: {
    //     processId,
    //     OR: [
    //       { initiatorId: userData.id },
    //       { entityId: userData.id, status: "RESOLVED" },
    //     ],
    //   },
    // });
    // const isInitiator = await prisma.processInstance.findFirst({
    //   where: { id: processId, initiatorId: userData.id },
    // });

    // if (!isAssignee && !isRecommender && !isQueryInvolved && !isInitiator) {
    //   return res.status(403).json({
    //     success: false,
    //     error: {
    //       message: "Forbidden",
    //       details: "User has no involvement in this process.",
    //       code: "FORBIDDEN",
    //     },
    //   });
    // }

    // Fetch all step instances for the user in this process
    const userStepInstances = await prisma.processStepInstance.findMany({
      where: {
        processId,
        // assignedTo: userData.id,
        // OR: [{ status: "IN_PROGRESS" }, { status: "APPROVED" }],
      },
      select: {
        id: true,
        createdAt: true,
        decisionAt: true,
        status: true,
        workflowStep: { select: { stepName: true, stepNumber: true } },
      },
    });

    const stepInstanceIds = userStepInstances.map((s) => s.id);

    // Fetch actions
    const [
      documentHistory,
      documentSignatures,
      documentRejections,
      processQAs,
      recommendations,
      processInstance,
    ] = await Promise.all([
      prisma.documentHistory.findMany({
        where: {
          processId,
          userId: userData.id,
          createdAt: { gte: timeStart, lte: timeEnd },
        },
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
          replacedDocument: { select: { id: true, name: true, path: true } },
          user: { select: { id: true, name: true, username: true } },
        },
      }),
      prisma.documentSignature.findMany({
        where: {
          processDocument: { processId },
          userId: userData.id,
          signedAt: { gte: timeStart, lte: timeEnd },
        },
        include: {
          processDocument: {
            include: {
              document: { select: { id: true, name: true, path: true } },
            },
          },
          user: { select: { id: true, username: true } },
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
              document: { select: { id: true, name: true, path: true } },
            },
          },
          user: { select: { id: true, username: true } },
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
        },
      }),
      prisma.processInstance.findFirst({
        where: { id: processId, initiatorId: userData.id },
        select: {
          id: true,
          name: true,
          createdAt: true,
          initiator: { select: { username: true } },
        },
      }),
    ]);

    // Format actions
    const activities = [];

    // Process Initiation
    if (processInstance) {
      activities.push({
        actionType: "PROCESS_INITIATED",
        description: `Initiated process "${processInstance.name}"`,
        createdAt: processInstance.createdAt.toISOString(),
        details: {
          processId: processInstance.id,
          processName: processInstance.name,
          initiatorName: processInstance.initiator.username,
        },
      });
    }

    // Document History
    // documentHistory.forEach((history) => {
    //   activities.push({
    //     actionType: `DOCUMENT_${history.actionType}`,
    //     description: `${history.actionType.toLowerCase()} "${
    //       history.document.name
    //     }"`,
    //     createdAt: history.createdAt.toISOString(),
    //     details: {
    //       documentId: history.document.id,
    //       name: history.document.name,
    //       type: history.document.type,
    //       path: history.document.path,
    //       tags: history.document.tags,
    //       actionDetails: history.actionDetails || [],
    //       replacedDocument: history.replacedDocument
    //         ? {
    //             id: history.replacedDocument.id,
    //             name: history.replacedDocument.name,
    //             path: history.replacedDocument.path,
    //           }
    //         : null,
    //       user: history.user.name,
    //       isRecirculationTrigger: history.isRecirculationTrigger,
    //     },
    //   });
    // });

    // Document Signatures
    documentSignatures.forEach((sig) => {
      activities.push({
        actionType: "DOCUMENT_SIGNED",
        description: `Signed "${sig.processDocument.document.name}"`,
        createdAt: sig.signedAt.toISOString(),
        details: {
          signedBy: sig.user.username,
          signedAt: sig.signedAt.toISOString(),
          remarks: sig.reason || null,
          byRecommender: sig.byRecommender,
          isAttachedWithRecommendation: sig.isAttachedWithRecommendation,
          documentId: sig.processDocument.documentId,
          name: sig.processDocument.document.name,
          path: make_path(sig.processDocument.document.path),
        },
      });
    });

    // Document Rejections
    documentRejections.forEach((dr) => {
      activities.push({
        actionType: "DOCUMENT_REJECTED",
        description: `Rejected "${dr.processDocument.document.name}"`,
        createdAt: dr.rejectedAt.toISOString(),
        details: {
          rejectedBy: dr.user.username,
          rejectionReason: dr.reason || null,
          rejectedAt: dr.rejectedAt.toISOString(),
          byRecommender: dr.byRecommender,
          isAttachedWithRecommendation: dr.isAttachedWithRecommendation,
          documentId: dr.processDocument.documentId,
          name: dr.processDocument.document.name,
          path: make_path(dr.processDocument.document.path),
        },
      });
    });

    // Process QAs
    const queryDetails = await Promise.all(
      processQAs.map(async (qa) => {
        const documentHistoryIds = [
          ...(qa.details?.documentChanges?.map((dc) => dc.documentHistoryId) ||
            []),
          ...(qa.details?.documentSummaries?.map(
            (ds) => ds.documentHistoryId
          ) || []),
        ];
        const documentHistories = documentHistoryIds.length
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
                  select: { id: true, name: true, path: true },
                },
                user: { select: { id: true, name: true, username: true } },
              },
            })
          : [];

        const baseDetails = {
          stepInstanceId: qa.stepInstanceId || null,
          stepName: qa.stepInstance?.workflowStep?.stepName || null,
          stepNumber: qa.stepInstance?.workflowStep?.stepNumber || null,
          status: qa.stepInstance?.status || null,
          queryText: qa.question,
          initiatorName: qa.initiator.name,
          createdAt: qa.createdAt.toISOString(),
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
                      path: make_path(history.document.path),
                      tags: history.document.tags,
                    }
                  : null,
                actionDetails: history?.actionDetails || null,
                user: history?.user?.name || null,
                createdAt: history?.createdAt?.toISOString() || null,
                replacedDocument: history?.replacedDocument
                  ? {
                      id: history.replacedDocument.id,
                      name: history.replacedDocument.name,
                      path: make_path(history.replacedDocument.path),
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
                      path: make_path(history.document.path),
                    }
                  : null,
                user: history?.user?.username || null,
                createdAt: history?.createdAt?.toISOString() || null,
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

        const actions = [];
        if (qa.initiatorId === userData.id) {
          actions.push({
            actionType: "QUERY_RAISED",
            description: `Raised query: "${qa.question}"`,
            createdAt: qa.createdAt.toISOString(),
            details: { ...baseDetails, taskType: "QUERY_UPLOAD" },
          });
        }
        if (qa.entityId === userData.id && qa.status === "RESOLVED") {
          actions.push({
            actionType: "QUERY_RESOLVED",
            description: `Resolved query: "${qa.question}"`,
            createdAt:
              qa.answeredAt?.toISOString() || qa.createdAt.toISOString(),
            details: {
              ...baseDetails,
              taskType: "RESOLVED",
              answerText: qa.answer || null,
              answeredAt: qa.answeredAt?.toISOString() || null,
            },
          });
        }
        return actions;
      })
    );

    // Recommendations
    const recommendationDetails = await Promise.all(
      recommendations.map(async (rec) => {
        const documentSummaries = rec.documentSummaries || [];
        const documentResponses = rec.details?.documentResponses || [];
        const documentIds = documentSummaries.map((ds) =>
          parseInt(ds.documentId)
        );
        const documents = documentIds.length
          ? await prisma.document.findMany({
              where: { id: { in: documentIds } },
              select: { id: true, name: true, path: true },
            })
          : [];

        const documentMap = documents.reduce((map, doc) => {
          map[doc.id] = { name: doc.name, path: make_path(doc.path) };
          return map;
        }, {});

        const documentDetails = documentSummariess.map((ds) => {
          const response = documentResponses.find(
            (dr) => dr.documentId === parseInt(ds.documentId)
          );
          return {
            documentId: ds.documentId,
            documentName:
              documentMap[ds.documentId]?.name || "Unknown Document",
            documentPath: documentMap[ds.documentId]?.path
              ? documentMap[ds.documentId].path.substring(
                  0,
                  documentMap[ds.documentId].path.lastIndexOf("/")
                )
              : "Unknown Path",
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
              stepName: stepInstance?.workflowStep?.stepName || null,
              stepNumber: stepInstance?.workflowStep?.stepNumber || null,
              status: rec.status,
              recommendationText: rec.recommendationText,
              initiatorName: rec.initiator.username,
              recommenderName: rec.recommender.username,
              createdAt: rec.createdAt.toISOString(),
              responseText: rec.responseText || null,
              respondedAt: rec.respondedAt
                ? rec.respondedAt.toISOString()
                : null,
              documentDetails,
              documentResponses: documentResponses || [],
            },
          });
        }
        if (rec.recommenderId === userData.id && rec.status === "RESOLVED") {
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
              stepName: stepInstance?.workflowStep?.stepName || null,
              stepNumber: stepInstance?.workflowStep?.stepNumber || null,
              status: rec.status,
              recommendationText: rec.recommendationText,
              initiatorName: rec.initiator.username,
              recommenderName: rec.recommender.username,
              createdAt: rec.createdAt.toISOString(),
              responseText: rec.responseText || null,
              respondedAt: rec.respondedAt
                ? rec.respondedAt.toISOString()
                : null,
              documentDetails,
              documentResponses: documentResponses || [],
            },
          });
        }
        return actions;
      })
    );

    // Step Completion
    userStepInstances.forEach((step) => {
      if (step.status === "APPROVED" && step.decisionAt) {
        activities.push({
          actionType: "STEP_COMPLETED",
          description: `Completed step "${step.workflowStep?.stepName}"`,
          createdAt: step.decisionAt.toISOString(),
          details: {
            stepInstanceId: step.id,
            stepName: step.workflowStep?.stepName,
            stepNumber: step.workflowStep?.stepNumber || null,
          },
        });
      }
    });

    // Combine and sort actions
    const allActivities = [
      ...activities,
      ...queryDetails.flat(),
      ...recommendationDetails.flat(),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // If no activities, return 404 to indicate no relevant user actions
    if (allActivities.length === 0) {
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
        activities: allActivities,
      },
    });
  } catch (error) {
    console.error("Error fetching user activity log:", error);
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

export const make_path = (path_) => {
  const parts = path_.split("/");
  parts.pop();
  const updatedPath = parts.join("/");
  return updatedPath;
};
