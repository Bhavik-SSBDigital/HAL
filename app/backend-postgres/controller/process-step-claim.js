import { verifyUser } from "../utility/verifyUser.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const pick_process_step = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    const { stepInstanceId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const step = await tx.processStepInstance.update({
        where: {
          id: stepInstanceId,
          status: "PENDING",
          assignedTo: userData.id,
        },
        data: {
          status: "IN_PROGRESS",
          pickedBy: userData.id,
          claimedAt: new Date(),
        },
        include: {
          workflowAssignment: {
            include: {
              departmentRoles: true,
            },
          },
          assignmentProgress: {
            include: {
              departmentStepProgress: true,
              stepInstances: true,
            },
          },
        },
      });

      if (!step) throw new Error("Step not available for pickup");

      switch (step.workflowAssignment.assigneeType) {
        case "ROLE":
          await handleRolePickup(tx, step);
          break;

        case "DEPARTMENT":
          await handleDepartmentPickup(tx, step);
          break;

        case "USER":
          const otherSteps = await tx.processStepInstance.findMany({
            where: {
              assignmentId: step.assignmentId,
              status: "PENDING",
              NOT: { id: step.id },
            },
          });

          const otherStepIds = otherSteps.map((s) => s.id);

          await tx.processNotification.deleteMany({
            where: { stepId: { in: otherStepIds } },
          });

          await tx.processStepInstance.deleteMany({
            where: { id: { in: otherStepIds } },
          });
          break;
      }

      //   await updateDocumentAccess(tx, step);
      await cleanupNotifications(tx, step);

      return step;
    });

    res.json({ message: "Process step claimed successfully" });
  } catch (error) {
    console.log("Error picking process step", error);
    res.status(500).json({ message: "Error picking process step" });
  }
};

async function handleRolePickup(tx, step) {
  const pendingSteps = await tx.processStepInstance.findMany({
    where: {
      assignmentId: step.assignmentId,
      status: "PENDING",
    },
  });

  const stepIdsToDelete = pendingSteps
    .map((s) => s.id)
    .filter((id) => id !== step.id);

  await tx.processNotification.deleteMany({
    where: { stepId: { in: stepIdsToDelete } },
  });

  await tx.processStepInstance.deleteMany({
    where: { id: { in: stepIdsToDelete } },
  });
}

async function handleDepartmentPickup(tx, step) {
  const progress = step.assignmentProgress;
  const assignment = step.workflowAssignment;
  const dp = progress.departmentStepProgress;

  if (assignment.allowParallel) {
    const updated = await tx.departmentStepProgress.update({
      where: { id: dp.id },
      data: { completedRoles: { push: step.roleId } },
      select: { completedRoles: true, requiredRoles: true },
    });

    if (
      updated.requiredRoles.every((r) => updated.completedRoles.includes(r))
    ) {
      await tx.assignmentProgress.update({
        where: { id: progress.id },
        data: { completed: true, completedAt: new Date() },
      });
    }
  } else {
    const hierarchy = JSON.parse(progress.roleHierarchy);
    const nextLevel = progress.currentLevel + 1;

    if (nextLevel < hierarchy.length) {
      const departments = await getAssignmentDepartments(assignment.id);
      const nextRoles = hierarchy[nextLevel];

      await createRoleSteps(tx, {
        processId: step.processId,
        assignmentId: assignment.id,
        progressId: progress.id,
        departments,
        roles: nextRoles,
      });

      await tx.assignmentProgress.update({
        where: { id: progress.id },
        data: { currentLevel: nextLevel },
      });
    } else {
      await tx.assignmentProgress.update({
        where: { id: progress.id },
        data: { completed: true, completedAt: new Date() },
      });
    }
  }
}

async function cleanupNotifications(tx, step) {
  await tx.processNotification.updateMany({
    where: { stepId: step.id },
    data: { status: "CLAIMED" },
  });
}

async function createRoleSteps(tx, params) {
  const users = await tx.userRole.findMany({
    where: {
      roleId: { in: params.roles },
      departmentId: { in: params.departments },
    },
    distinct: ["userId"],
  });

  return Promise.all(
    users.map((user) =>
      tx.processStepInstance.create({
        data: {
          processId: params.processId,
          assignmentId: params.assignmentId,
          progressId: params.progressId,
          assignedTo: user.userId,
          roleId: user.roleId,
          departmentId: user.departmentId,
          status: "PENDING",
          deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      })
    )
  );
}

async function getAssignmentDepartments(assignmentId) {
  const assignment = await prisma.workflowAssignment.findUnique({
    where: { id: assignmentId },
    select: { assigneeIds: true },
  });
  return assignment?.assigneeIds || [];
}
