import { PrismaClient } from "@prisma/client";

import { verifyUser } from "../utility/verifyUser.js";
import { file_copy } from "./file-controller.js";
import { buildRoleHierarchyForAssignment } from "./process-controller.js";
import {
  createFolder,
  createUserPermissions,
  getParentPath,
  storeChildIdInParentDocument,
} from "./file-controller.js";
import fs from "fs/promises";
import { createWriteStream, createReadStream, read } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, normalize, extname } from "path";
import fsCB from "fs";
import path from "path";
import XLSX from "xlsx";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { Document, Packer, Paragraph } from "docx";
import officegen from "officegen";
import { generateUniqueDocumentName } from "./process-controller.js";

const STORAGE_PATH = process.env.STORAGE_PATH;

const prisma = new PrismaClient();

export const add_workflow = async (req, res) => {
  const accessToken = req.headers["authorization"]?.substring(7);
  const userData = await verifyUser(accessToken);

  if (userData === "Unauthorized") {
    return res.status(401).json({ message: "Unauthorized request" });
  }

  const createdById = userData.id;
  const { name, description, steps, parentWorkflowId } = req.body;

  if (!name || !steps || !steps.length) {
    return res
      .status(400)
      .json({ error: "Workflow name and steps are required." });
  }

  try {
    const workflow = await prisma.$transaction(async (tx) => {
      const newWorkflow = await tx.workflow.create({
        data: {
          name,
          description,
          createdById,
          version: 1,
          parentWorkflowId: parentWorkflowId || null,
        },
      });

      const stepRecords = await Promise.all(
        steps.map((step, index) =>
          tx.workflowStep.create({
            data: {
              workflowId: newWorkflow.id,
              stepNumber: index + 1,
              stepName: step.stepName,
              allowParallel: step.allowParallel ?? false,
              requiresDocument: step.requiresDocument ?? true,
            },
          }),
        ),
      );

      for (let i = 0; i < steps.length; i++) {
        const assignments = steps[i].assignments || [];

        for (const assignee of assignments) {
          const assigneeIds = (assignee.assigneeIds || [])
            .map((x) => x.id)
            .filter(Boolean);

          const roleIds = (assignee.selectedRoles || []).flatMap((dept) =>
            (dept.roles || []).map((r) => r.id),
          );

          const firstSelectedRole =
            Array.isArray(assignee.selectedRoles) &&
            assignee.selectedRoles.length > 0
              ? assignee.selectedRoles[0]
              : null;
          const allowParallel = firstSelectedRole?.allowParallel ?? false;
          const direction = firstSelectedRole?.direction ?? null;

          const assignment = await tx.workflowAssignment.create({
            data: {
              stepId: stepRecords[i].id,
              assigneeType: assignee.assigneeType,
              assigneeIds,
              actionType: assignee.actionType,
              accessTypes: assignee.accessTypes ?? [],
              direction,
              allowParallel,
              selectedRoles: roleIds,
            },
          });

          if (assignee.assigneeType === "DEPARTMENT") {
            const departmentRoleRows = [];

            for (const dept of assignee.selectedRoles || []) {
              const departmentId = dept.department;
              const deptDirection = dept.direction ?? null;
              const deptAllowParallel = dept.allowParallel ?? false;

              for (const role of dept.roles || []) {
                departmentRoleRows.push({
                  workflowAssignmentId: assignment.id,
                  departmentId,
                  roleId: role.id,
                  direction: deptDirection,
                  allowParallel: deptAllowParallel,
                });
              }
            }

            if (departmentRoleRows.length) {
              await tx.departmentRoleAssignment.createMany({
                data: departmentRoleRows,
              });
            }
          }
        }
      }

      await createFolder(true, `../${name}`, userData);

      return newWorkflow;
    });

    return res.status(201).json({
      message: "Workflow created successfully",
      workflow,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to create workflow",
    });
  }
};

export const edit_workflow = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { name, description, steps, parentWorkflowId } = req.body;
    const workflowId = req.params.workflowId;

    const oldWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!oldWorkflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const updatedWorkflow = await prisma.$transaction(async (tx) => {
      const latestVersion = await tx.workflow.findFirst({
        where: { name: oldWorkflow.name },
        orderBy: { version: "desc" },
      });

      const newWorkflow = await tx.workflow.create({
        data: {
          name,
          description,
          createdById: userData.id,
          version: latestVersion ? latestVersion.version + 1 : 1,
          previousVersionId: oldWorkflow.id,
          isActive: true,
          parentWorkflowId:
            parentWorkflowId !== undefined
              ? parentWorkflowId
              : oldWorkflow.parentWorkflowId,
        },
      });

      const stepRecords = await Promise.all(
        steps.map((step, index) =>
          tx.workflowStep.create({
            data: {
              workflowId: newWorkflow.id,
              stepNumber: index + 1,
              stepName: step.stepName,
              allowParallel: step.allowParallel ?? false,
              requiresDocument: step.requiresDocument ?? true,
            },
          }),
        ),
      );

      for (let i = 0; i < steps.length; i++) {
        const assignments = steps[i].assignments || [];

        for (const assignee of assignments) {
          const assigneeIds = (assignee.assigneeIds || [])
            .map((x) => x.id)
            .filter(Boolean);

          const roleIds = (assignee.selectedRoles || []).flatMap((dept) =>
            (dept.roles || []).map((r) => r.id),
          );

          const firstSelectedRole =
            Array.isArray(assignee.selectedRoles) &&
            assignee.selectedRoles.length > 0
              ? assignee.selectedRoles[0]
              : null;
          const allowParallel = firstSelectedRole?.allowParallel ?? false;
          const direction = firstSelectedRole?.direction ?? null;

          const assignment = await tx.workflowAssignment.create({
            data: {
              stepId: stepRecords[i].id,
              assigneeType: assignee.assigneeType,
              assigneeIds,
              actionType: assignee.actionType,
              accessTypes: assignee.accessTypes ?? [],
              direction,
              allowParallel,
              selectedRoles: roleIds,
            },
          });

          if (assignee.assigneeType === "DEPARTMENT") {
            const departmentRoleRows = [];

            for (const dept of assignee.selectedRoles || []) {
              const departmentId = dept.department;
              const deptDirection = dept.direction ?? null;
              const deptAllowParallel = dept.allowParallel ?? false;

              for (const role of dept.roles || []) {
                departmentRoleRows.push({
                  workflowAssignmentId: assignment.id,
                  departmentId,
                  roleId: role.id,
                  direction: deptDirection,
                  allowParallel: deptAllowParallel,
                });
              }
            }

            if (departmentRoleRows.length) {
              await tx.departmentRoleAssignment.createMany({
                data: departmentRoleRows,
              });
            }
          }
        }
      }

      await tx.workflow.update({
        where: { id: oldWorkflow.id },
        data: { isActive: false },
      });

      await createFolder(true, `../${name}`, userData);

      return newWorkflow;
    });

    return res.status(200).json({
      message: "Workflow updated successfully",
      workflow: updatedWorkflow,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to update workflow",
    });
  }
};

export const get_active_workflow_families = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    // Fetches ONLY active workflows (the latest version in the game)
    const workflows = await prisma.workflow.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedWorkflows = workflows.map((workflow) => ({
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowDescription: workflow.description,
      version: workflow.version,
    }));

    return res.status(200).json(formattedWorkflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return res.status(500).json({
      error: "Failed to fetch workflows",
      details: error.message,
    });
  }
};

export const view_workflow = async (req, res) => {
  const { workflowId } = req.params;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        createdBy: { select: { id: true, username: true } },
        previousVersion: { select: { id: true, name: true, version: true } },
        steps: {
          include: {
            assignments: {
              include: {
                departmentRoles: {
                  include: { department: true, role: true },
                },
              },
            },
          },
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    if (!workflow) return res.status(404).json({ error: "Workflow not found" });

    // Fetch all role details in bulk
    const allRoleIds = new Set();
    workflow.steps.forEach((step) => {
      step.assignments.forEach((assignment) => {
        assignment.departmentRoles.forEach((dr) => allRoleIds.add(dr.roleId));
        if (
          assignment.assigneeType !== "DEPARTMENT" &&
          Array.isArray(assignment.selectedRoles)
        ) {
          assignment.selectedRoles.forEach((roleId) => allRoleIds.add(roleId));
        }
      });
    });

    const roles = await prisma.role.findMany({
      where: { id: { in: Array.from(allRoleIds) } },
      select: { id: true, role: true },
    });
    const roleMap = new Map(roles.map((r) => [r.id, r.role]));

    const formattedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      previousVersion: workflow.previousVersion,
      createdBy: workflow.createdBy.username,
      steps: workflow.steps.map((step) => ({
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        allowParallel: step.allowParallel,
        requiresDocument: step.requiresDocument,
        assignments: step.assignments.map((assignee) => {
          if (assignee.assigneeType === "DEPARTMENT") {
            // Group departmentRoles by department, picking direction/allowParallel from first row
            const deptMap = new Map();
            assignee.departmentRoles.forEach((dr) => {
              if (!deptMap.has(dr.departmentId)) {
                deptMap.set(dr.departmentId, {
                  department: {
                    id: dr.department.id,
                    name: dr.department.name,
                  },
                  roles: [],
                  direction: dr.direction,
                  allowParallel: dr.allowParallel,
                });
              }
              deptMap
                .get(dr.departmentId)
                .roles.push({ id: dr.role.id, name: dr.role.role });
            });

            return {
              assigneeType: assignee.assigneeType,
              assigneeIds: assignee.assigneeIds,
              actionType: assignee.actionType,
              accessTypes: assignee.accessTypes,
              direction: assignee.direction, // kept for backward compatibility
              allowParallel: assignee.allowParallel,
              selectedRoles: Array.from(deptMap.values()),
            };
          } else {
            return {
              assigneeType: assignee.assigneeType,
              assigneeIds: assignee.assigneeIds,
              actionType: assignee.actionType,
              accessTypes: assignee.accessTypes,
              direction: assignee.direction,
              allowParallel: assignee.allowParallel,
              selectedRoles: Array.isArray(assignee.selectedRoles)
                ? assignee.selectedRoles.map((roleId) => ({
                    id: roleId,
                    name: roleMap.get(roleId) || "Unknown Role",
                  }))
                : [],
            };
          }
        }),
      })),
    };

    return res.status(200).json(formattedWorkflow);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to retrieve workflow" });
  }
};

export const getWorkflowById = async (req, res) => {
  const { id } = req.params;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: id },
      include: {
        createdBy: { select: { id: true, username: true, email: true } },
        previousVersion: { select: { id: true, name: true, version: true } },
        steps: {
          include: {
            assignments: {
              include: {
                departmentRoles: {
                  include: { department: true, role: true },
                },
              },
            },
          },
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // 1. Collect ALL IDs across all assignments to fetch names in bulk
    const allUserIds = new Set();
    const allRoleIds = new Set();
    const allDeptIds = new Set();

    workflow.steps.forEach((step) => {
      step.assignments.forEach((assignment) => {
        // Collect IDs for selectedRoles (Department logic)
        assignment.departmentRoles.forEach((dr) => allRoleIds.add(dr.roleId));
        if (
          assignment.assigneeType !== "DEPARTMENT" &&
          Array.isArray(assignment.selectedRoles)
        ) {
          assignment.selectedRoles.forEach((roleId) => allRoleIds.add(roleId));
        }

        // Collect IDs for assigneeIds
        if (Array.isArray(assignment.assigneeIds)) {
          if (assignment.assigneeType === "USER") {
            assignment.assigneeIds.forEach((id) => allUserIds.add(id));
          } else if (assignment.assigneeType === "ROLE") {
            assignment.assigneeIds.forEach((id) => allRoleIds.add(id));
          } else if (assignment.assigneeType === "DEPARTMENT") {
            assignment.assigneeIds.forEach((id) => allDeptIds.add(id));
          }
        }
      });
    });

    // 2. Fetch real names from DB
    const [users, roles, depts] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: { id: true, username: true },
      }),
      prisma.role.findMany({
        where: { id: { in: Array.from(allRoleIds) } },
        select: { id: true, role: true },
      }),
      prisma.department.findMany({
        where: { id: { in: Array.from(allDeptIds) } },
        select: { id: true, name: true },
      }),
    ]);

    // 3. Create lookup maps
    const userMap = new Map(users.map((u) => [u.id, u.username]));
    const roleMap = new Map(roles.map((r) => [r.id, r.role]));
    const deptMapList = new Map(depts.map((d) => [d.id, d.name]));

    // 4. Format the final JSON
    const formattedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      status: workflow.status,
      createdAt: workflow.createdAt,
      parentWorkflowId: workflow.parentWorkflowId,
      previousVersion: workflow.previousVersion,
      createdBy: workflow.createdBy,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        allowParallel: step.allowParallel,
        requiresDocument: step.requiresDocument,
        assignments: step.assignments.map((assignee) => {
          // Map raw assigneeIds to { id, name } objects
          const mappedAssigneeIds = Array.isArray(assignee.assigneeIds)
            ? assignee.assigneeIds.map((id) => {
                let name = String(id);
                if (assignee.assigneeType === "USER")
                  name = userMap.get(id) || `User ${id}`;
                if (assignee.assigneeType === "ROLE")
                  name = roleMap.get(id) || `Role ${id}`;
                if (assignee.assigneeType === "DEPARTMENT")
                  name = deptMapList.get(id) || `Dept ${id}`;
                return { id, name };
              })
            : [];

          if (assignee.assigneeType === "DEPARTMENT") {
            const deptMap = new Map();
            assignee.departmentRoles.forEach((dr) => {
              if (!deptMap.has(dr.departmentId)) {
                deptMap.set(dr.departmentId, {
                  department: dr.department.name,
                  roles: [],
                  direction: dr.direction,
                  allowParallel: dr.allowParallel,
                });
              }
              deptMap
                .get(dr.departmentId)
                .roles.push({ id: dr.role.id, name: dr.role.role });
            });

            return {
              assigneeType: assignee.assigneeType,
              assigneeIds: mappedAssigneeIds,
              actionType: assignee.actionType,
              accessTypes: assignee.accessTypes,
              direction: assignee.direction,
              allowParallel: assignee.allowParallel,
              selectedRoles: Array.from(deptMap.values()),
            };
          } else {
            return {
              assigneeType: assignee.assigneeType,
              assigneeIds: mappedAssigneeIds,
              actionType: assignee.actionType,
              accessTypes: assignee.accessTypes,
              direction: assignee.direction,
              allowParallel: assignee.allowParallel,
              selectedRoles: Array.isArray(assignee.selectedRoles)
                ? assignee.selectedRoles.map((roleId) => ({
                    id: roleId,
                    name: roleMap.get(roleId) || "Unknown Role",
                  }))
                : [],
            };
          }
        }),
      })),
    };

    return res.status(200).json({ workflow: formattedWorkflow });
  } catch (error) {
    console.error("Error fetching workflow by ID:", error);
    return res.status(500).json({ error: "Failed to retrieve workflow" });
  }
};
/*
AS A URL PARAM: workflowId
*/
export const delete_workflow = async (req, res) => {
  const { workflowId } = req.params;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // FIX: Scan active processes across ALL family versions sharing the lineage name
    const activeProcesses = await prisma.processInstance.count({
      where: {
        workflow: { name: workflow.name },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    if (activeProcesses > 0) {
      return res.status(400).json({
        error: "Cannot deactivate workflow. Active processes are using it.",
      });
    }

    // FIX: Turn off isActive for ALL version mutations sharing the name
    await prisma.workflow.updateMany({
      where: { name: workflow.name },
      data: { isActive: false },
    });

    return res
      .status(200)
      .json({ message: "Workflow deactivated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to deactivate workflow" });
  }
};

async function getWorkflowLineage(workflowId) {
  const lineage = [];
  let currentId = workflowId;

  while (currentId) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, version: true, previousVersionId: true },
    });

    if (!workflow) break;

    lineage.push(workflow);
    currentId = workflow.previousVersionId;
  }

  return lineage;
}

export const get_workflows = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId: userData.id },
      select: { roleId: true },
    });
    const userRoleIds = userRoles.map((r) => r.roleId);

    const checkUserAccessToStep1 = async (workflowId) => {
      const step1Assignments = await prisma.workflowAssignment.findMany({
        where: {
          step: {
            workflowId: workflowId,
            stepNumber: 1,
          },
        },
        select: {
          assigneeType: true,
          assigneeIds: true,
          direction: true,
          allowParallel: true,
          selectedRoles: true,
        },
      });

      for (const assignment of step1Assignments) {
        switch (assignment.assigneeType) {
          case "USER":
            if (assignment.assigneeIds.includes(userData.id)) return true;
            break;
          case "ROLE":
            if (
              assignment.assigneeIds.some((roleId) =>
                userRoleIds.includes(roleId),
              )
            )
              return true;
            break;
          case "DEPARTMENT":
            const userDepartments = await prisma.department.findMany({
              where: { users: { some: { id: userData.id } } },
              select: { id: true },
            });
            const userDeptIds = userDepartments.map((d) => d.id);
            if (
              assignment.assigneeIds.some((deptId) =>
                userDeptIds.includes(deptId),
              ) &&
              assignment.selectedRoles.length > 0
            ) {
              const hierarchy = await buildRoleHierarchyForAssignment(
                assignment.direction,
                assignment.allowParallel,
                assignment.selectedRoles,
              );
              const targetRoles =
                assignment.direction === "UPWARDS"
                  ? hierarchy[0] || []
                  : hierarchy[hierarchy.length - 1] || [];
              if (targetRoles.some((roleId) => userRoleIds.includes(roleId)))
                return true;
            }
            break;
        }
      }
      return false;
    };

    const allActiveWorkflows = await prisma.workflow.findMany({
      select: { id: true, name: true, previousVersionId: true },
    });

    const workflowGroups = new Map();
    const processedWorkflows = new Set();

    for (const workflow of allActiveWorkflows) {
      if (processedWorkflows.has(workflow.id)) continue;

      const lineageVersions = [];
      let currentId = workflow.id;

      while (currentId) {
        const currentWorkflow = await prisma.workflow.findUnique({
          where: { id: currentId },
          select: {
            id: true,
            name: true,
            previousVersionId: true,
            isActive: true,
          },
        });
        if (!currentWorkflow) break;
        lineageVersions.push(currentWorkflow);
        processedWorkflows.add(currentWorkflow.id);
        currentId = currentWorkflow.previousVersionId;
      }

      const groupName = lineageVersions[0].name;

      // FIX: Deduping version lineage array using a nested Map keyed by workflow ID
      if (!workflowGroups.has(groupName)) {
        workflowGroups.set(groupName, new Map());
      }
      for (const v of lineageVersions) {
        workflowGroups.get(groupName).set(v.id, v);
      }
    }

    const filteredWorkflowGroups = new Map();

    for (const [groupName, versionsMap] of workflowGroups.entries()) {
      // FIX: Extract uniquely deduplicated values from the Map
      const workflowVersions = Array.from(versionsMap.values());
      const accessibleVersions = [];
      for (const version of workflowVersions) {
        if ((await checkUserAccessToStep1(version.id)) || userData.isAdmin) {
          accessibleVersions.push(version);
        }
      }

      if (accessibleVersions.length > 0) {
        const versionsWithDetails = await Promise.all(
          accessibleVersions.map(async (version) => {
            return await prisma.workflow.findUnique({
              where: { id: version.id },
              select: {
                id: true,
                name: true,
                description: true,
                version: true,
                createdAt: true,
                parentWorkflowId: true,
                parentWorkflow: { select: { name: true } },
                isActive: true,
                createdBy: { select: { id: true, name: true, email: true } },
                steps: {
                  orderBy: { stepNumber: "asc" },
                  select: {
                    stepNumber: true,
                    stepName: true,
                    allowParallel: true,
                    requiresDocument: true,
                    assignments: {
                      select: {
                        id: true,
                        assigneeType: true,
                        assigneeIds: true,
                        actionType: true,
                        accessTypes: true,
                        direction: true,
                        allowParallel: true,
                        selectedRoles: true,
                        departmentRoles: {
                          select: {
                            departmentId: true,
                            roleId: true,
                            direction: true,
                            allowParallel: true,
                            department: { select: { id: true, name: true } },
                            role: { select: { id: true, role: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            });
          }),
        );
        versionsWithDetails.sort((a, b) => b.version - a.version);
        filteredWorkflowGroups.set(groupName, versionsWithDetails);
      }
    }

    const departmentIds = new Set();
    const roleIds = new Set();
    const userIds = new Set();
    const selectedRoleIds = new Set();

    for (const versions of filteredWorkflowGroups.values()) {
      versions.forEach((workflow) => {
        workflow.steps.forEach((step) => {
          step.assignments.forEach((assignment) => {
            assignment.assigneeIds.forEach((id) => {
              if (assignment.assigneeType === "DEPARTMENT")
                departmentIds.add(id);
              if (assignment.assigneeType === "ROLE") roleIds.add(id);
              if (assignment.assigneeType === "USER") userIds.add(id);
            });
            if (Array.isArray(assignment.selectedRoles))
              assignment.selectedRoles.forEach((id) => selectedRoleIds.add(id));
            if (assignment.departmentRoles)
              assignment.departmentRoles.forEach((dr) =>
                selectedRoleIds.add(dr.roleId),
              );
          });
        });
      });
    }

    const [departments, roles, users, selectedRoles] = await Promise.all([
      prisma.department.findMany({
        where: { id: { in: Array.from(departmentIds) } },
        select: { id: true, name: true },
      }),
      prisma.role.findMany({
        where: { id: { in: Array.from(roleIds) } },
        select: { id: true, role: true },
      }),
      prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, username: true },
      }),
      prisma.role.findMany({
        where: { id: { in: Array.from(selectedRoleIds) } },
        select: { id: true, role: true },
      }),
    ]);

    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));
    const roleMap = new Map(roles.map((r) => [r.id, r.role]));
    const userMap = new Map(users.map((u) => [u.id, u.username]));
    const selectedRoleMap = new Map(selectedRoles.map((r) => [r.id, r.role]));

    const workflowsResponse = Array.from(filteredWorkflowGroups.entries())
      .map(([groupName, workflows]) => {
        return {
          name: groupName,
          versions: workflows.map((workflow) => ({
            id: workflow.id,
            version: workflow.version,
            description: workflow.description,
            isActive: workflow.isActive,
            createdBy: workflow.createdBy,
            createdAt: workflow.createdAt,
            parentWorkflowId: workflow.parentWorkflowId,
            parentWorkflowName: workflow.parentWorkflow?.name || null,
            steps: workflow.steps.map((step) => ({
              stepNumber: step.stepNumber,
              stepName: step.stepName,
              allowParallel: step.allowParallel,
              requiresDocument: step.requiresDocument,
              assignments: step.assignments.map((assignment) => {
                const assigneeIds = assignment.assigneeIds.map((id) => {
                  let name = "Unknown";
                  if (assignment.assigneeType === "DEPARTMENT")
                    name = departmentMap.get(id) || "Unknown Department";
                  if (assignment.assigneeType === "ROLE")
                    name = roleMap.get(id) || "Unknown Role";
                  if (assignment.assigneeType === "USER")
                    name = userMap.get(id) || "Unknown User";
                  return { id, name };
                });

                let selectedRoles = [];
                if (assignment.assigneeType === "DEPARTMENT") {
                  const deptMap = new Map();
                  assignment.departmentRoles?.forEach((dr) => {
                    if (!deptMap.has(dr.departmentId))
                      deptMap.set(dr.departmentId, {
                        department: dr.departmentId,
                        roles: [],
                        direction: dr.direction,
                        allowParallel: dr.allowParallel,
                      });
                    deptMap.get(dr.departmentId).roles.push({
                      id: dr.roleId,
                      name: selectedRoleMap.get(dr.roleId) || "Unknown Role",
                    });
                  });
                  selectedRoles = Array.from(deptMap.values());
                } else {
                  selectedRoles = (assignment.selectedRoles || []).map(
                    (roleId) => ({
                      id: roleId,
                      name: selectedRoleMap.get(roleId) || "Unknown Role",
                    }),
                  );
                }

                return {
                  assigneeType: assignment.assigneeType,
                  assigneeIds,
                  actionType: assignment.actionType,
                  accessTypes: assignment.accessTypes,
                  direction: assignment.direction,
                  allowParallel: assignment.allowParallel,
                  selectedRoles,
                };
              }),
            })),
          })),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      message: "Workflows retrieved successfully",
      workflows: workflowsResponse,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to retrieve workflows" });
  }
};

export const get_workflows_by_access = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);

    if (!accessToken) {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    // =========================
    // USER ROLES & DEPARTMENTS
    // =========================

    const [userRoles, userDepartments] = await Promise.all([
      prisma.userRole.findMany({
        where: { userId: userData.id },
        select: { roleId: true },
      }),

      prisma.department.findMany({
        where: {
          users: {
            some: {
              id: userData.id,
            },
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    const userRoleIds = userRoles.map((r) => r.roleId);
    const userDepartmentIds = userDepartments.map((d) => d.id);

    // ==========================================
    // FETCH WORKFLOWS BASED ON USER ACCESS
    // ==========================================

    let accessibleWorkflowIds = [];

    // ADMIN => GET EVERYTHING
    if (userData.isAdmin) {
      const allWorkflows = await prisma.workflow.findMany({
        select: {
          id: true,
        },
      });

      accessibleWorkflowIds = allWorkflows.map((w) => w.id);
    } else {
      // NON ADMIN => ONLY ASSIGNED WORKFLOWS

      const assignments = await prisma.workflowAssignment.findMany({
        where: {
          OR: [
            // USER ASSIGNMENT
            {
              assigneeType: "USER",
              assigneeIds: {
                has: userData.id,
              },
            },

            // ROLE ASSIGNMENT
            {
              assigneeType: "ROLE",
              assigneeIds: {
                hasSome: userRoleIds,
              },
            },

            // DEPARTMENT ASSIGNMENT
            {
              assigneeType: "DEPARTMENT",
              assigneeIds: {
                hasSome: userDepartmentIds,
              },
            },
          ],
        },

        select: {
          step: {
            select: {
              workflowId: true,
            },
          },
        },
      });

      accessibleWorkflowIds = [
        ...new Set(assignments.map((a) => a.step?.workflowId).filter(Boolean)),
      ];
    }

    // ==========================
    // NO ACCESSIBLE WORKFLOWS
    // ==========================

    if (accessibleWorkflowIds.length === 0) {
      return res.status(200).json({
        message: "Workflows retrieved successfully",
        workflows: [],
      });
    }

    // ==========================
    // FETCH FULL WORKFLOW DATA
    // ==========================

    const workflows = await prisma.workflow.findMany({
      where: {
        id: {
          in: accessibleWorkflowIds,
        },
      },

      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        createdAt: true,
        previousVersionId: true,
        parentWorkflowId: true,
        isActive: true,

        parentWorkflow: {
          select: {
            name: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        steps: {
          orderBy: {
            stepNumber: "asc",
          },

          select: {
            stepNumber: true,
            stepName: true,
            allowParallel: true,
            requiresDocument: true,

            assignments: {
              select: {
                id: true,
                assigneeType: true,
                assigneeIds: true,
                actionType: true,
                accessTypes: true,
                direction: true,
                allowParallel: true,
                selectedRoles: true,

                departmentRoles: {
                  select: {
                    departmentId: true,
                    roleId: true,
                    direction: true,
                    allowParallel: true,

                    department: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },

                    role: {
                      select: {
                        id: true,
                        role: true,
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

    // ==========================
    // GROUP WORKFLOW VERSIONS
    // ==========================

    const grouped = new Map();

    workflows.forEach((workflow) => {
      if (!grouped.has(workflow.name)) {
        grouped.set(workflow.name, []);
      }

      grouped.get(workflow.name).push(workflow);
    });

    // ==========================
    // COLLECT IDS
    // ==========================

    const departmentIds = new Set();
    const roleIds = new Set();
    const userIds = new Set();
    const selectedRoleIds = new Set();

    for (const versions of grouped.values()) {
      versions.forEach((workflow) => {
        workflow.steps.forEach((step) => {
          step.assignments.forEach((assignment) => {
            assignment.assigneeIds.forEach((id) => {
              if (assignment.assigneeType === "DEPARTMENT") {
                departmentIds.add(id);
              }

              if (assignment.assigneeType === "ROLE") {
                roleIds.add(id);
              }

              if (assignment.assigneeType === "USER") {
                userIds.add(id);
              }
            });

            if (Array.isArray(assignment.selectedRoles)) {
              assignment.selectedRoles.forEach((id) => {
                selectedRoleIds.add(id);
              });
            }

            assignment.departmentRoles?.forEach((dr) => {
              selectedRoleIds.add(dr.roleId);
            });
          });
        });
      });
    }

    // ==========================
    // FETCH LABEL DATA
    // ==========================

    const [departments, roles, users, selectedRoles] = await Promise.all([
      prisma.department.findMany({
        where: {
          id: {
            in: Array.from(departmentIds),
          },
        },

        select: {
          id: true,
          name: true,
        },
      }),

      prisma.role.findMany({
        where: {
          id: {
            in: Array.from(roleIds),
          },
        },

        select: {
          id: true,
          role: true,
        },
      }),

      prisma.user.findMany({
        where: {
          id: {
            in: Array.from(userIds),
          },
        },

        select: {
          id: true,
          username: true,
        },
      }),

      prisma.role.findMany({
        where: {
          id: {
            in: Array.from(selectedRoleIds),
          },
        },

        select: {
          id: true,
          role: true,
        },
      }),
    ]);

    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));

    const roleMap = new Map(roles.map((r) => [r.id, r.role]));

    const userMap = new Map(users.map((u) => [u.id, u.username]));

    const selectedRoleMap = new Map(selectedRoles.map((r) => [r.id, r.role]));

    // ==========================
    // FINAL RESPONSE
    // ==========================

    const workflowsResponse = Array.from(grouped.entries())
      .map(([groupName, versions]) => ({
        name: groupName,

        versions: versions
          .sort((a, b) => b.version - a.version)
          .map((workflow) => ({
            id: workflow.id,
            version: workflow.version,
            description: workflow.description,
            isActive: workflow.isActive,
            createdBy: workflow.createdBy,
            createdAt: workflow.createdAt,
            parentWorkflowId: workflow.parentWorkflowId,
            parentWorkflowName: workflow.parentWorkflow?.name || null,

            steps: workflow.steps.map((step) => ({
              stepNumber: step.stepNumber,
              stepName: step.stepName,
              allowParallel: step.allowParallel,
              requiresDocument: step.requiresDocument,

              assignments: step.assignments.map((assignment) => {
                const assigneeIds = assignment.assigneeIds.map((id) => {
                  let name = "Unknown";

                  if (assignment.assigneeType === "DEPARTMENT") {
                    name = departmentMap.get(id) || "Unknown Department";
                  }

                  if (assignment.assigneeType === "ROLE") {
                    name = roleMap.get(id) || "Unknown Role";
                  }

                  if (assignment.assigneeType === "USER") {
                    name = userMap.get(id) || "Unknown User";
                  }

                  return {
                    id,
                    name,
                  };
                });

                let selectedRoles = [];

                if (assignment.assigneeType === "DEPARTMENT") {
                  const deptMap = new Map();

                  assignment.departmentRoles?.forEach((dr) => {
                    if (!deptMap.has(dr.departmentId)) {
                      deptMap.set(dr.departmentId, {
                        department: dr.departmentId,
                        roles: [],
                        direction: dr.direction,
                        allowParallel: dr.allowParallel,
                      });
                    }

                    deptMap.get(dr.departmentId).roles.push({
                      id: dr.roleId,
                      name: selectedRoleMap.get(dr.roleId) || "Unknown Role",
                    });
                  });

                  selectedRoles = Array.from(deptMap.values());
                } else {
                  selectedRoles = (assignment.selectedRoles || []).map(
                    (roleId) => ({
                      id: roleId,
                      name: selectedRoleMap.get(roleId) || "Unknown Role",
                    }),
                  );
                }

                return {
                  assigneeType: assignment.assigneeType,
                  assigneeIds,
                  actionType: assignment.actionType,
                  accessTypes: assignment.accessTypes,
                  direction: assignment.direction,
                  allowParallel: assignment.allowParallel,
                  selectedRoles,
                };
              }),
            })),
          })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      message: "Workflows retrieved successfully",
      workflows: workflowsResponse,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to retrieve workflows",
    });
  }
};

export const delete_workflow_permanent = async (req, res) => {
  try {
    const id = req.params.workflowId;

    if (!id) {
      return res.status(400).json({
        message: "Workflow ID is required",
      });
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        processes: true,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        message: "Workflow not found",
      });
    }

    // FIX: Fetch all versions tracking this name string to execute systemic cascade wipe
    const workflowsToDelete = await prisma.workflow.findMany({
      where: { name: workflow.name },
      include: { processes: true },
    });

    const workflowIds = workflowsToDelete.map((w) => w.id);

    const processFolders = workflowsToDelete.flatMap((w) =>
      w.processes.map((p) => ({
        id: p.id,
        storagePath: p.storagePath,
      })),
    );

    // Wipe out all versions sequentially matching target identity
    await prisma.workflow.deleteMany({
      where: {
        id: { in: workflowIds },
      },
    });

    // Clean physical server storage folders completely
    for (const process of processFolders) {
      try {
        if (process.storagePath) {
          const absolutePath = path.resolve(process.storagePath);

          if (fsCB.existsSync(absolutePath)) {
            fsCB.rmSync(absolutePath, {
              recursive: true,
              force: true,
            });
            console.log(`Deleted folder: ${absolutePath}`);
          }
        }
      } catch (err) {
        console.error(`Failed deleting folder for process ${process.id}`, err);
      }
    }

    return res.status(200).json({
      message:
        "Workflow, all versions, processes and files deleted successfully.",
    });
  } catch (error) {
    console.error("Error permanently deleting workflow:", error);
    return res.status(500).json({
      message: "Failed to permanently delete workflow",
      error: error.message,
    });
  }
};

export const create_template_document = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }
    const { extension, workflowId, templateName } = req.body;

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { id: true, name: true },
    });

    const templatePath = path.join(
      __dirname,
      STORAGE_PATH,
      workflow.name,
      "templates",
      `${templateName}.${extension}`,
    );

    const dirPath = path.join(
      __dirname,
      STORAGE_PATH,
      workflow.name,
      "templates",
    );

    console.log("templatePath", templatePath);
    try {
      await fs.access(dirPath);
      console.log("Templates directory exists");
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("Templates directory does not exist, creating it...");

        // const templateDirectory = await prisma.document.findUnique({
        //   where: { name: "templates", path: `/${workflow.name}/templates` },
        // });

        // if (templateDirectory) {
        //   await fs.rmdir(dirPath, { recursive: true });
        // }
        await fs.mkdir(dirPath, { recursive: true });
        const templa = await prisma.document.create({
          data: {
            name: "templates",
            path: `/${workflow.name}/templates`,
            createdById: userData.id,
            type: "folder",
          },
        });

        await createUserPermissions(templa.id, userData.username, true);

        const parentPath = getParentPath(`../${workflow.name}/templates`);

        await storeChildIdInParentDocument(parentPath, templa.id);

        const parentDocument = await prisma.document.findFirst({
          where: { path: `${STORAGE_PATH}/${workflow.name}` },
        });

        if (parentDocument) {
          await prisma.document.update({
            where: { id: parentDocument.id },
            data: {
              children: {
                connect: { id: templa.id },
              },
            },
          });
        }
      } else {
        throw error; // Re-throw other errors (e.g., permission issues)
      }
    }

    // Validate extension
    if (!extension || typeof extension !== "string") {
      return res
        .status(400)
        .json({ error: "File extension is required and must be a string" });
    }

    // Sanitize extension (remove leading dot if present and convert to lowercase)
    const cleanExtension = extension.replace(/^\./, "").toLowerCase();

    // Define supported Office extensions
    const supportedExtensions = [
      "docx", // Word Document
      "xlsx", // Excel Workbook
      "pptx", // PowerPoint Presentation
      "docm", // Word Macro-Enabled Document
      "xlsm", // Excel Macro-Enabled Workbook
      "pptm", // PowerPoint Macro-Enabled Presentation
      "dotx", // Word Template
      "xltx", // Excel Template
      "potx", // PowerPoint Template
    ];

    // Check if extension is supported
    if (!supportedExtensions.includes(cleanExtension)) {
      return res.status(400).json({ error: "Unsupported file extension" });
    }

    // Generate a unique filename using timestamp
    // const filename = `document_${Date.now()}.${cleanExtension}`;
    // const __dirname = path.dirname(new URL(import.meta.url).pathname);

    // Create content based on extension
    if (["docx", "docm", "dotx"].includes(cleanExtension)) {
      // Create a blank Word document
      const doc = new Document({
        sections: [{ children: [new Paragraph("")] }],
      });

      // Generate buffer and write to file
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(templatePath, buffer);
    } else if (["xlsx", "xlsm", "xltx"].includes(cleanExtension)) {
      // Create a blank Excel workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([]),
        "Sheet1",
      );

      // Write the workbook to a file (synchronous)
      XLSX.writeFile(workbook, templatePath, { bookType: cleanExtension });
    } else if (["pptx", "pptm", "potx"].includes(cleanExtension)) {
      // Create a blank PowerPoint presentation using officegen
      const pptx = officegen("pptx");

      // Create a new slide
      const slide = pptx.makeNewSlide();
      slide.addText("", { x: 0, y: 0, font_size: 18 }); // Add empty text to create a blank slide

      // Write the presentation to a file
      await new Promise((resolve, reject) => {
        const out = fsCB.createWriteStream(templatePath);
        pptx.generate(out);
        out.on("close", resolve);
        out.on("error", reject);
      });
    }

    const newTemplate = await prisma.document.create({
      data: {
        name: `${templateName}.${extension}`,
        path: `/${workflow.name}/templates/${templateName}.${extension}`,
        createdById: userData.id,
        type: "file",
      },
    });

    await createUserPermissions(newTemplate.id, userData.username, true);

    const parentPath = getParentPath(`../${templatePath}`);

    await storeChildIdInParentDocument(parentPath, newTemplate.id);

    const parentDocument = await prisma.document.findFirst({
      where: { path: `/${workflow.name}/templates` },
    });

    console.log("parent path", parentPath);
    if (parentDocument) {
      await prisma.document.update({
        where: { id: parentDocument.id },
        data: {
          children: {
            connect: { id: newTemplate.id },
          },
        },
      });
    }

    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        templateDocuments: {
          connect: { id: newTemplate.id },
        },
      },
    });
    return res.status(201).json({
      message: "Blank Office document created successfully",
      templateName,
      path: `/${workflow.name}/templates/${templateName}.${extension}`,
      documentId: newTemplate.id,
    });
  } catch (error) {
    console.error("Error creating document:", error);
    return res.status(500).json({ error: "Failed to create document" });
  }
};

export const get_workflow_templates = async (req, res) => {
  try {
    // Extract and verify access token
    const accessToken = req.headers["authorization"]?.substring(7);
    if (!accessToken) {
      return res
        .status(401)
        .json({ message: "Authorization token is required" });
    }
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    // Extract workflowId from request body or query
    const workflowId = req.params.workflowId;
    if (!workflowId) {
      return res.status(400).json({ error: "workflowId is required" });
    }

    // Fetch workflow with associated template documents
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        templateDocuments: {
          select: {
            id: true,
            name: true,
            path: true,
          },
          where: {
            type: "file", // Ensure only file-type documents (templates) are returned
            isArchived: false, // Exclude archived documents
            inBin: false, // Exclude documents in bin
          },
        },
      },
    });

    // Check if workflow exists
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // Return template details
    return res.status(200).json({
      message: "Templates retrieved successfully",
      templates: workflow.templateDocuments,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return res.status(500).json({ error: "Failed to fetch templates" });
  }
};

export const upload_template_document = async (req, res) => {
  try {
    // Extract and validate authorization token
    const accessToken = req.headers["authorization"]?.substring(7);
    if (!accessToken) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    // Verify user
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    // Extract workflowId and file from request
    const { workflowId, purpose } = req.body;
    const file = req.file; // Provided by Multer

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!workflowId) {
      return res.status(400).json({ error: "Workflow ID is required" });
    }

    if (purpose !== "template") {
      return res.status(400).json({ error: "Invalid purpose specified" });
    }

    // Fetch workflow details
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { id: true, name: true },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // Validate file extension (redundant with Multer fileFilter, but kept for safety)
    const extension = path
      .extname(file.originalname)
      .toLowerCase()
      .replace(/^\./, "");
    const supportedExtensions = [
      "docx",
      "docm",
      "dotx",
      "xlsx",
      "xlsm",
      "xltx",
      "pptx",
      "pptm",
      "potx",
    ];

    if (!supportedExtensions.includes(extension)) {
      return res.status(400).json({ error: "Unsupported file extension" });
    }

    // Define paths
    const templateName = path.basename(file.originalname, `.${extension}`);
    const templatePath = path.join(
      __dirname,
      "../",
      STORAGE_PATH,
      workflow.name,
      "templates",
      `${templateName}.${extension}`,
    );
    const dirPath = path.join(
      __dirname,
      "../",
      STORAGE_PATH,
      workflow.name,
      "templates",
    );

    console.log("first");
    // Ensure templates directory exists and is in database
    try {
      await fs.access(dirPath);
      console.log("Templates directory exists");
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("Templates directory does not exist, creating it...");
        await fs.mkdir(dirPath, { recursive: true });

        // Create folder record in database
        const templateDir = await prisma.document.create({
          data: {
            name: "templates",
            path: `/${workflow.name}/templates`,
            createdById: userData.id,
            type: "folder",
          },
        });

        // Assign permissions to the folder
        await createUserPermissions(templateDir.id, userData.username, true);

        // Link folder to parent document
        const parentPath = getParentPath(`../${workflow.name}/templates`);
        await storeChildIdInParentDocument(parentPath, templateDir.id);

        const parentDocument = await prisma.document.findFirst({
          where: { path: `/${workflow.name}` },
        });

        if (parentDocument) {
          await prisma.document.update({
            where: { id: parentDocument.id },
            data: {
              children: {
                connect: { id: templateDir.id },
              },
            },
          });
        }
      } else {
        throw error;
      }
    }

    // File is already saved by Multer; create document record in database
    const newTemplate = await prisma.document.create({
      data: {
        name: `${templateName}.${extension}`,
        path: `/${workflow.name}/templates/${templateName}.${extension}`,
        createdById: userData.id,
        type: "file",
      },
    });

    // Assign permissions to the document
    await createUserPermissions(newTemplate.id, userData.username, true);

    // Link document to parent folder
    const parentPath = getParentPath(
      `../${workflow.name}/templates/${templateName}.${extension}`,
    );
    await storeChildIdInParentDocument(parentPath, newTemplate.id);

    const parentDocument = await prisma.document.findFirst({
      where: { path: `/${workflow.name}/templates` },
    });

    if (parentDocument) {
      await prisma.document.update({
        where: { id: parentDocument.id },
        data: {
          children: {
            connect: { id: newTemplate.id },
          },
        },
      });
    }

    // Connect document to workflow
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        templateDocuments: {
          connect: { id: newTemplate.id },
        },
      },
    });

    // Return success response
    return res.status(201).json({
      message: "Template document uploaded successfully",
      templateName: `${templateName}.${extension}`,
      path: `/${workflow.name}/templates/${templateName}.${extension}`,
      documentId: newTemplate.id,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return res.status(500).json({ error: "Failed to upload document" });
  }
};

export const use_template_document = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    if (!accessToken) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    // Verify user
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    let { templateId, workflowId } = req.body;

    templateId = parseInt(templateId, 10);

    const document = await prisma.document.findUnique({
      where: { id: templateId },
      select: { path: true, name: true },
    });

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { name: true },
    });

    try {
      await fs.access(
        path.join(__dirname, STORAGE_PATH, workflow.name, "temp"),
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        await createFolder(false, `../${workflow.name}/temp`, userData);
      } else {
        throw error; // Re-throw other errors (e.g., permission issues)
      }
    }

    const sourcePath = `./${document.path}`;
    const destinationPath = `../${workflow.name}/temp`;
    console.log("workflow id", workflowId);
    console.log("doc path", document);
    const name = await generateUniqueDocumentName({
      workflowId: workflowId,
      replacedDocId: null,
      extension: document.name.split(".").pop(),
    });

    const response = await new Promise((resolve, reject) => {
      file_copy(
        {
          headers: { authorization: `Bearer ${accessToken}` },
          body: { sourcePath, destinationPath, name },
        },
        {
          status: (code) => ({
            json: (data) => {
              if (code === 200) resolve(data);
              else reject(data);
            },
          }),
        },
      );
    });

    const generatedDocument = await prisma.document.findUnique({
      where: { id: response.documentId },
      select: { id: true, name: true, path: true },
    });

    return res.status(200).json({
      message: "Template document used successfully",
      documentId: generatedDocument.id,
      documentName: generatedDocument.name,
      documentPath: generatedDocument.path,
    });
  } catch (error) {
    console.log("Error using template document:", error);
    return res.status(500).json({ error: "Failed to use template document" });
  }
};

export const get_workflow_steps_with_assignments = async (req, res) => {
  try {
    const { workflowId } = req.params;

    // Verify user authorization
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    // Fetch workflow with all necessary relations in a single query
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          orderBy: { stepNumber: "asc" },
          include: {
            assignments: {
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
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    // Collect all IDs for batch queries
    const userIds = new Set();
    const roleIds = new Set();
    const departmentIds = new Set();
    const allRoleIdsForHierarchy = new Set();

    workflow.steps.forEach((step) => {
      step.assignments.forEach((assignment) => {
        // Collect assignee IDs based on type
        assignment.assigneeIds.forEach((id) => {
          switch (assignment.assigneeType) {
            case "USER":
              userIds.add(id);
              break;
            case "ROLE":
              roleIds.add(id);
              allRoleIdsForHierarchy.add(id);
              break;
            case "DEPARTMENT":
              departmentIds.add(id);
              break;
          }
        });

        // Collect role IDs from selectedRoles
        if (
          assignment.selectedRoles &&
          Array.isArray(assignment.selectedRoles)
        ) {
          assignment.selectedRoles.forEach((roleId) => {
            allRoleIdsForHierarchy.add(roleId);
          });
        }

        // Collect role IDs from departmentRoles
        assignment.departmentRoles.forEach((deptRole) => {
          allRoleIdsForHierarchy.add(deptRole.roleId);
        });
      });
    });

    // Batch fetch all related data
    const [
      users,
      roles,
      departments,
      userRoles,
      allRolesForHierarchy,
      roleHierarchies,
    ] = await Promise.all([
      // Fetch users with basic info
      prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, username: true },
      }),

      // Fetch roles for ROLE type assignments
      prisma.role.findMany({
        where: { id: { in: Array.from(roleIds) } },
        include: {
          branch: {
            select: { name: true },
          },
        },
      }),

      // Fetch departments
      prisma.department.findMany({
        where: { id: { in: Array.from(departmentIds) } },
      }),

      // Fetch user-role relationships for all users
      prisma.userRole.findMany({
        where: { userId: { in: Array.from(userIds) } },
        include: {
          role: {
            select: { role: true },
          },
        },
      }),

      // Fetch all roles needed for hierarchy building
      prisma.role.findMany({
        where: { id: { in: Array.from(allRoleIdsForHierarchy) } },
        select: {
          id: true,
          role: true,
          parentRoleId: true,
          departmentId: true,
        },
      }),

      // Fetch role hierarchies in bulk
      prisma.role.findMany({
        where: {
          OR: [
            { id: { in: Array.from(allRoleIdsForHierarchy) } },
            { parentRoleId: { in: Array.from(allRoleIdsForHierarchy) } },
          ],
        },
        select: { id: true, role: true, parentRoleId: true },
      }),
    ]);

    // Create lookup maps for efficient access
    const userMap = new Map(users.map((user) => [user.id, user]));
    const roleMap = new Map(roles.map((role) => [role.id, role]));
    const departmentMap = new Map(departments.map((dept) => [dept.id, dept]));
    const userRoleMap = new Map();

    // Organize user roles
    userRoles.forEach((ur) => {
      if (!userRoleMap.has(ur.userId)) {
        userRoleMap.set(ur.userId, []);
      }
      userRoleMap.get(ur.userId).push(ur.role.role);
    });

    // Build role hierarchy map
    const roleHierarchyMap = new Map();
    roleHierarchies.forEach((role) => {
      roleHierarchyMap.set(role.id, {
        id: role.id,
        name: role.role,
        children: [],
      });
    });

    // Build hierarchy trees
    roleHierarchies.forEach((role) => {
      if (role.parentRoleId && roleHierarchyMap.has(role.parentRoleId)) {
        roleHierarchyMap
          .get(role.parentRoleId)
          .children.push(roleHierarchyMap.get(role.id));
      }
    });

    // Get root roles (roles with no parent or where parent is not in our set)
    const rootRoles = Array.from(roleHierarchyMap.values()).filter((role) => {
      const roleData = allRolesForHierarchy.find((r) => r.id === role.id);
      return (
        !roleData?.parentRoleId || !roleHierarchyMap.has(roleData.parentRoleId)
      );
    });

    // Function to format assignee based on type
    const formatAssignee = (assigneeType, assigneeId) => {
      switch (assigneeType) {
        case "USER":
          const user = userMap.get(assigneeId);
          if (!user) return null;

          return {
            id: user.id,
            username: user.username,
            departments: [], // Add if you have user-department relationships
            roles: userRoleMap.get(user.id) || [],
          };

        case "ROLE":
          const role = roleMap.get(assigneeId);
          if (!role) return null;

          return {
            id: role.id,
            role: role.role,
            isRootLevel: role.isRootLevel,
            isDepartmentHead: role.isDepartmentHead,
            departmentId: role.departmentId,
            departmentName: role.branch?.name || null,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
            status: role.status,
          };

        case "DEPARTMENT":
          const department = departmentMap.get(assigneeId);
          if (!department) return null;

          return {
            id: department.id,
            type: department.type,
            code: department.code,
            name: department.name,
            status: department.status,
            headId: department.headId,
            adminId: department.adminId,
            parentDepartmentId: department.parentDepartmentId,
            createdAt: department.createdAt,
            updatedAt: department.updatedAt,
            createdById: department.createdById,
          };

        default:
          return null;
      }
    };

    // Function to get role tree for a specific role ID
    const getRoleTree = (roleId) => {
      const roleData = allRolesForHierarchy.find((r) => r.id === roleId);
      if (!roleData) return null;

      // Find the role in our hierarchy map
      const roleInHierarchy = roleHierarchyMap.get(roleId);
      if (roleInHierarchy) {
        return {
          id: roleInHierarchy.id,
          name: roleInHierarchy.name,
          children: roleInHierarchy.children
            .map((child) => getRoleTree(child.id))
            .filter(Boolean),
        };
      }

      // If role not in hierarchy map, return basic info
      return {
        id: roleData.id,
        name: roleData.role,
        children: [],
      };
    };

    // Format the response
    const formattedSteps = workflow.steps.map((step) => {
      const formattedAssignments = step.assignments.map((assignment) => {
        // Format assigneeIds
        const formattedAssigneeIds = assignment.assigneeIds
          .map((id) => formatAssignee(assignment.assigneeType, id))
          .filter(Boolean);

        // Format selectedRoles
        let formattedSelectedRoles = [];

        if (assignment.assigneeType === "DEPARTMENT") {
          // For DEPARTMENT assignments, group by department
          const departmentRolesMap = new Map();

          assignment.departmentRoles.forEach((deptRole) => {
            if (!departmentRolesMap.has(deptRole.departmentId)) {
              departmentRolesMap.set(deptRole.departmentId, {
                department: deptRole.departmentId,
                roles: [],
                direction: deptRole.direction, // Fixed: mapped from deptRole
                allowParallel: deptRole.allowParallel, // Fixed: added allowParallel
              });
            }

            const roleTree = getRoleTree(deptRole.roleId);
            if (roleTree) {
              departmentRolesMap
                .get(deptRole.departmentId)
                .roles.push(roleTree);
            }
          });

          formattedSelectedRoles = Array.from(departmentRolesMap.values());
        } else if (
          assignment.selectedRoles &&
          assignment.selectedRoles.length > 0
        ) {
          // For other assignment types, format selectedRoles as flat array
          formattedSelectedRoles = assignment.selectedRoles
            .map((roleId) => {
              const role = allRolesForHierarchy.find((r) => r.id === roleId);
              return role
                ? {
                    id: role.id,
                    name: role.role,
                    children: [],
                  }
                : null;
            })
            .filter(Boolean);
        }

        return {
          assigneeType: assignment.assigneeType,
          actionType: assignment.actionType,
          assigneeIds: formattedAssigneeIds,
          direction: assignment.direction,
          selectedRoles: formattedSelectedRoles,
        };
      });

      return {
        stepName: step.stepName,
        assignments: formattedAssignments,
        id: step.id,
      };
    });

    return res.status(200).json(formattedSteps);
  } catch (error) {
    console.error("Error fetching workflow steps:", error);
    return res.status(500).json({ error: "Failed to fetch workflow steps" });
  }
};

export const get_all_workflows_with_basics = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const workflows = await prisma.workflow.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        version: true, // 👈 added
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedWorkflows = workflows.map((workflow) => ({
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowDescription: workflow.description,
      version: workflow.version, // 👈 added
    }));

    return res.status(200).json(formattedWorkflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return res.status(500).json({
      error: "Failed to fetch workflows",
      details: error.message,
    });
  }
};
