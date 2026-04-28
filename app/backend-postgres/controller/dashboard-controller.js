import { PrismaClient } from "@prisma/client";
import { verifyUser } from "../utility/verifyUser.js"; // Untouched - natively imports your function

const prisma = new PrismaClient();

// ─── Helpers ───────────────────────────────────────────────────────────────

const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate)
    throw new Error("Start date and end date are required");
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  if (isNaN(start.getTime()) || isNaN(end.getTime()))
    throw new Error("Invalid date format");
  if (start > end) throw new Error("Start date must be before end date");
  return { start, end };
};

const formatDocumentPath = (path) =>
  path ? path.split("/").slice(0, -1).join("/") : "";
const getDocType = (path) => (path ? path.split(".").pop().toLowerCase() : "");

const isUserAdmin = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return false;
  if (user.isAdmin || user.isRootLevel) return true;
  return user.roles.some((ur) => ur.role.isAdmin || ur.role.isRootLevel);
};

const getUserRolesAndDepartments = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } }, branches: true },
  });
  return {
    userRoleIds: user?.roles.map((r) => r.roleId) || [],
    userDepartmentIds: user?.branches.map((b) => b.id) || [],
  };
};

const getAllowedDocumentIds = async (userId, userRoleIds) => {
  const accesses = await prisma.documentAccess.findMany({
    where: { OR: [{ userId }, { roleId: { in: userRoleIds } }] },
  });

  const allowed = new Set();
  const getAllChildren = async (parentId) => {
    const children = await prisma.document.findMany({
      where: { parentId },
      select: { id: true },
    });
    for (const c of children) {
      allowed.add(c.id);
      await getAllChildren(c.id);
    }
  };

  for (const a of accesses) {
    allowed.add(a.documentId);
    if (a.accessLevel === "FULL") await getAllChildren(a.documentId);
  }

  const userDocs = await prisma.document.findMany({
    where: { createdById: userId },
    select: { id: true },
  });
  userDocs.forEach((d) => allowed.add(d.id));
  return Array.from(allowed);
};

const getAllowedWorkflowIds = async (userId, userRoleIds) => {
  const assignments = await prisma.workflowAssignment.findMany({
    where: {
      OR: [
        { assigneeType: "USER", assigneeIds: { has: userId } },
        { assigneeType: "ROLE", selectedRoles: { hasSome: userRoleIds } },
        { assigneeType: "DEPARTMENT", selectedRoles: { hasSome: userRoleIds } },
      ],
    },
    select: { step: { select: { workflowId: true } } },
  });
  return [
    ...new Set(assignments.map((a) => a.step?.workflowId).filter(Boolean)),
  ];
};

const getAllowedProcessIds = async (
  userId,
  userRoleIds,
  userDepartmentIds,
  allowedWorkflowIds,
) => {
  const [initiated, assigned, workflowProcs] = await Promise.all([
    prisma.processInstance.findMany({
      where: { initiatorId: userId },
      select: { id: true },
    }),
    prisma.processStepInstance.findMany({
      where: {
        OR: [
          { assignedTo: userId },
          { roleId: { in: userRoleIds } },
          { departmentId: { in: userDepartmentIds } },
        ],
      },
      select: { processId: true },
    }),
    prisma.processInstance.findMany({
      where: { workflowId: { in: allowedWorkflowIds } },
      select: { id: true },
    }),
  ]);
  return Array.from(
    new Set([
      ...initiated.map((p) => p.id),
      ...assigned.map((p) => p.processId),
      ...workflowProcs.map((p) => p.id),
    ]),
  );
};

// ─── 1. getNumbers (Global Metrics) ─────────────────────────────────────────
// Everyone sees top-level system stats. No rejected document stats.
export const getNumbers = async (req, res) => {
  try {
    const userData = await verifyUser(
      req.headers["authorization"]?.substring(7),
    );
    if (userData === "Unauthorized")
      return res.status(401).json({ message: "Unauthorized request" });

    const { startDate, endDate } = req.query;
    const { start, end } = validateDateRange(startDate, endDate);

    const [
      activeWorkflows,
      completedProcesses,
      pendingProcesses,
      queries,
      signedDocuments,
      replacedDocuments,
      metadataOnlyDocs,
      physTotal,
      physPending,
    ] = await Promise.all([
      prisma.workflow.count({
        where: {
          createdAt: { gte: start, lte: end },
          processes: { some: { status: "IN_PROGRESS" } },
        },
      }),
      prisma.processInstance.count({
        where: { status: "COMPLETED", createdAt: { gte: start, lte: end } },
      }),
      prisma.processInstance.count({
        where: { status: "IN_PROGRESS", createdAt: { gte: start, lte: end } },
      }),
      prisma.processQA
        .count({ where: { createdAt: { gte: start, lte: end } } })
        .then(async (total) => ({
          total,
          solved: await prisma.processQA.count({
            where: { createdAt: { gte: start, lte: end }, status: "RESOLVED" },
          }),
        })),
      prisma.documentSignature.count({
        where: { signedAt: { gte: start, lte: end } },
      }),
      prisma.documentHistory.count({
        where: { actionType: "REPLACED", createdAt: { gte: start, lte: end } },
      }),
      prisma.processDocument.count({
        where: {
          isMetadataOnly: true,
          metadataFulfilledAt: null,
          process: { createdAt: { gte: start, lte: end } },
        },
      }),
      prisma.physicalDocumentRequest.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.physicalDocumentRequest.count({
        where: {
          createdAt: { gte: start, lte: end },
          status: {
            in: [
              "PENDING_ADMIN_APPROVAL",
              "PENDING_HOD_APPROVAL",
              "PENDING_USER_RESPONSE",
            ],
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        activeWorkflows,
        completedProcesses,
        pendingProcesses,
        queries,
        signedDocuments,
        replacedDocuments,
        sop: { metadataOnlyPending: metadataOnlyDocs },
        physicalRequests: { total: physTotal, pending: physPending },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to retrieve numeric data",
        details: error.message,
      },
    });
  }
};

// ─── 2. getDetails (Scoped detailed lists) ──────────────────────────────────
export const getDetails = async (req, res) => {
  try {
    const userData = await verifyUser(
      req.headers["authorization"]?.substring(7),
    );
    if (userData === "Unauthorized")
      return res.status(401).json({ message: "Unauthorized request" });

    const { startDate, endDate } = req.query;
    const { start, end } = validateDateRange(startDate, endDate);

    const isAdmin = await isUserAdmin(userData.id);

    let docFilter = {},
      wfFilter = {},
      processFilter = {},
      physFilter = {};

    if (!isAdmin) {
      const { userRoleIds, userDepartmentIds } =
        await getUserRolesAndDepartments(userData.id);
      const allowedDocumentIds = await getAllowedDocumentIds(
        userData.id,
        userRoleIds,
      );
      const allowedWorkflowIds = await getAllowedWorkflowIds(
        userData.id,
        userRoleIds,
      );
      const allowedProcessIds = await getAllowedProcessIds(
        userData.id,
        userRoleIds,
        userDepartmentIds,
        allowedWorkflowIds,
      );

      docFilter = { id: { in: allowedDocumentIds } };
      wfFilter = { id: { in: allowedWorkflowIds } };
      processFilter = { id: { in: allowedProcessIds } };
      physFilter = { requestingUserId: userData.id };
    }

    const [
      activeWorkflows,
      completedProcesses,
      pendingProcesses,
      queries,
      sopDocumentsList,
      nonSopDocumentsList,
      metadataOnlyList,
      physicalRequestsList,
    ] = await Promise.all([
      prisma.workflow.findMany({
        where: {
          ...wfFilter,
          createdAt: { gte: start, lte: end },
        },
        select: { id: true, name: true, version: true, createdAt: true },
      }),
      prisma.processInstance.findMany({
        where: {
          ...processFilter,
          status: "COMPLETED",
          createdAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          initiator: { select: { username: true } },
          workflow: { select: { id: true, name: true } },
        },
      }),
      prisma.processInstance.findMany({
        where: {
          ...processFilter,
          status: "IN_PROGRESS",
          createdAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          initiator: { select: { username: true } },
          workflow: { select: { id: true, name: true } },
          currentStep: { select: { stepName: true } },
        },
      }),
      prisma.processQA.findMany({
        where: {
          ...(!isAdmin
            ? { processId: { in: processFilter.id?.in || [] } }
            : {}),
          createdAt: { gte: start, lte: end },
        },
        include: {
          initiator: { select: { username: true } },
          process: {
            select: {
              id: true,
              name: true,
              workflow: { select: { name: true } },
            },
          },
        },
      }),
      prisma.processDocument.findMany({
        where: {
          isSopDocument: true,
          isMetadataOnly: false,
          process: { ...processFilter, createdAt: { gte: start, lte: end } },
        },
        include: {
          document: { select: { id: true, name: true, path: true } },
          process: {
            select: {
              id: true,
              name: true,
              workflow: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.processDocument.findMany({
        where: {
          isSopDocument: false,
          isMetadataOnly: false,
          process: { ...processFilter, createdAt: { gte: start, lte: end } },
        },
        include: {
          document: { select: { id: true, name: true, path: true } },
          process: {
            select: {
              id: true,
              name: true,
              workflow: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.processDocument.findMany({
        where: {
          isMetadataOnly: true,
          metadataFulfilledAt: null,
          process: { ...processFilter, createdAt: { gte: start, lte: end } },
        },
        include: {
          document: { include: { department: true } },
          process: {
            select: {
              id: true,
              name: true,
              initiator: { select: { username: true } },
            },
          },
        },
      }),
      prisma.physicalDocumentRequest.findMany({
        where: { ...physFilter, createdAt: { gte: start, lte: end } },
        include: {
          document: { select: { id: true, name: true, path: true } },
          department: { select: { id: true, name: true, code: true } },
          requestingUser: { select: { id: true, username: true, name: true } },
        },
      }),
    ]);

    // --- AGGREGATION ENGINE: Grouping details by Workflow ---
    const wfGroups = {};
    const initWfGroup = (workflow) => {
      const id = workflow?.id || "unassigned";
      if (!wfGroups[id]) {
        wfGroups[id] = {
          workflowId: id,
          workflowName: workflow?.name || "Ad-Hoc / Unassigned",
          pendingCount: 0,
          completedCount: 0,
          sopCount: 0,
          nonSopCount: 0,
          pendingProcesses: [],
          completedProcesses: [],
          sopDocuments: [],
          nonSopDocuments: [],
        };
      }
      return wfGroups[id];
    };

    pendingProcesses.forEach((p) => {
      const group = initWfGroup(p.workflow);
      group.pendingCount++;
      group.pendingProcesses.push({
        processId: p.id,
        processName: p.name,
        currentStep: p.currentStep?.stepName || "N/A",
        createdAt: p.createdAt.toISOString(),
        initiatorUsername: p.initiator?.username || "System",
      });
    });

    completedProcesses.forEach((p) => {
      const group = initWfGroup(p.workflow);
      group.completedCount++;
      group.completedProcesses.push({
        processId: p.id,
        processName: p.name,
        createdAt: p.createdAt.toISOString(),
        initiatorUsername: p.initiator?.username || "System",
      });
    });

    sopDocumentsList.forEach((d) => {
      const group = initWfGroup(d.process?.workflow);
      group.sopCount++;
      group.sopDocuments.push({
        documentId: d.documentId,
        documentName: d.document?.name || "Unknown",
        documentPath: formatDocumentPath(d.document?.path),
        documentType: getDocType(d.document?.path),
        processId: d.processId,
        processName: d.process?.name || "Unknown",
        issueNo: d.issueNo,
        partNumber: d.partNumber,
      });
    });

    nonSopDocumentsList.forEach((d) => {
      const group = initWfGroup(d.process?.workflow);
      group.nonSopCount++;
      group.nonSopDocuments.push({
        documentId: d.documentId,
        documentName: d.document?.name || "Unknown",
        documentPath: formatDocumentPath(d.document?.path),
        documentType: getDocType(d.document?.path),
        processId: d.processId,
        processName: d.process?.name || "Unknown",
        issueNo: d.issueNo,
      });
    });

    const structuredWorkflows = Object.values(wfGroups).sort(
      (a, b) =>
        b.pendingCount + b.completedCount - (a.pendingCount + a.completedCount),
    );

    // Enriched list of active workflows for the Workflows tab
    const enrichedWorkflows = activeWorkflows.map((w) => {
      const stats = wfGroups[w.id] || {
        pendingCount: 0,
        completedCount: 0,
        sopCount: 0,
        nonSopCount: 0,
      };
      return {
        workflowId: w.id,
        name: w.name,
        version: w.version,
        createdAt: w.createdAt.toISOString(),
        pendingCount: stats.pendingCount,
        completedCount: stats.completedCount,
        sopCount: stats.sopCount,
        nonSopCount: stats.nonSopCount,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        structuredWorkflows,
        enrichedWorkflows,
        queries: {
          details: queries.map((q) => ({
            queryText: q.question,
            initiatorName: q.initiator?.username || "System",
            createdAt: q.createdAt.toISOString(),
            processId: q.process?.id,
            processName: q.process?.name || "Unknown",
            workflowName: q.process?.workflow?.name || "Unknown",
            status: q.answer ? "RESOLVED" : "OPEN",
          })),
        },
        metadataOnlyDocuments: metadataOnlyList.map((d) => ({
          processDocumentId: d.id,
          documentId: d.documentId,
          intendedFileName: d.metaFileName || d.document?.name || "Unknown",
          intendedExtension: d.metaFileExtension || "unknown",
          processId: d.processId,
          processName: d.process?.name || "Unknown",
          initiator: d.process?.initiator?.username || "System",
          departmentName: d.document?.department?.name || "Unassigned",
          issueNo: d.issueNo,
          partNumber: d.partNumber,
          isSopDocument: d.isSopDocument !== false,
        })),
        physicalRequests: physicalRequestsList.map((r) => ({
          requestId: r.id,
          documentName: r.document?.name || "Unknown",
          documentType: getDocType(r.document?.path),
          departmentName: r.department?.name || "Unknown",
          requestedBy:
            r.requestingUser?.username || r.requestingUser?.name || "System",
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to retrieve detailed data",
        details: error.message,
      },
    });
  }
};

// ─── 3. getEntityAnalytics (Scoped deep analytics) ─────────────────────────
export const getEntityAnalytics = async (req, res) => {
  try {
    const userData = await verifyUser(
      req.headers["authorization"]?.substring(7),
    );
    if (userData === "Unauthorized")
      return res.status(401).json({ message: "Unauthorized request" });

    const { startDate, endDate } = req.query;
    const { start, end } = validateDateRange(startDate, endDate);
    const isAdmin = await isUserAdmin(userData.id);

    let processFilter = {},
      wfFilter = {},
      physFilter = {};
    if (!isAdmin) {
      const { userRoleIds, userDepartmentIds } =
        await getUserRolesAndDepartments(userData.id);
      const allowedWorkflowIds = await getAllowedWorkflowIds(
        userData.id,
        userRoleIds,
      );
      const allowedProcessIds = await getAllowedProcessIds(
        userData.id,
        userRoleIds,
        userDepartmentIds,
        allowedWorkflowIds,
      );
      processFilter = { id: { in: allowedProcessIds } };
      wfFilter = { id: { in: allowedWorkflowIds } };
      physFilter = { requestingUserId: userData.id };
    }

    const missingDocs = await prisma.processDocument.findMany({
      where: {
        isMetadataOnly: true,
        metadataFulfilledAt: null,
        process: { ...processFilter, createdAt: { gte: start, lte: end } },
      },
      include: {
        document: { include: { department: true } },
        process: { include: { initiator: true } },
      },
    });

    const missingByDeptMap = {};
    for (const doc of missingDocs) {
      const deptId = doc.document?.departmentId || "unassigned";
      if (!missingByDeptMap[deptId]) {
        missingByDeptMap[deptId] = {
          departmentId: deptId,
          departmentName: doc.document?.department?.name || "Unassigned",
          deptCode: doc.document?.department?.code || "",
          count: 0,
          sopCount: 0,
          nonSopCount: 0,
          documents: [],
        };
      }
      missingByDeptMap[deptId].count++;
      if (doc.isSopDocument !== false) missingByDeptMap[deptId].sopCount++;
      else missingByDeptMap[deptId].nonSopCount++;
      missingByDeptMap[deptId].documents.push({
        processDocumentId: doc.id,
        intendedFileName: `${doc.metaFileName || "Unknown"}.${doc.metaFileExtension || "?"}`,
        processId: doc.process?.id,
        processName: doc.process?.name || "Unknown",
        initiator: doc.process?.initiator?.username || "System",
        isSopDocument: doc.isSopDocument !== false,
      });
    }

    const physReqs = await prisma.physicalDocumentRequest.findMany({
      where: { ...physFilter, createdAt: { gte: start, lte: end } },
      include: { document: true, department: true, requestingUser: true },
    });

    const physByDeptMap = {};
    for (const r of physReqs) {
      const deptId = r.departmentId;
      if (!physByDeptMap[deptId]) {
        physByDeptMap[deptId] = {
          departmentId: deptId,
          departmentName: r.department?.name || "Unknown",
          total: 0,
          pending: 0,
          approved: 0,
          returned: 0,
          requests: [],
        };
      }
      physByDeptMap[deptId].total++;
      if (
        [
          "PENDING_ADMIN_APPROVAL",
          "PENDING_HOD_APPROVAL",
          "PENDING_USER_RESPONSE",
        ].includes(r.status)
      )
        physByDeptMap[deptId].pending++;
      else if (["ADMIN_APPROVED", "HOD_APPROVED"].includes(r.status))
        physByDeptMap[deptId].approved++;
      else if (r.status === "DOC_RETURNED") physByDeptMap[deptId].returned++;

      physByDeptMap[deptId].requests.push({
        requestId: r.id,
        documentName: r.document?.name || "Unknown",
        requestedBy: r.requestingUser?.username || "System",
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      });
    }

    const workflows = await prisma.workflow.findMany({
      where: { ...wfFilter, createdAt: { gte: start, lte: end } },
      include: {
        processes: {
          select: {
            id: true,
            documents: {
              where: { isMetadataOnly: false },
              select: { isSopDocument: true },
            },
          },
        },
      },
    });

    const wfFamilyMap = {};
    for (const wf of workflows) {
      const rootId = wf.parentWorkflowId || wf.id;
      if (!wfFamilyMap[rootId])
        wfFamilyMap[rootId] = {
          familyId: rootId,
          familyName: wf.name,
          totalSop: 0,
          totalNonSop: 0,
          totalProcesses: 0,
          workflows: [],
        };

      let sop = 0,
        nonSop = 0;
      wf.processes.forEach((p) =>
        p.documents.forEach((d) => (d.isSopDocument ? sop++ : nonSop++)),
      );

      wfFamilyMap[rootId].totalSop += sop;
      wfFamilyMap[rootId].totalNonSop += nonSop;
      wfFamilyMap[rootId].totalProcesses += wf.processes.length;
      wfFamilyMap[rootId].workflows.push({
        workflowId: wf.id,
        name: wf.name,
        version: wf.version,
      });
    }

    const qaRecords = await prisma.processQA.findMany({
      where: {
        ...(!isAdmin ? { processId: { in: processFilter.id?.in || [] } } : {}),
        createdAt: { gte: start, lte: end },
      },
      include: {
        process: { select: { workflow: { select: { id: true, name: true } } } },
      },
    });

    const queriesByWfMap = {};
    for (const q of qaRecords) {
      const wf = q.process?.workflow;
      if (!wf) continue;
      if (!queriesByWfMap[wf.id])
        queriesByWfMap[wf.id] = {
          workflowId: wf.id,
          workflowName: wf.name,
          total: 0,
          resolved: 0,
          open: 0,
        };
      queriesByWfMap[wf.id].total++;
      if (q.status === "RESOLVED") queriesByWfMap[wf.id].resolved++;
      else queriesByWfMap[wf.id].open++;
    }

    return res.status(200).json({
      success: true,
      data: {
        departmentMissingFiles: Object.values(missingByDeptMap).sort(
          (a, b) => b.count - a.count,
        ),
        departmentPhysicalDemand: Object.values(physByDeptMap).sort(
          (a, b) => b.total - a.total,
        ),
        workflowFamilyDocStats: Object.values(wfFamilyMap).sort(
          (a, b) => b.totalSop + b.totalNonSop - (a.totalSop + a.totalNonSop),
        ),
        queriesPerWorkflow: Object.values(queriesByWfMap).sort(
          (a, b) => b.total - a.total,
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to retrieve entity analytics",
        details: error.message,
      },
    });
  }
};

// ─── 4. getWorkflowAnalysis ──────────────────────────────────────────────────
export const getWorkflowAnalysis = async (req, res) => {
  try {
    const userData = await verifyUser(
      req.headers["authorization"]?.substring(7),
    );
    if (userData === "Unauthorized")
      return res.status(401).json({ message: "Unauthorized request" });

    const { workflowId } = req.params;
    const { startDate, endDate } = req.query;
    const { start, end } = validateDateRange(startDate, endDate);
    const isAdmin = await isUserAdmin(userData.id);

    if (!isAdmin) {
      const { userRoleIds } = await getUserRolesAndDepartments(userData.id);
      const allowedWorkflowIds = await getAllowedWorkflowIds(
        userData.id,
        userRoleIds,
      );
      if (!allowedWorkflowIds.includes(workflowId)) {
        return res.status(403).json({
          success: false,
          error: { message: "Access denied", code: "WORKFLOW_ACCESS_DENIED" },
        });
      }
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      select: {
        id: true,
        name: true,
        version: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        steps: {
          select: {
            id: true,
            stepName: true,
            stepNumber: true,
            stepType: true,
          },
        },
      },
    });

    if (!workflow)
      return res.status(404).json({
        success: false,
        error: { message: "Workflow not found", code: "WORKFLOW_NOT_FOUND" },
      });

    const [
      stepCompletionTimes,
      pendingProcessesByStep,
      assigneeCompletionTimes,
      pendingProcesses,
      queries,
      signedDocuments,
    ] = await Promise.all([
      Promise.all(
        workflow.steps.map(async (step) => {
          const instances = await prisma.processStepInstance.findMany({
            where: {
              stepId: step.id,
              status: "APPROVED",
              createdAt: { gte: start, lte: end },
              decisionAt: { not: null },
            },
            select: { createdAt: true, decisionAt: true },
          });
          const avg = instances.length
            ? instances.reduce(
                (s, i) =>
                  s +
                  (i.decisionAt.getTime() - i.createdAt.getTime()) / 3600000,
                0,
              ) / instances.length
            : null;
          return {
            stepId: step.id,
            stepName: step.stepName,
            stepNumber: step.stepNumber,
            stepType: step.stepType,
            averageCompletionTimeHours: avg ? avg.toFixed(2) : null,
          };
        }),
      ),
      Promise.all(
        workflow.steps.map(async (step) => {
          const procs = await prisma.processStepInstance.findMany({
            where: {
              stepId: step.id,
              status: "IN_PROGRESS",
              process: { workflowId, createdAt: { gte: start, lte: end } },
            },
            include: {
              process: {
                select: {
                  id: true,
                  name: true,
                  createdAt: true,
                  initiator: { select: { username: true } },
                },
              },
            },
          });
          return {
            stepId: step.id,
            stepName: step.stepName,
            stepNumber: step.stepNumber,
            pendingCount: procs.length,
            processes: procs.map((p) => ({
              processId: p.process?.id,
              processName: p.process?.name,
              createdAt: p.process?.createdAt.toISOString(),
              createdBy: p.process?.initiator?.username || "System",
            })),
          };
        }),
      ),
      prisma.processStepInstance
        .findMany({
          where: {
            process: { workflowId, createdAt: { gte: start, lte: end } },
            status: "APPROVED",
            decisionAt: { not: null },
          },
          select: { assignedTo: true, createdAt: true, decisionAt: true },
        })
        .then(async (instances) => {
          const grouped = instances.reduce((a, i) => {
            if (!a[i.assignedTo]) a[i.assignedTo] = [];
            a[i.assignedTo].push(i);
            return a;
          }, {});
          const users = await prisma.user.findMany({
            where: { id: { in: Object.keys(grouped).map(Number) } },
            select: { id: true, username: true },
          });
          const um = new Map(users.map((u) => [u.id, u.username]));
          return Object.entries(grouped).map(([id, insts]) => {
            const totalH = insts.reduce(
              (s, i) =>
                i.decisionAt && i.createdAt
                  ? s +
                    (i.decisionAt.getTime() - i.createdAt.getTime()) / 3600000
                  : s,
              0,
            );
            return {
              assigneeId: Number(id),
              assigneeUsername: um.get(Number(id)) || "Unknown",
              averageCompletionTimeHours: insts.length
                ? parseFloat((totalH / insts.length).toFixed(2))
                : null,
              totalTasks: insts.length,
            };
          });
        }),
      prisma.processInstance
        .findMany({
          where: {
            workflowId,
            status: "IN_PROGRESS",
            createdAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
            initiator: { select: { username: true } },
          },
        })
        .then((ps) =>
          ps.map((p) => ({
            processId: p.id,
            processName: p.name,
            createdAt: p.createdAt.toISOString(),
            initiatorUsername: p.initiator?.username || "System",
          })),
        ),
      prisma.processQA
        .findMany({
          where: {
            process: { workflowId },
            createdAt: { gte: start, lte: end },
          },
          include: {
            initiator: { select: { username: true } },
            process: { select: { id: true, name: true } },
          },
        })
        .then((qs) => ({
          total: qs.length,
          solved: qs.filter((q) => q.status === "RESOLVED").length,
          details: qs.map((q) => ({
            id: q.id,
            queryText: q.question,
            initiatorName: q.initiator?.username || "System",
            createdAt: q.createdAt.toISOString(),
            processName: q.process?.name || "Unknown",
            status: q.status,
          })),
        })),
      prisma.documentSignature
        .findMany({
          where: {
            processDocument: { process: { workflowId } },
            signedAt: { gte: start, lte: end },
          },
          include: {
            processDocument: {
              include: {
                document: { select: { id: true, name: true, path: true } },
                process: { select: { id: true, name: true } },
              },
            },
          },
        })
        .then((sigs) =>
          sigs.map((s) => ({
            documentName: s.processDocument?.document?.name || "Unknown",
            processName: s.processDocument?.process?.name || "Unknown",
            signedAt: s.signedAt.toISOString(),
          })),
        ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        workflow: {
          workflowId: workflow.id,
          name: workflow.name,
          version: workflow.version,
          description: workflow.description,
          createdAt: workflow.createdAt.toISOString(),
          updatedAt: workflow.updatedAt.toISOString(),
        },
        stepCompletionTimes,
        pendingProcessesByStep,
        assigneeCompletionTimes,
        pendingProcesses: {
          total: pendingProcesses.length,
          details: pendingProcesses,
        },
        queries,
        signedDocuments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to analyze workflow",
        details: error.message,
        code: "WORKFLOW_ANALYSIS_ERROR",
      },
    });
  }
};
