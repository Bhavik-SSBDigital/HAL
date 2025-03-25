import { PrismaClient } from "@prisma/client";

import { verifyUser } from "../utility/verifyUser.js";

const prisma = new PrismaClient();

/*
{
  "name": "Workflow Name",
  "description": "Description of the workflow (optional)",
  "steps": [
    {
      "stepName": "Step 1",
      "allowParallel": true,
      "assignments": [
        {
          "assigneeType": "user", // possible values: user, role, department, etc.
          "assigneeIds": [1, 2], // Array of user IDs, role IDs, or department IDs
          "actionType": "approve" // possible values: approve, reject, recommend, etc.
        },
        {
          "assigneeType": "role",
          "assigneeIds": [3],
          "actionType": "approve"
        }
      ]
    },
    {
      "stepName": "Step 2",
      "allowParallel": false,
      "assignments": [
        {
          "assigneeType": "department",
          "assigneeIds": [5],
          "actionType": "approve",
          "accessTypes": ["READ", "EDIT", "DOWNLOAD"] 
          "selectedRoles": [1, 2], 
          "direction": "UPWARDS" // possible values: UPWARDS, DOWNWARDS
        }
      ]
    }
  ]
}

*/
export const add_workflow = async (req, res) => {
  const accessToken = req.headers["authorization"].substring(7);
  const userData = await verifyUser(accessToken);
  if (userData === "Unauthorized") {
    return res.status(401).json({ message: "Unauthorized request" });
  }

  const createdById = userData.id;
  const { name, description, steps } = req.body;

  if (!name || !steps || !steps.length) {
    return res
      .status(400)
      .json({ error: "Workflow name and steps are required." });
  }

  try {
    const workflow = await prisma.$transaction(async (tx) => {
      const newWorkflow = await tx.workflow.create({
        data: { name, description, createdById, version: 1 },
      });

      const stepRecords = await Promise.all(
        steps.map(async (step, index) => {
          return tx.workflowStep.create({
            data: {
              workflowId: newWorkflow.id,
              stepNumber: index + 1,
              stepName: step.stepName,
              allowParallel: step.allowParallel || false,
              requiresDocument: step.requiresDocument !== false,
            },
          });
        })
      );

      for (let i = 0; i < steps.length; i++) {
        const assignments = steps[i].assignments || [];

        if (assignments.length) {
          console.log("assignments", JSON.stringify(assignments));
          // Insert WorkflowAssignments

          const groupedAssignments = {};

          assignments.forEach((assignee) => {
            // Create a mapping of assigneeId -> allowParallel (from selectedRoles)
            const allowParallelMapping = {};

            assignee.selectedRoles?.forEach((role) => {
              role.roles.forEach(() => {
                allowParallelMapping[role.department] =
                  role.allowParallel || false;
              });
            });

            assignee.assigneeIds
              .map((item) => item.id)
              .forEach((assigneeId) => {
                const allowParallel = allowParallelMapping[assigneeId] || false; // Get per-assignee allowParallel

                const key = JSON.stringify({
                  assigneeType: assignee.assigneeType,
                  actionType: assignee.actionType,
                  accessTypes: assignee.accessTypes.sort(), // Ensure consistent key
                  direction: assignee.direction,
                  allowParallel: allowParallel, // Now per-assignee
                });

                if (!groupedAssignments[key]) {
                  groupedAssignments[key] = { ...assignee, assigneeIds: [] };
                }

                groupedAssignments[key].assigneeIds.push(Number(assigneeId));
              });
          });

          await tx.workflowAssignment.createMany({
            data: Object.values(groupedAssignments).map((assignee) => ({
              stepId: stepRecords[i].id,
              assigneeType: assignee.assigneeType,
              assigneeIds: assignee.assigneeIds,
              actionType: assignee.actionType,
              accessTypes: assignee.accessTypes,
              direction: assignee.direction,
              allowParallel: assignee.allowParallel, // Ensures correct parallelism per group
            })),
          });

          // Fetch created WorkflowAssignments to get their IDs
          const createdAssignments = await tx.workflowAssignment.findMany({
            where: { stepId: stepRecords[i].id },
            select: { id: true, assigneeType: true },
          });

          // Prepare DepartmentRoleAssignments
          const departmentRoleAssignments = assignments
            .filter((assignee) => assignee.assigneeType === "DEPARTMENT")
            .flatMap((assignee, index) => {
              const assignment = createdAssignments[index]; // Get corresponding WorkflowAssignment
              return assignee.selectedRoles.flatMap(({ department, roles }) =>
                roles.map((item) => ({
                  workflowAssignmentId: assignment.id,
                  departmentId: department,
                  roleId: item.id,
                }))
              );
            });

          // Insert DepartmentRoleAssignments if there are any
          if (departmentRoleAssignments.length > 0) {
            await tx.departmentRoleAssignment.createMany({
              data: departmentRoleAssignments,
            });
          }
        }
      }

      return newWorkflow;
    });

    return res
      .status(201)
      .json({ message: "Workflow created successfully", workflow });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create workflow" });
  }
};

/*
{
  "workflowId": 1, // ID of the workflow to edit
  "name": "Updated Workflow Name",
  "description": "Updated description of the workflow (optional)",
  "steps": [
    {
      "stepName": "Updated Step 1",
      "allowParallel": true,
      "assignments": [
        {
          "assigneeType": "user", // possible values: user, role, department, etc.
          "assigneeIds": [1, 2], // Array of user IDs, role IDs, or department IDs
          "actionType": "approve" // possible values: approve, reject, recommend, etc.
        }
      ]
    }
  ],
  "updatedById": 3 // The user who is updating the workflow
}

*/
export const edit_workflow = async (req, res) => {
  const { workflowId, name, description, steps, updatedById } = req.body;

  try {
    const oldWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: true },
    });

    if (!oldWorkflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const newWorkflow = await prisma.$transaction(async (tx) => {
      const latestVersion = await tx.workflow.findFirst({
        where: { name: oldWorkflow.name },
        orderBy: { version: "desc" },
      });

      const newWorkflow = await tx.workflow.create({
        data: {
          name,
          description,
          createdById: updatedById,
          version: latestVersion ? latestVersion.version + 1 : 1,
          previousVersionId: oldWorkflow.id,
          isActive: true,
        },
      });

      const stepRecords = await Promise.all(
        steps.map(async (step, index) => {
          return tx.workflowStep.create({
            data: {
              workflowId: newWorkflow.id,
              stepNumber: index + 1,
              stepName: step.stepName,
              allowParallel: step.allowParallel || false,
              requiresDocument: step.requiresDocument !== false, // Added
            },
          });
        })
      );

      for (let i = 0; i < steps.length; i++) {
        const assignments = steps[i].assignments || [];
        if (assignments.length) {
          const groupedAssignments = {};

          assignments.forEach((assignee) => {
            const allowParallelMapping = {};
            assignee.selectedRoles?.forEach((role) => {
              role.roles.forEach(() => {
                allowParallelMapping[role.department] =
                  role.allowParallel || false;
              });
            });

            assignee.assigneeIds
              .map((item) => item.id)
              .forEach((assigneeId) => {
                const allowParallel = allowParallelMapping[assigneeId] || false;
                const key = JSON.stringify({
                  assigneeType: assignee.assigneeType,
                  actionType: assignee.actionType,
                  accessTypes: assignee.accessTypes?.sort() || [],
                  direction: assignee.direction,
                  allowParallel,
                });

                if (!groupedAssignments[key]) {
                  groupedAssignments[key] = { ...assignee, assigneeIds: [] };
                }
                groupedAssignments[key].assigneeIds.push(Number(assigneeId));
              });
          });

          await tx.workflowAssignment.createMany({
            data: Object.values(groupedAssignments).map((assignee) => ({
              stepId: stepRecords[i].id,
              assigneeType: assignee.assigneeType,
              assigneeIds: assignee.assigneeIds,
              actionType: assignee.actionType,
              accessTypes: assignee.accessTypes || [],
              direction: assignee.direction || "DOWNWARDS",
              allowParallel: assignee.allowParallel || false,
            })),
          });

          const createdAssignments = await tx.workflowAssignment.findMany({
            where: { stepId: stepRecords[i].id },
            select: { id: true, assigneeType: true },
          });

          const departmentRoleAssignments = assignments
            .filter((a) => a.assigneeType === "DEPARTMENT")
            .flatMap((assignee, idx) => {
              const assignment = createdAssignments[idx];
              return assignee.selectedRoles.flatMap(({ department, roles }) =>
                roles.map((role) => ({
                  workflowAssignmentId: assignment.id,
                  departmentId: department,
                  roleId: role.id,
                }))
              );
            });

          if (departmentRoleAssignments.length > 0) {
            await tx.departmentRoleAssignment.createMany({
              data: departmentRoleAssignments,
            });
          }
        }
      }

      await tx.workflow.update({
        where: { id: oldWorkflow.id },
        data: { isActive: false },
      });

      return newWorkflow;
    });

    return res.status(200).json({
      message: "Workflow updated successfully",
      workflow: newWorkflow,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update workflow" });
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
        assignments: step.assignments.map((assignee) => ({
          assigneeType: assignee.assigneeType,
          assigneeIds: assignee.assigneeIds,
          actionType: assignee.actionType,
          accessTypes: assignee.accessTypes,
          direction: assignee.direction,
          allowParallel: assignee.allowParallel,
          selectedRoles:
            assignee.assigneeType === "DEPARTMENT"
              ? assignee.departmentRoles.reduce((acc, dr) => {
                  const dept = acc.find(
                    (d) => d.department.id === dr.department.id
                  );
                  if (dept) {
                    dept.roles.push({ id: dr.role.id, name: dr.role.role });
                  } else {
                    acc.push({
                      department: {
                        id: dr.department.id,
                        name: dr.department.name,
                      },
                      roles: [{ id: dr.role.id, name: dr.role.role }],
                    });
                  }
                  return acc;
                }, [])
              : undefined,
        })),
      })),
    };

    return res.status(200).json(formattedWorkflow);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to retrieve workflow" });
  }
};

/*
AS A URL PARAM: workflowId
*/
export const delete_workflow = async (req, res) => {
  const { workflowId } = req.params;

  try {
    const activeProcesses = await prisma.processInstance.count({
      where: { workflowId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    });

    if (activeProcesses > 0) {
      return res.status(400).json({
        error: "Cannot deactivate workflow. Active processes are using it.",
      });
    }

    await prisma.workflow.update({
      where: { id: workflowId },
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

export const get_workflows = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const workflows = await prisma.workflow.findMany({
      where: { isActive: true, createdById: userData.id },
      include: {
        steps: {
          include: {
            assignments: {
              select: {
                id: true,
                assigneeType: true,
                assigneeIds: true,
                actionType: true,
                accessTypes: true,
                direction: true,
                allowParallel: true,
              },
            },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Collect all assignee IDs by type
    const departmentIds = new Set();
    const roleIds = new Set();
    const userIds = new Set();

    workflows.forEach((workflow) => {
      workflow.steps.forEach((step) => {
        step.assignments.forEach((assignment) => {
          assignment.assigneeIds.forEach((id) => {
            switch (assignment.assigneeType) {
              case "DEPARTMENT":
                departmentIds.add(id);
                break;
              case "ROLE":
                roleIds.add(id);
                break;
              case "USER":
                userIds.add(id);
                break;
            }
          });
        });
      });
    });

    // Fetch related entities in bulk
    const [departments, roles, users] = await Promise.all([
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
    ]);

    // Create lookup maps
    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));

    console.log("dep", departmentMap);
    const roleMap = new Map(roles.map((r) => [r.id, r.role]));
    console.log("role map", roleMap);
    const userMap = new Map(users.map((u) => [u.id, u.username]));
    console.log("user map", userMap);

    // Enrich assigneeIds with names
    const processedWorkflows = workflows.map((workflow) => ({
      ...workflow,
      steps: workflow.steps.map((step) => ({
        ...step,
        assignments: step.assignments.map((assignment) => ({
          ...assignment,
          assigneeIds: assignment.assigneeIds.map((id) => {
            let name = "Unknown";
            switch (assignment.assigneeType) {
              case "DEPARTMENT":
                name = departmentMap.get(id) || "Unknown Department";
                break;
              case "ROLE":
                name = roleMap.get(id) || "Unknown Role";
                break;
              case "USER":
                name = userMap.get(id) || "Unknown User";
                break;
            }
            return { id, name };
          }),
        })),
      })),
    }));

    const groupedWorkflows = processedWorkflows.reduce((acc, workflow) => {
      const key = workflow.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(workflow);
      return acc;
    }, {});

    return res.status(200).json({
      message: "Workflows retrieved successfully",
      workflows: Object.entries(groupedWorkflows).map(([name, versions]) => ({
        name,
        versions: versions.map((wf) => ({
          id: wf.id,
          version: wf.version,
          description: wf.description,
          createdBy: wf.createdBy,
          createdAt: wf.createdAt,
          steps: wf.steps.map((step) => ({
            stepNumber: step.stepNumber,
            stepName: step.stepName,
            allowParallel: step.allowParallel,
            requiresDocument: step.requiresDocument,
            assignments: step.assignments.map((a) => ({
              assigneeType: a.assigneeType,
              assigneeIds: a.assigneeIds,
              actionType: a.actionType,
              accessTypes: a.accessTypes,
              direction: a.direction,
              allowParallel: a.allowParallel,
            })),
          })),
        })),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to retrieve workflows" });
  }
};
