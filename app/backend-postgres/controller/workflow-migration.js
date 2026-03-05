import { PrismaClient } from "@prisma/client";
import { verifyUser } from "../utility/verifyUser.js";
import { AccessType } from "@prisma/client";
import {
  expandAssigneesForStep,
  expandAssigneesForAssignment,
} from "../utility/expandAssignees.js";
import {
  ensureDocumentAccessWithParents,
  processAssignment,
} from "./process-controller.js";

const prisma = new PrismaClient();

export const previewMigration = async (req, res) => {
  try {
    const { newWorkflowId } = req.params;
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    // Fetch new workflow with steps and assignments
    const newWorkflow = await prisma.workflow.findUnique({
      where: { id: newWorkflowId },
      include: {
        steps: {
          orderBy: { stepNumber: "asc" },
          include: { assignments: { include: { departmentRoles: true } } },
        },
      },
    });
    if (!newWorkflow) {
      return res.status(404).json({ error: "New workflow not found" });
    }

    const previousVersionId = newWorkflow.previousVersionId;
    if (!previousVersionId) {
      return res.status(400).json({
        error: "This workflow has no previous version; nothing to migrate.",
      });
    }

    // Fetch old workflow
    const oldWorkflow = await prisma.workflow.findUnique({
      where: { id: previousVersionId },
      include: {
        steps: {
          orderBy: { stepNumber: "asc" },
          include: { assignments: { include: { departmentRoles: true } } },
        },
      },
    });
    if (!oldWorkflow) {
      return res
        .status(404)
        .json({ error: "Previous workflow version not found" });
    }

    // Find active processes using the old workflow
    const processes = await prisma.processInstance.findMany({
      where: {
        workflowId: oldWorkflow.id,
        status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
      },
      include: {
        currentStep: true,
        initiator: { select: { username: true } },
        stepInstances: {
          where: {
            status: { in: ["IN_PROGRESS", "PENDING", "FOR_RECIRCULATION"] },
          },
          include: { workflowAssignment: true },
        },
      },
    });

    // Helper to collect all assignee IDs from a workflow (for building maps)
    const collectAssigneeIds = async (workflow) => {
      const userIds = new Set();
      const roleIds = new Set();
      const deptIds = new Set();

      for (const step of workflow.steps) {
        for (const assignment of step.assignments) {
          switch (assignment.assigneeType) {
            case "USER":
              assignment.assigneeIds.forEach((id) => userIds.add(Number(id)));
              break;
            case "ROLE":
              assignment.assigneeIds.forEach((id) => roleIds.add(Number(id)));
              break;
            case "DEPARTMENT":
              assignment.assigneeIds.forEach((id) => deptIds.add(Number(id)));
              // Collect roles from departmentRoles
              if (assignment.departmentRoles) {
                assignment.departmentRoles.forEach((dr) =>
                  roleIds.add(dr.roleId),
                );
              }
              // Also from selectedRoles if present
              if (
                assignment.selectedRoles &&
                Array.isArray(assignment.selectedRoles)
              ) {
                assignment.selectedRoles.forEach((roleId) =>
                  roleIds.add(Number(roleId)),
                );
              }
              break;
          }
        }
      }
      return {
        userIds: Array.from(userIds),
        roleIds: Array.from(roleIds),
        deptIds: Array.from(deptIds),
      };
    };

    // Collect IDs from both workflows
    const oldIds = await collectAssigneeIds(oldWorkflow);
    const newIds = await collectAssigneeIds(newWorkflow);

    const allUserIds = [...new Set([...oldIds.userIds, ...newIds.userIds])];
    const allRoleIds = [...new Set([...oldIds.roleIds, ...newIds.roleIds])];
    const allDeptIds = [...new Set([...oldIds.deptIds, ...newIds.deptIds])];

    // Fetch details
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, username: true, name: true },
    });
    const userMap = new Map(
      users.map((u) => [u.id, u.username || u.name || `User ${u.id}`]),
    );

    const roles = await prisma.role.findMany({
      where: { id: { in: allRoleIds } },
      select: { id: true, role: true },
    });
    const roleMap = new Map(roles.map((r) => [r.id, r.role]));

    const departments = await prisma.department.findMany({
      where: { id: { in: allDeptIds } },
      select: { id: true, name: true },
    });
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    // Helper to resolve an array of IDs to { id, name, type }
    const resolveAssignees = (ids) => {
      return ids.map((id) => {
        if (userMap.has(id)) return { id, name: userMap.get(id), type: "user" };
        if (roleMap.has(id)) return { id, name: roleMap.get(id), type: "role" };
        if (deptMap.has(id))
          return { id, name: deptMap.get(id), type: "department" };
        return { id, name: `Unknown (ID: ${id})`, type: "unknown" };
      });
    };

    // Build step changes for each process
    const preview = await Promise.all(
      processes.map(async (process) => {
        const currentStepNumber = process.currentStep?.stepNumber || 0;
        const oldStepMap = new Map(
          oldWorkflow.steps.map((s) => [s.stepNumber, s]),
        );
        const newStepMap = new Map(
          newWorkflow.steps.map((s) => [s.stepNumber, s]),
        );

        const stepChanges = [];

        for (const oldStep of oldWorkflow.steps) {
          const stepNumber = oldStep.stepNumber;
          const newStep =
            newStepMap.get(stepNumber) ||
            newWorkflow.steps.find((s) => s.stepName === oldStep.stepName);

          const oldAssignees = await expandAssigneesForStep(oldStep);
          const newAssignees = newStep
            ? await expandAssigneesForStep(newStep)
            : new Set();

          const addedIds = Array.from(newAssignees).filter(
            (id) => !oldAssignees.has(id),
          );
          const removedIds = Array.from(oldAssignees).filter(
            (id) => !newAssignees.has(id),
          );

          const addedDetails = resolveAssignees(addedIds);
          const removedDetails = resolveAssignees(removedIds);

          let stepStatus = "future";
          if (stepNumber < currentStepNumber) stepStatus = "passed";
          else if (stepNumber === currentStepNumber) stepStatus = "current";

          stepChanges.push({
            stepNumber,
            stepName: oldStep.stepName,
            existsInNew: !!newStep,
            newStepNumber: newStep?.stepNumber,
            stepStatus,
            addedAssignees: addedDetails,
            removedAssignees: removedDetails,
            addedCount: addedIds.length,
            removedCount: removedIds.length,
          });
        }

        const newStepsOnly = newWorkflow.steps.filter(
          (s) =>
            !oldStepMap.has(s.stepNumber) &&
            !Array.from(oldStepMap.values()).some(
              (os) => os.stepName === s.stepName,
            ),
        );

        const summary = generateLaymanSummary(
          process,
          stepChanges,
          newStepsOnly,
        );

        return {
          processId: process.id,
          processName: process.name,
          initiator: process.initiator.username,
          currentStepNumber,
          currentStepName: process.currentStep?.stepName,
          stepChanges,
          newStepsCount: newStepsOnly.length,
          summary,
        };
      }),
    );

    return res.status(200).json({
      oldWorkflow: {
        id: oldWorkflow.id,
        name: oldWorkflow.name,
        version: oldWorkflow.version,
      },
      newWorkflow: {
        id: newWorkflow.id,
        name: newWorkflow.name,
        version: newWorkflow.version,
      },
      processes: preview,
    });
  } catch (error) {
    console.error("Migration preview error:", error);
    return res
      .status(500)
      .json({ error: "Failed to generate migration preview" });
  }
};

function generateLaymanSummary(process, stepChanges, newStepsOnly) {
  const lines = [];
  const current = stepChanges.find((s) => s.stepStatus === "current");
  if (current) {
    if (current.removedCount > 0) {
      lines.push(
        `At the current step (${current.stepName}), ${current.removedCount} person(s) will lose access.`,
      );
    }
    if (current.addedCount > 0) {
      lines.push(
        `At the current step, ${current.addedCount} new person(s) will be added and can act.`,
      );
    }
  }

  const passed = stepChanges.filter((s) => s.stepStatus === "passed");
  const addedInPassed = passed.reduce((sum, s) => sum + s.addedCount, 0);
  const removedInPassed = passed.reduce((sum, s) => sum + s.removedCount, 0);
  if (addedInPassed > 0) {
    lines.push(
      `In steps you've already completed, ${addedInPassed} new person(s) will be added as observers (they can see documents but not act).`,
    );
  }
  if (removedInPassed > 0) {
    lines.push(
      `In completed steps, ${removedInPassed} person(s) will lose access.`,
    );
  }

  const future = stepChanges.filter((s) => s.stepStatus === "future");
  const addedInFuture = future.reduce((sum, s) => sum + s.addedCount, 0);
  const removedInFuture = future.reduce((sum, s) => sum + s.removedCount, 0);
  if (addedInFuture > 0) {
    lines.push(
      `In future steps, ${addedInFuture} new person(s) will be assigned when the process reaches them.`,
    );
  }
  if (removedInFuture > 0) {
    lines.push(
      `Some people originally assigned to future steps will no longer be involved.`,
    );
  }

  if (newStepsOnly.length > 0) {
    lines.push(
      `The new workflow has ${newStepsOnly.length} new step(s) that will be inserted after the current step.`,
    );
  }

  const currentRemoved = stepChanges.find(
    (s) => s.stepStatus === "current" && !s.existsInNew,
  );
  if (currentRemoved) {
    lines.push(
      `⚠️ The current step "${currentRemoved.stepName}" does not exist in the new workflow. The process will be moved to the next available step.`,
    );
  }

  return lines.join(" ") || "No significant changes for this process.";
}

export const migrateProcesses = async (req, res) => {
  try {
    const { newWorkflowId } = req.params;
    const { processIds } = req.body;
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    console.log("=== Starting migration for newWorkflowId:", newWorkflowId);
    console.log("Selected processIds:", processIds);

    if (!processIds || !Array.isArray(processIds) || processIds.length === 0) {
      return res.status(400).json({ error: "processIds array is required" });
    }

    // Fetch new workflow with steps and assignments
    const newWorkflow = await prisma.workflow.findUnique({
      where: { id: newWorkflowId },
      include: {
        steps: {
          orderBy: { stepNumber: "asc" },
          include: { assignments: { include: { departmentRoles: true } } },
        },
      },
    });
    if (!newWorkflow)
      return res.status(404).json({ error: "New workflow not found" });

    const oldWorkflowId = newWorkflow.previousVersionId;
    if (!oldWorkflowId)
      return res.status(400).json({ error: "No previous version" });

    const oldWorkflow = await prisma.workflow.findUnique({
      where: { id: oldWorkflowId },
      include: {
        steps: {
          orderBy: { stepNumber: "asc" },
          include: { assignments: { include: { departmentRoles: true } } },
        },
      },
    });
    if (!oldWorkflow)
      return res.status(404).json({ error: "Old workflow not found" });

    const oldStepMap = new Map(oldWorkflow.steps.map((s) => [s.stepNumber, s]));
    const newStepMap = new Map(newWorkflow.steps.map((s) => [s.stepNumber, s]));

    const results = [];

    for (const processId of processIds) {
      console.log(`\n--- Processing process ${processId} ---`);
      try {
        const migrationResult = await prisma.$transaction(async (tx) => {
          console.log(`Transaction started for process ${processId}`);

          // Fetch process with all necessary relations
          const process = await tx.processInstance.findUnique({
            where: { id: processId, workflowId: oldWorkflowId },
            include: {
              currentStep: true,
              stepInstances: {
                include: {
                  workflowAssignment: true,
                  processQA: true,
                  recommendations: true,
                },
              },
              documents: true,
              assignmentProgresses: {
                include: {
                  workflowAssignment: true,
                  departmentStepProgress: true,
                },
              },
            },
          });

          if (!process) {
            throw new Error(
              `Process ${processId} not found or not using old workflow`,
            );
          }
          console.log(
            `Process found: ${process.name}, current step: ${process.currentStep?.stepNumber}`,
          );

          const currentStepNumber = process.currentStep?.stepNumber || 0;

          // Update process to point to new workflow
          await tx.processInstance.update({
            where: { id: processId },
            data: { workflowId: newWorkflowId },
          });
          console.log("Process workflowId updated to new workflow");

          const migrationDetails = [];
          const allDocumentIds = process.documents.map((d) => d.documentId);

          // --- Helper to get assignmentProgress (create if not exists) ---
          async function getOrCreateAssignmentProgress(assignment) {
            let progress = await tx.assignmentProgress.findFirst({
              where: {
                processId,
                assignmentId: assignment.id,
              },
            });
            if (!progress) {
              // Build role hierarchy for department assignments if needed
              let roleHierarchy = null;
              if (
                assignment.assigneeType === "DEPARTMENT" &&
                !assignment.allowParallel
              ) {
                roleHierarchy = await buildRoleHierarchyForAssignment(
                  assignment.direction,
                  false,
                  assignment.selectedRoles,
                );
              }
              progress = await tx.assignmentProgress.create({
                data: {
                  processId,
                  assignmentId: assignment.id,
                  completed: false,
                  roleHierarchy: roleHierarchy
                    ? JSON.stringify(roleHierarchy)
                    : null,
                },
              });
              console.log(
                `      Created assignmentProgress ${progress.id} for assignment ${assignment.id}`,
              );
            }
            return progress;
          }

          // --- Helper to get or create departmentStepProgress ---
          async function getOrCreateDepartmentProgress(
            assignment,
            step,
            progress,
            departmentId,
          ) {
            let deptProgress = await tx.departmentStepProgress.findFirst({
              where: {
                processId,
                stepId: step.id,
                departmentId,
                assignmentProgressId: progress.id,
              },
            });
            if (!deptProgress) {
              const roleLevels = assignment.allowParallel
                ? [assignment.selectedRoles]
                : await buildRoleHierarchyForAssignment(
                    assignment.direction,
                    false,
                    assignment.selectedRoles,
                  );
              deptProgress = await tx.departmentStepProgress.create({
                data: {
                  processId,
                  stepId: step.id,
                  departmentId,
                  roleLevels: JSON.stringify(roleLevels),
                  currentLevel: 0,
                  direction: assignment.direction || "DOWNWARDS",
                  requiredRoles: assignment.selectedRoles,
                  completedRoles: [],
                  assignmentProgressId: progress.id,
                },
              });
              console.log(
                `      Created departmentStepProgress for dept ${departmentId}`,
              );
            }
            return deptProgress;
          }

          // --- Helper to determine if a role assignment is completed ---
          async function isRoleAssignmentCompleted(assignmentId) {
            const progress = await tx.assignmentProgress.findFirst({
              where: { processId, assignmentId },
            });
            return progress?.completed || false;
          }

          // --- Helper to determine if a department assignment is completed for a specific department ---
          async function isDepartmentAssignmentCompleted(
            assignmentId,
            departmentId,
          ) {
            const progress = await tx.assignmentProgress.findFirst({
              where: { processId, assignmentId },
              include: { departmentStepProgress: true },
            });
            if (!progress) return false;
            const deptProgress = progress.departmentStepProgress.find(
              (d) => d.departmentId === departmentId,
            );
            return deptProgress?.isCompleted || false;
          }

          // --- Process each old step ---
          for (const oldStep of oldWorkflow.steps) {
            const stepNumber = oldStep.stepNumber;
            console.log(
              `  Evaluating old step ${stepNumber}: ${oldStep.stepName}`,
            );

            const newStep =
              newStepMap.get(stepNumber) ||
              newWorkflow.steps.find((s) => s.stepName === oldStep.stepName);

            if (newStep) {
              console.log(
                `    Corresponding new step: ${newStep.stepNumber} - ${newStep.stepName}`,
              );
            } else {
              console.log(`    No corresponding new step found (removed)`);
            }

            // Get all assignees for old and new step
            const oldAssignees = await expandAssigneesForStep(oldStep);
            const newAssignees = newStep
              ? await expandAssigneesForStep(newStep)
              : new Set();

            console.log(
              `    Old assignees (${oldAssignees.size}):`,
              Array.from(oldAssignees),
            );
            console.log(
              `    New assignees (${newAssignees.size}):`,
              Array.from(newAssignees),
            );

            const added = Array.from(newAssignees).filter(
              (id) => !oldAssignees.has(id),
            );
            const removed = Array.from(oldAssignees).filter(
              (id) => !newAssignees.has(id),
            );

            console.log(`    Added: ${added.length}`, added);
            console.log(`    Removed: ${removed.length}`, removed);

            migrationDetails.push({
              stepNumber,
              stepName: oldStep.stepName,
              added,
              removed,
            });

            let stepStatus = "future";
            if (stepNumber < currentStepNumber) stepStatus = "passed";
            else if (stepNumber === currentStepNumber) stepStatus = "current";
            else stepStatus = "future";
            console.log(`    Step status: ${stepStatus}`);

            // --- REMOVE assignees ---
            if (removed.length > 0) {
              console.log(
                `    Removing ${removed.length} assignees completely...`,
              );

              // Unconditionally remove document access to sever file visibility
              await tx.documentAccess.deleteMany({
                where: { processId, userId: { in: removed } },
              });

              // Delete incomplete or migrated step instances so they lose dashboard visibility
              // (Do not delete "APPROVED" to preserve audit history of past actions)
              const deleteResult = await tx.processStepInstance.deleteMany({
                where: {
                  processId,
                  stepId: oldStep.id,
                  assignedTo: { in: removed },
                  status: {
                    in: [
                      "PENDING",
                      "IN_PROGRESS",
                      "FOR_RECIRCULATION",
                      "MIGRATED",
                    ],
                  },
                },
              });
              console.log(
                `    Deleted ${deleteResult.count} active/migrated step instances`,
              );
            }

            // --- ADD assignees ---
            if (added.length > 0 && newStep) {
              console.log(
                `    Adding ${added.length} assignees for step status ${stepStatus}`,
              );

              if (stepStatus === "passed") {
                // Create MIGRATED (observer) instances with READ access
                for (const userId of added) {
                  const stepInstance = await tx.processStepInstance.create({
                    data: {
                      processId,
                      stepId: newStep.id,
                      assignedTo: userId,
                      status: "MIGRATED",
                      isMigrated: true,
                      createdAt: new Date(),
                    },
                  });
                  console.log(
                    `      Created MIGRATED instance for user ${userId}`,
                  );

                  // Grant READ access to all documents (no parent folders for simplicity)
                  for (const docId of allDocumentIds) {
                    await tx.documentAccess.create({
                      data: {
                        documentId: docId,
                        stepInstanceId: stepInstance.id,
                        processId,
                        userId,
                        accessType: [AccessType.READ],
                      },
                    });
                  }
                }
              } else if (stepStatus === "current") {
                // For current step, process each assignment in the new step
                for (const assignment of newStep.assignments) {
                  // Get all users that belong to this assignment according to new workflow
                  const assignmentUsers =
                    await expandAssigneesForAssignment(assignment);
                  const usersForThisAssignment = added.filter((id) =>
                    assignmentUsers.has(id),
                  );

                  if (usersForThisAssignment.length === 0) continue;

                  console.log(
                    `      Processing assignment ${assignment.id} for users:`,
                    usersForThisAssignment,
                  );

                  // Get or create assignmentProgress (required for tracking)
                  const progress =
                    await getOrCreateAssignmentProgress(assignment);

                  // Check if this assignment is already completed (for ROLE and DEPARTMENT types)
                  let assignmentCompleted = false;
                  if (assignment.assigneeType === "ROLE") {
                    assignmentCompleted = await isRoleAssignmentCompleted(
                      assignment.id,
                    );
                  }

                  // Handle different assignment types
                  if (assignment.assigneeType === "USER") {
                    // USER assignments: always create IN_PROGRESS instances for added users
                    for (const userId of usersForThisAssignment) {
                      const stepInstance = await tx.processStepInstance.create({
                        data: {
                          processId,
                          stepId: newStep.id,
                          assignmentId: assignment.id,
                          progressId: progress.id,
                          assignedTo: userId,
                          status: "IN_PROGRESS",
                          createdAt: new Date(),
                        },
                      });
                      console.log(
                        `        Created IN_PROGRESS instance for user ${userId}`,
                      );

                      for (const docId of allDocumentIds) {
                        await ensureDocumentAccessWithParents(tx, {
                          documentId: docId,
                          userId,
                          stepInstanceId: stepInstance.id,
                          processId,
                          assignmentId: assignment.id,
                          roleId: null,
                          departmentId: null,
                        });
                      }
                    }
                  } else if (assignment.assigneeType === "ROLE") {
                    // ROLE assignments: if assignment already completed, added users become observers
                    if (assignmentCompleted) {
                      for (const userId of usersForThisAssignment) {
                        const stepInstance =
                          await tx.processStepInstance.create({
                            data: {
                              processId,
                              stepId: newStep.id,
                              assignedTo: userId,
                              status: "MIGRATED",
                              isMigrated: true,
                              createdAt: new Date(),
                            },
                          });
                        console.log(
                          `        Assignment completed; created MIGRATED instance for user ${userId}`,
                        );

                        for (const docId of allDocumentIds) {
                          await tx.documentAccess.create({
                            data: {
                              documentId: docId,
                              stepInstanceId: stepInstance.id,
                              processId,
                              userId,
                              accessType: [AccessType.READ],
                            },
                          });
                        }
                      }
                    } else {
                      // Assignment not completed: create IN_PROGRESS instances
                      for (const userId of usersForThisAssignment) {
                        // Find which role this user belongs to
                        const userRole = await tx.userRole.findFirst({
                          where: {
                            userId,
                            roleId: { in: assignment.assigneeIds },
                          },
                          include: { role: true },
                        });
                        const roleId = userRole?.roleId || null;
                        const departmentId =
                          userRole?.role?.departmentId || null;

                        const stepInstance =
                          await tx.processStepInstance.create({
                            data: {
                              processId,
                              stepId: newStep.id,
                              assignmentId: assignment.id,
                              progressId: progress.id,
                              assignedTo: userId,
                              roleId,
                              departmentId,
                              status: "IN_PROGRESS",
                              createdAt: new Date(),
                            },
                          });
                        console.log(
                          `        Created IN_PROGRESS instance for user ${userId} (role ${roleId})`,
                        );

                        for (const docId of allDocumentIds) {
                          await ensureDocumentAccessWithParents(tx, {
                            documentId: docId,
                            userId,
                            stepInstanceId: stepInstance.id,
                            processId,
                            assignmentId: assignment.id,
                            roleId,
                            departmentId,
                          });
                        }
                      }
                    }
                  } else if (assignment.assigneeType === "DEPARTMENT") {
                    // DEPARTMENT assignments: need to handle per-department progress and current level
                    // Group users by department based on their role's department
                    const usersByDept = new Map(); // deptId -> array of { userId, roleId }

                    for (const userId of usersForThisAssignment) {
                      const userRoles = await tx.userRole.findMany({
                        where: {
                          userId,
                          roleId: { in: assignment.selectedRoles },
                        },
                        include: { role: true },
                      });
                      for (const ur of userRoles) {
                        if (
                          assignment.assigneeIds.includes(ur.role.departmentId)
                        ) {
                          const deptId = ur.role.departmentId;
                          if (!usersByDept.has(deptId))
                            usersByDept.set(deptId, []);
                          usersByDept
                            .get(deptId)
                            .push({ userId, roleId: ur.roleId });
                        }
                      }
                    }

                    for (const [deptId, users] of usersByDept) {
                      // Check if this department assignment is already completed
                      const deptCompleted =
                        await isDepartmentAssignmentCompleted(
                          assignment.id,
                          deptId,
                        );

                      // Get or create departmentStepProgress
                      const deptProgress = await getOrCreateDepartmentProgress(
                        assignment,
                        newStep,
                        progress,
                        deptId,
                      );
                      const roleLevels = JSON.parse(deptProgress.roleLevels);
                      const currentLevelRoles =
                        roleLevels[deptProgress.currentLevel] || [];

                      if (deptCompleted) {
                        // Department assignment is fully completed → added users become observers
                        for (const { userId, roleId } of users) {
                          const stepInstance =
                            await tx.processStepInstance.create({
                              data: {
                                processId,
                                stepId: newStep.id,
                                assignmentId: assignment.id, // Add this
                                progressId: progress.id, // Add this
                                assignedTo: userId,
                                status: "MIGRATED",
                                isMigrated: true,
                                createdAt: new Date(),
                              },
                            });
                          console.log(
                            `        Dept completed; created MIGRATED instance for user ${userId} (dept ${deptId})`,
                          );

                          for (const docId of allDocumentIds) {
                            await tx.documentAccess.create({
                              data: {
                                documentId: docId,
                                stepInstanceId: stepInstance.id,
                                processId,
                                userId,
                                accessType: [AccessType.READ],
                              },
                            });
                          }
                        }
                      } else {
                        // Department not completed: create active instances only for users whose role is at current level
                        for (const { userId, roleId } of users) {
                          if (currentLevelRoles.includes(roleId)) {
                            const stepInstance =
                              await tx.processStepInstance.create({
                                data: {
                                  processId,
                                  stepId: newStep.id,
                                  assignmentId: assignment.id,
                                  progressId: progress.id,
                                  assignedTo: userId,
                                  roleId,
                                  departmentId: deptId,
                                  status: "IN_PROGRESS",
                                  createdAt: new Date(),
                                },
                              });
                            console.log(
                              `        Created IN_PROGRESS instance for user ${userId} at current level (dept ${deptId})`,
                            );

                            for (const docId of allDocumentIds) {
                              await ensureDocumentAccessWithParents(tx, {
                                documentId: docId,
                                userId,
                                stepInstanceId: stepInstance.id,
                                processId,
                                assignmentId: assignment.id,
                                roleId,
                                departmentId: deptId,
                              });
                            }
                          } else {
                            // User's role is at a future level → no instance now, but they are part of the department progress.
                            // They will get instances when the department progresses to their level.
                            console.log(
                              `        User ${userId} role ${roleId} is future level (current level roles: ${currentLevelRoles}); no instance created yet.`,
                            );
                          }
                        }
                      }
                    }
                  }
                }
              }
              // Future steps: no action
            }

            // --- Handle case where current step is removed ---
            if (!newStep && stepStatus === "current") {
              console.log(`    Current step removed; looking for next step...`);
              const nextStep =
                newWorkflow.steps.find(
                  (s) => s.stepNumber > currentStepNumber,
                ) || newWorkflow.steps[newWorkflow.steps.length - 1];

              if (nextStep) {
                console.log(
                  `    Moving to next step: ${nextStep.stepNumber} - ${nextStep.stepName}`,
                );
                await tx.processInstance.update({
                  where: { id: processId },
                  data: { currentStepId: nextStep.id },
                });

                for (const assignment of nextStep.assignments) {
                  console.log(
                    `      Creating assignments for step ${nextStep.stepNumber}`,
                  );
                  await processAssignment(
                    tx,
                    process,
                    nextStep,
                    assignment,
                    allDocumentIds,
                    false,
                    false,
                    newWorkflow.id,
                  );
                }
              } else {
                console.log(`    No next step; completing process`);
                await tx.processInstance.update({
                  where: { id: processId },
                  data: { status: "COMPLETED", currentStepId: null },
                });
              }
            }
          }

          // --- After processing all steps, handle assignments that were completely removed ---
          const oldAssignmentIds = oldWorkflow.steps.flatMap((s) =>
            s.assignments.map((a) => a.id),
          );
          const newAssignmentIds = newWorkflow.steps.flatMap((s) =>
            s.assignments.map((a) => a.id),
          );
          const removedAssignmentIds = oldAssignmentIds.filter(
            (id) => !newAssignmentIds.includes(id),
          );

          for (const assignmentId of removedAssignmentIds) {
            const progress = await tx.assignmentProgress.findFirst({
              where: { processId, assignmentId },
            });
            if (progress && !progress.completed) {
              await tx.assignmentProgress.update({
                where: { id: progress.id },
                data: { completed: true, completedAt: new Date() },
              });
              console.log(
                `    Marked removed assignment ${assignmentId} as completed`,
              );
            }
          }

          // --- Log migration ---
          await tx.processMigrationLog.create({
            data: {
              processId,
              oldWorkflowId,
              newWorkflowId,
              migratedBy: userData.id,
              details: migrationDetails,
            },
          });
          console.log(`Migration log created for process ${processId}`);

          return { processId, success: true };
        });

        console.log(`Migration succeeded for process ${processId}`);
        results.push(migrationResult);
      } catch (error) {
        console.error(`Migration failed for process ${processId}:`, error);
        results.push({ processId, success: false, error: error.message });
      }
    }

    console.log("=== Migration completed with results:", results);
    return res.status(200).json({
      message: "Migration completed",
      results,
    });
  } catch (error) {
    console.error("Migration execution error:", error);
    return res.status(500).json({ error: "Failed to migrate processes" });
  }
};

// Helper to create step instances for an assignment (simplified)
async function createStepInstancesForAssignment(
  tx,
  process,
  step,
  assignment,
  userIds,
) {
  // userIds may be provided (specific users) or we compute from assignment
  let targetUserIds = userIds;
  if (targetUserIds.length === 0) {
    // Expand all assignees for this assignment (similar to expandAssigneesForStep but for single assignment)
    // This is a simplified version; you'd need to implement expandAssigneesForAssignment.
    // For now, we assume you have a function.
    targetUserIds = await expandAssigneesForAssignment(assignment);
  }

  for (const userId of targetUserIds) {
    const stepInstance = await tx.processStepInstance.create({
      data: {
        processId: process.id,
        stepId: step.id,
        assignmentId: assignment.id,
        assignedTo: userId,
        status: "IN_PROGRESS",
        createdAt: new Date(),
      },
    });

    // Grant document access
    for (const doc of process.documents) {
      await ensureDocumentAccessWithParents(tx, {
        documentId: doc.documentId,
        userId,
        stepInstanceId: stepInstance.id,
        processId: process.id,
        assignmentId: assignment.id,
        roleId: null,
        departmentId: null,
      });
    }
  }
}
