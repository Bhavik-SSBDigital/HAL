import { verifyUser } from "../utility/verifyUser.js";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*

EXAMPLE ON HOW TO CHECK DOCUMENT ACCESS

// Check if user has edit access to document
const hasEditAccess = await checkDocumentAccess(user.id, documentId, "EDIT");

// Get all access types for document
const accessRecords = await prisma.documentAccess.findMany({
  where: {
    documentId,
    OR: [
      { userId: user.id },
      { roleId: { in: userRoles } },
      { departmentId: { in: userDepartments } },
    ],
    stepInstance: { status: "PENDING" },
  },
  select: { accessType: true },
});

*/
async function checkDocumentAccess(userId, documentId, requiredAccess) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });

  const userDepartments = await prisma.department.findMany({
    where: { users: { some: { id: userId } } },
    select: { id: true },
  });

  return prisma.documentAccess.findFirst({
    where: {
      documentId,
      accessType: requiredAccess,
      stepInstance: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        process: { status: "IN_PROGRESS" },
      },
      OR: [
        { userId },
        { roleId: { in: userRoles.map((r) => r.roleId) } },
        { departmentId: { in: userDepartments.map((d) => d.id) } },
      ],
    },
  });
}

// async function initiateProcess(workflowId, initiatorId, documentIds, name) {
//   return prisma.$transaction(async (tx) => {
//     // 1. Create ProcessInstance
//     const processInstance = await tx.processInstance.create({
//       data: {
//         workflowId,
//         initiatorId,
//         name,
//         status: "PENDING",
//       },
//     });

//     // 2. Link Documents to Process
//     await Promise.all(
//       documentIds.map((documentId) =>
//         tx.processDocument.create({
//           data: {
//             processId: processInstance.id,
//             documentId,
//           },
//         })
//       )
//     );

//     // 3. Get Next(Second) Workflow Step
//     const firstStep = await tx.workflowStep.findFirstOrThrow({
//       where: { workflowId, stepNumber: 1 },
//       include: { assignments: true },
//     });

//     // 4. Create Step Instance
//     const stepInstance = await tx.processStepInstance.create({
//       data: {
//         processId: processInstance.id,
//         stepId: firstStep.id,
//         status: "PENDING",
//       },
//     });

//     // 5. Configure Document Access
//     for (const assignment of firstStep.assignments) {
//       for (const assigneeId of assignment.assigneeIds) {
//         for (const accessType of assignment.accessTypes) {
//           for (const documentId of documentIds) {
//             const accessData = {
//               stepInstanceId: stepInstance.id,
//               assignmentId: assignment.id,
//               documentId,
//               accessType,
//               processId: processInstance.id,
//             };

//             switch (assignment.assigneeType) {
//               case "USER":
//                 accessData.userId = assigneeId;
//                 await tx.documentAccess.create({ data: accessData });
//                 break;
//               case "ROLE":
//                 accessData.roleId = assigneeId;
//                 await tx.documentAccess.create({ data: accessData });
//                 break;
//               case "DEPARTMENT":
//                 // DEPARTMENT case now uses selectedRoles instead of assigneeIds
//                 for (const roleId of assignment.selectedRoles) {
//                   await tx.documentAccess.create({
//                     data: {
//                       ...accessData,
//                       roleId: roleId, // Override with roleId
//                     },
//                   });
//                 }
//                 break;
//             }
//           }
//         }
//       }
//     }

//     // 6. Get Assignees for Notifications (existing logic)
//     const allAssignees = await Promise.all(
//       firstStep.assignments.map(async (assignment) => {
//         switch (assignment.assigneeType) {
//           case "USER":
//             return assignment.assigneeIds;
//           case "ROLE":
//             const usersWithRole = await tx.userRole.findMany({
//               where: { roleId: { in: assignment.assigneeIds } },
//               select: { userId: true },
//             });
//             return usersWithRole.map((uwr) => uwr.userId);
//           case "DEPARTMENT":
//             // Modified department case with role filtering
//             const usersWithRoles = await tx.userRole.findMany({
//               where: {
//                 AND: [
//                   { departmentId: { in: assignment.assigneeIds } },
//                   { roleId: { in: assignment.selectedRoles } },
//                 ],
//               },
//               select: { userId: true },
//             });
//             return [...new Set(usersWithRoles.map((uwr) => uwr.userId))];
//           default:
//             return [];
//         }
//       })
//     );

//     const uniqueAssignees = [...new Set(allAssignees.flat())];

//     // 7. Create Notifications (existing logic)
//     await Promise.all(
//       uniqueAssignees.map((userId) =>
//         tx.processNotification.create({
//           data: {
//             stepId: stepInstance.id,
//             userId,
//           },
//         })
//       )
//     );

//     // 8. Set Up Escalations (existing logic)
//     // if (firstStep.escalationTime) {
//     //   await tx.escalation.create({
//     //     data: {
//     //       stepInstanceId: stepInstance.id,
//     //       escalationType: "REMINDER",
//     //       triggerTime: new Date(
//     //         Date.now() + firstStep.escalationTime * 60 * 60 * 1000
//     //       ),
//     //     },
//     //   });
//     // }

//     // if (firstStep.autoApprovalAfter) {
//     //   await tx.escalation.create({
//     //     data: {
//     //       stepInstanceId: stepInstance.id,
//     //       escalationType: "AUTO_APPROVAL",
//     //       triggerTime: new Date(
//     //         Date.now() + firstStep.autoApprovalAfter * 60 * 60 * 1000
//     //       ),
//     //     },
//     //   });
//     // }

//     // // 9. Track Process Initiation (existing logic)
//     // await tx.processTracking.create({
//     //   data: {
//     //     processId: processInstance.id,
//     //     userId: initiatorId,
//     //     actionType: "APPROVAL",
//     //   },
//     // });

//     // 10. Send Notifications (existing logic)
//     // const usersToNotify = await tx.user.findMany({
//     //   where: { id: { in: uniqueAssignees } },
//     // });

//     // usersToNotify.forEach((user) => {
//     //   sendEmailNotification({
//     //     email: user.email,
//     //     subject: "New Process Assignment",
//     //     content: `You've been assigned to step ${firstStep.stepName} in process ${processInstance.id}`,
//     //   });
//     // });

//     return processInstance;
//   });
// }

// export const initiate_process = async (req, res, next) => {
//   try {
//     const accessToken = req.headers["authorization"]?.substring(7);
//     const userData = await verifyUser(accessToken);

//     if (userData === "Unauthorized") {
//       return res.status(401).json({ message: "Unauthorized request" });
//     }

//     const { processName, description, workflowId, documents } = req.body;
//     const initiator = userData.id;

//     // Get workflow with first step and assignments
//     const workflow = await prisma.workflow.findUnique({
//       where: { id: workflowId },
//       include: {
//         steps: {
//           orderBy: { stepNumber: "asc" },
//           take: 1,
//           include: {
//             assignments: {
//               include: {
//                 departmentRoles: {
//                   include: {
//                     department: true,
//                     role: {
//                       include: {
//                         users: true,
//                       },
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!workflow) {
//       return res.status(404).json({ message: "Workflow not found" });
//     }

//     const firstStep = workflow.steps[0];
//     if (!firstStep) {
//       return res.status(400).json({ message: "Workflow has no steps" });
//     }

//     // Resolve all assignees to user IDs
//     const allAssignees = new Set();

//     for (const assignment of firstStep.assignments) {
//       switch (assignment.assigneeType) {
//         case "USER":
//           assignment.assigneeIds.forEach((id) => allAssignees.add(id));
//           break;
//         case "ROLE":
//           const roleUsers = await prisma.userRole.findMany({
//             where: { roleId: { in: assignment.assigneeIds } },
//             select: { userId: true },
//           });
//           roleUsers.forEach((ru) => allAssignees.add(ru.userId));
//           break;
//         case "DEPARTMENT":
//           const deptUsers = await prisma.user.findMany({
//             where: {
//               branches: { some: { id: { in: assignment.assigneeIds } } },
//             },
//           });
//           deptUsers.forEach((du) => allAssignees.add(du.id));
//           break;
//         default:
//           break;
//       }
//     }

//     // Create Process Instance
//     const processInstance = await prisma.processInstance.create({
//       data: {
//         name: processName,
//         workflowId: workflowId,
//         initiatorId: userData.id,
//         currentStepId: firstStep.id,
//         documents: {
//           create: documents.map((doc) => ({
//             documentId: doc.documentId,
//           })),
//         },
//       },
//     });

//     // Create Step Instances and related records
//     const assigneesArray = Array.from(allAssignees);
//     const stepInstances = await Promise.all(
//       assigneesArray.map(async (userId) => {
//         const stepInstance = await prisma.processStepInstance.create({
//           data: {
//             processId: processInstance.id,
//             stepId: firstStep.id,
//             assignedTo: userId,
//             status: "PENDING",
//             deadline: new Date(
//               Date.now() + (firstStep.escalationTime || 24) * 60 * 60 * 1000
//             ),
//           },
//         });

//         // Create document accesses
//         await prisma.documentAccess.createMany({
//           data: documents.map((doc) => ({
//             documentId: doc.documentId,
//             stepInstanceId: stepInstance.id,
//             accessType: "EDIT",
//             assignmentId: firstStep.assignments[0].id,
//             processId: processInstance.id,
//             userId: userId,
//           })),
//         });

//         // Create notifications
//         await prisma.processNotification.create({
//           data: {
//             stepId: stepInstance.id,
//             userId: userId,
//             status: "ACTIVE",
//           },
//         });

//         return stepInstance;
//       })
//     );

//     return res.status(200).json({
//       message: "Process initiated successfully",
//       processId: processInstance.id,
//       stepCount: stepInstances.length,
//     });
//   } catch (error) {
//     console.log("Error initiating the process", error);
//     return res.status(500).json({
//       message: "Error initiating the process",
//       error: error.message,
//     });
//   }
// };

export const initiate_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { processName, description, workflowId, documents } = req.body;
    const initiator = userData.id;

    // Get workflow with first step and assignments
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          orderBy: { stepNumber: "asc" },
          take: 1,
          include: {
            assignments: {
              include: {
                departmentRoles: {
                  include: {
                    department: true,
                    role: {
                      include: {
                        parentRole: true,
                        childRoles: true,
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

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const firstStep = workflow.steps[0];
    if (!firstStep) {
      return res.status(400).json({ message: "Workflow has no steps" });
    }

    // Resolve all assignees to user IDs
    const allAssignees = new Set();

    for (const assignment of firstStep.assignments) {
      switch (assignment.assigneeType) {
        case "USER":
          assignment.assigneeIds.forEach((id) => allAssignees.add(id));
          break;
        case "ROLE":
          const roleUsers = await prisma.userRole.findMany({
            where: { roleId: { in: assignment.assigneeIds } },
            select: { userId: true },
          });
          roleUsers.forEach((ru) => allAssignees.add(ru.userId));
          break;
        case "DEPARTMENT":
          // Get all departments in this assignment
          const departments = await prisma.department.findMany({
            where: { id: { in: assignment.assigneeIds } },
          });

          for (const dept of departments) {
            const deptRoles = await prisma.departmentRoleAssignment.findMany({
              where: {
                workflowAssignmentId: assignment.id,
                departmentId: dept.id,
              },
              include: { role: true },
            });

            if (assignment.allowParallel) {
              // Add all users from all roles
              for (const deptRole of deptRoles) {
                const users = await prisma.userRole.findMany({
                  where: { roleId: deptRole.roleId },
                  select: { userId: true },
                });
                users.forEach((u) => allAssignees.add(u.userId));
              }
            } else {
              // Determine target roles based on direction
              const roles = deptRoles.map((dr) => dr.role);
              let targetRoles = [];

              if (assignment.direction === "UPWARDS") {
                // Find leaf roles (no children in the list)
                targetRoles = roles.filter(
                  (role) => !roles.some((r) => r.parentRoleId === role.id)
                );
              } else {
                // Find root roles (no parent in the list)
                targetRoles = roles.filter(
                  (role) => !roles.some((r) => r.id === role.parentRoleId)
                );
              }

              // Add users from target roles
              for (const role of targetRoles) {
                const users = await prisma.userRole.findMany({
                  where: { roleId: role.id },
                  select: { userId: true },
                });
                users.forEach((u) => allAssignees.add(u.userId));
              }
            }
          }
          break;
        default:
          break;
      }
    }

    // Create Process Instance
    const processInstance = await prisma.processInstance.create({
      data: {
        name: processName,
        workflowId: workflowId,
        initiatorId: userData.id,
        currentStepId: firstStep.id,
        documents: {
          create: documents.map((doc) => ({
            documentId: doc.documentId,
          })),
        },
      },
    });

    // Create Step Instances and related records
    const assigneesArray = Array.from(allAssignees);
    const stepInstances = await Promise.all(
      assigneesArray.map(async (userId) => {
        const stepInstance = await prisma.processStepInstance.create({
          data: {
            processId: processInstance.id,
            stepId: firstStep.id,
            assignedTo: userId,
            status: "PENDING",
            deadline: new Date(
              Date.now() + (firstStep.escalationTime || 24) * 60 * 60 * 1000
            ),
          },
        });

        // Create document accesses
        await prisma.documentAccess.createMany({
          data: documents.map((doc) => ({
            documentId: doc.documentId,
            stepInstanceId: stepInstance.id,
            accessType: "EDIT",
            assignmentId: firstStep.assignments[0].id,
            processId: processInstance.id,
            userId: userId,
          })),
        });

        // Create notifications
        await prisma.processNotification.create({
          data: {
            stepId: stepInstance.id,
            userId: userId,
            status: "ACTIVE",
          },
        });

        return stepInstance;
      })
    );

    return res.status(200).json({
      message: "Process initiated successfully",
      processId: processInstance.id,
      stepCount: stepInstances.length,
    });
  } catch (error) {
    console.log("Error initiating the process", error);
    return res.status(500).json({
      message: "Error initiating the process",
      error: error.message,
    });
  }
};
