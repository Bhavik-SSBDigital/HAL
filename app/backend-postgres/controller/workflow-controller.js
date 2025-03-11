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
          await tx.workflowAssignment.createMany({
            data: assignments.map((assignee) => ({
              stepId: stepRecords[i].id,
              assigneeType: assignee.assigneeType,
              assigneeIds: assignee.assigneeIds.map(Number),
              actionType: assignee.actionType,
              accessTypes: assignee.accessTypes, // Store multiple access types
              selectedRoles: assignee.selectedRoles?.map(Number) || [],
              direction: assignee.direction,
            })),
          });
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
          previousWorkflowId: oldWorkflow.id,
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
            },
          });
        })
      );

      for (let i = 0; i < steps.length; i++) {
        const assignments = steps[i].assignments || [];
        if (assignments.length) {
          await tx.workflowAssignment.createMany({
            data: assignments.map((assignee) => ({
              stepId: stepRecords[i].id,
              assigneeType: assignee.assigneeType,
              assigneeIds: assignee.assigneeIds, // Updated to store an array
              actionType: assignee.actionType,
            })),
          });
        }
      }

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
        previousWorkflow: { select: { id: true, name: true, version: true } },
        steps: {
          include: {
            assignments: true,
            nextStep: { select: { stepName: true } },
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
      previousWorkflow: workflow.previousWorkflow,
      createdBy: workflow.createdBy.username,
      steps: workflow.steps.map((step) => ({
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        allowParallel: step.allowParallel,
        nextStep: step.nextStep?.stepName,
        assignments: step.assignments.map((assignee) => ({
          assigneeType: assignee.assigneeType,
          assigneeIds: assignee.assigneeIds, // Now returns an array
          actionType: assignee.actionType,
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
      where: { workflowId },
    });

    if (activeProcesses > 0) {
      return res.status(400).json({
        error: "Cannot delete workflow. Active processes are using it.",
      });
    }

    await prisma.workflow.delete({ where: { id: workflowId } });

    return res.status(200).json({ message: "Workflow deleted successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete workflow" });
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
            assignments: true, // Fetch assignments
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group workflows by name and arrange versions
    const groupedWorkflows = workflows.reduce((acc, workflow) => {
      if (!acc[workflow.name]) {
        acc[workflow.name] = [];
      }
      acc[workflow.name].push(workflow);
      return acc;
    }, {});

    return res.status(200).json({
      message: "Workflows retrieved successfully",
      workflows: Object.keys(groupedWorkflows).map((name) => ({
        name,
        versions: groupedWorkflows[name].map((wf) => ({
          id: wf.id,
          version: wf.version,
          description: wf.description,
          createdBy: wf.createdBy,
          createdAt: wf.createdAt,
          steps: wf.steps.map((step) => ({
            id: step.id,
            stepNumber: step.stepNumber,
            stepName: step.stepName,
            allowParallel: step.allowParallel,
            assignments: step.assignments.map((assignment) => {
              return {
                id: assignment.id,
                assigneeType: assignment.assigneeType,
                assigneeIds: assignment.assigneeIds.map((item) => Number(item)), // Now using assigneeIds instead of assigneeId
                actionType: assignment.actionType,
              };
            }),
          })),
        })),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to retrieve workflows" });
  }
};
