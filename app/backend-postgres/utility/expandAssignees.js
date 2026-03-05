// utility/expandAssignees.js
import { buildRoleHierarchyForAssignment } from "../controller/process-controller.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Given a workflow step (with its assignments fully loaded), return a Set of user IDs
 * that would be assigned to that step.
 */
export async function expandAssigneesForStep(step) {
  const userIds = new Set();
  for (const assignment of step.assignments) {
    const ids = await expandAssigneesForAssignment(assignment);
    ids.forEach((id) => userIds.add(id));
  }
  return userIds;
}

/**
 * Given a single workflow assignment, return a Set of user IDs that would be assigned.
 */
export async function expandAssigneesForAssignment(assignment) {
  const userIds = new Set();

  switch (assignment.assigneeType) {
    case "USER":
      assignment.assigneeIds.forEach((id) => userIds.add(Number(id)));
      break;

    case "ROLE": {
      const users = await prisma.userRole.findMany({
        where: { roleId: { in: assignment.assigneeIds } },
        select: { userId: true },
      });
      users.forEach((u) => userIds.add(u.userId));
      break;
    }

    case "DEPARTMENT": {
      // For each department, we need to get the target roles based on direction/parallel.
      // This mimics the logic in handleDepartmentAssignment.
      // If departmentRoles are not preloaded, fetch them.
      const departmentRoles =
        assignment.departmentRoles ||
        (await prisma.departmentRoleAssignment.findMany({
          where: { workflowAssignmentId: assignment.id },
          include: { role: true },
        }));

      // Group roles by department
      const deptToRoles = new Map();
      departmentRoles.forEach((dr) => {
        if (!deptToRoles.has(dr.departmentId)) {
          deptToRoles.set(dr.departmentId, []);
        }
        deptToRoles.get(dr.departmentId).push(dr.roleId);
      });

      for (const deptId of assignment.assigneeIds) {
        const roleIds = deptToRoles.get(deptId) || [];
        if (roleIds.length === 0) continue;

        let targetRoleIds = roleIds;
        if (!assignment.allowParallel) {
          // Build hierarchy to get the first level based on direction
          const hierarchy = await buildRoleHierarchyForAssignment(
            assignment.direction,
            false,
            roleIds,
          );
          targetRoleIds = hierarchy[0] || [];
        }

        const users = await prisma.userRole.findMany({
          where: {
            roleId: { in: targetRoleIds },
            role: { departmentId: deptId },
          },
          select: { userId: true },
        });
        users.forEach((u) => userIds.add(u.userId));
      }
      break;
    }

    default:
      break;
  }

  return userIds;
}

// Import buildRoleHierarchyForAssignment from process-controller
