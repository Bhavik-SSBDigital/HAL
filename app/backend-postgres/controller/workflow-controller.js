/* Add Workflow Payload
{
  "name": "Document Approval Workflow",
  "description": "A workflow for document approval process",
  "createdById": 1,
  "steps": [
    {
      "stepName": "Initial Review",
      "allowParallel": false,
      "assignments": [
        { 
          "assigneeType": "ROLE", 
          "assigneeId": 2,
          "actionType": "APPROVAL"
        }
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
      const newWorkflow = await tx.workflow.create({
        data: { name, description, createdById },
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
              assigneeId: assignee.assigneeId,
              actionType: assignee.actionType,
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

export const edit_workflow = async (req, res) => {
  const { workflowId, name, description, steps, updatedById } = req.body;

  try {
    const oldWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: true },
    });

    if (!oldWorkflow)
      return res.status(404).json({ error: "Workflow not found" });

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
              assigneeId: assignee.assigneeId,
              actionType: assignee.actionType,
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
          assigneeId: assignee.assigneeId,
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
