// Controller to add a new workflow with steps and assignments

/*

{
  "name": "Document Approval Workflow",
  "description": "A workflow for document approval process",
  "createdById": 1,
  "steps": [
    {
      "stepName": "Initial Review",
      "stepType": "REVIEW",
      "approverType": "ROLE",
      "allowParallel": false,
      "assignments": [
        { "assigneeType": "ROLE", "assigneeId": 2 }
      ]
    }
  ]
}
*/

export const add_workflow = async (req, res) => {
  const { name, description, steps, createdById } = req.body;

  if (!name || !steps || !steps.length) {
    return res
      .status(400)
      .json({ error: "Workflow name and steps are required." });
  }

  try {
    const workflow = await prisma.$transaction(async (tx) => {
      // Create the workflow
      const newWorkflow = await tx.workflow.create({
        data: {
          name,
          description,
          createdById,
        },
      });

      const workflowId = newWorkflow.id;

      // Create workflow steps
      const stepRecords = await Promise.all(
        steps.map(async (step, index) => {
          return tx.workflowStep.create({
            data: {
              workflowId,
              stepNumber: index + 1,
              stepName: step.stepName,
              approverType: step.approverType,
              allowParallel: step.allowParallel || false,
            },
          });
        })
      );

      // Create assignments for each step with action types
      for (let i = 0; i < steps.length; i++) {
        const assignments = steps[i].assignments || [];
        if (assignments.length) {
          await tx.workflowAssignment.createMany({
            data: assignments.map((assignee) => ({
              stepId: stepRecords[i].id,
              assigneeType: assignee.assigneeType,
              assigneeId: assignee.assigneeId,
              actionType: assignee.actionType, // Assign action type to assignee
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
  "workflowId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Document Approval Process",
  "description": "Updated process for document approvals",
  "steps": [
    {
      "stepName": "Initial Submission",
      "stepType": "Submission",
      "approverType": "User",
      "allowParallel": false
    },
  ],
  "updatedById": "987f4567-e89b-12d3-a456-426614174001"
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

    // Create a new workflow version
    const newWorkflow = await prisma.$transaction(async (tx) => {
      const latestVersion = await tx.workflow.findFirst({
        where: { name: oldWorkflow.name },
        orderBy: { version: "desc" },
      });

      const newVersion = latestVersion ? latestVersion.version + 1 : 1;

      const newWorkflow = await tx.workflow.create({
        data: {
          name,
          description,
          createdById: updatedById,
          version: newVersion,
          previousWorkflowId: oldWorkflow.id, // Link to old version
        },
      });

      const workflowId = newWorkflow.id;

      // Copy steps from old workflow (or update with new steps)
      const stepRecords = await Promise.all(
        steps.map(async (step, index) => {
          return tx.workflowStep.create({
            data: {
              workflowId,
              stepNumber: index + 1,
              stepName: step.stepName,
              approverType: step.approverType,
              allowParallel: step.allowParallel || false,
            },
          });
        })
      );

      // Create new assignments with actionType
      for (let i = 0; i < steps.length; i++) {
        const assignments = steps[i].assignments || [];
        if (assignments.length) {
          await tx.workflowAssignment.createMany({
            data: assignments.map((assignee) => ({
              stepId: stepRecords[i].id,
              assigneeType: assignee.assigneeType,
              assigneeId: assignee.assigneeId,
              actionType: assignee.actionType, // Assign action type
            })),
          });
        }
      }

      return newWorkflow;
    });

    return res.status(201).json({
      message: "Workflow updated with a new version",
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
        previousWorkflow: { select: { id: true, name: true, version: true } }, // Show history
        steps: {
          include: {
            assignments: true,
            nextStep: { select: { stepName: true } },
          },
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const formattedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      previousWorkflow: workflow.previousWorkflow
        ? {
            id: workflow.previousWorkflow.id,
            name: workflow.previousWorkflow.name,
            version: workflow.previousWorkflow.version,
          }
        : null,
      createdBy: workflow.createdBy.username,
      steps: workflow.steps.map((step) => ({
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        approverType: step.approverType,
        allowParallel: step.allowParallel,
        nextStep: step.nextStep ? step.nextStep.stepName : null,
        assignments: step.assignments.map((assignee) => ({
          assigneeType: assignee.assigneeType,
          assigneeId: assignee.assigneeId,
          actionType: assignee.actionType, // Include action type
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
