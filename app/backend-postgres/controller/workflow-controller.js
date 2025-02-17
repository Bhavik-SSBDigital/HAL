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
              stepType: step.stepType,
              approverType: step.approverType,
              allowParallel: step.allowParallel || false,
            },
          });
        })
      );

      // Create assignments for each step
      for (let i = 0; i < steps.length; i++) {
        const assignments = steps[i].assignments || [];
        if (assignments.length) {
          await tx.workflowAssignment.createMany({
            data: assignments.map((assignee) => ({
              stepId: stepRecords[i].id,
              assigneeType: assignee.assigneeType,
              assigneeId: assignee.assigneeId,
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
