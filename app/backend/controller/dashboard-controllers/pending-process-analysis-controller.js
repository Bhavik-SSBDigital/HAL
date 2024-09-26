import Process from "../../models/process.js";
import { format_department_data } from "../department-controller.js";
import Department from "../../models/department.js";
import { ObjectId } from "mongodb";
import User from "../../models/user.js";
import { verifyUser } from "../../utility/verifyUser.js";

// export const get_current_pending_process_per_step = async (req, res, next) => {
//   try {
//     const departmentId = req.body.department;

//     let department = await Department.findOne({ _id: departmentId });

//     department = await format_department_data([department]);

//     const steps = department[0].workFlow;

//     let processes_per_step = [];

//     let pendingProcessNames = [];

//     for (let i = 0; i < steps.length; i++) {
//       //   const stepNumber = i + 1;
//       // const pendingProcesses = await Process.find({
//       //   workFlow: departmentId,
//       //   currentStepNumber: i,
//       //   completed: false,
//       // }).select("_id name");

//       let pendingProcesses = await Process.find({
//         $or: [
//           // For intra-branch processes where isInterBranchProcess is false
//           {
//             isInterBranchProcess: false,
//             currentStepNumber: i + 1,
//             completed: false,
//             workFlow: new ObjectId(departmentId),
//           },
//           {
//             isInterBranchProcess: true,
//             connectors: {
//               $elemMatch: {
//                 department: new ObjectId(departmentId),
//                 currentStepNumber: i + 1,
//                 completed: false,
//               },
//             },
//           },
//           // For inter-branch processes where isInterBranchProcess is true and workFlow matches departmentId
//           {
//             isInterBranchProcess: true,
//             workFlow: new ObjectId(departmentId),
//             currentStepNumber: i + 1,
//             completed: false,
//           },

//           // For inter-branch processes where isInterBranchProcess is true and workFlow does not match departmentId
//         ],
//       }).select("_id name");

//       const completedProcesses = await Process.find({
//         $or: [
//           // For intra-branch processes where isInterBranchProcess is false
//           {
//             isInterBranchProcess: false,
//             currentStepNumber: i + 1,
//             completed: true,
//             workFlow: new ObjectId(departmentId),
//           },
//           {
//             isInterBranchProcess: true,
//             connectors: {
//               $elemMatch: {
//                 department: new ObjectId(departmentId),
//                 currentStepNumber: i + 1,
//                 completed: true,
//               },
//             },
//           },
//           // For inter-branch processes where isInterBranchProcess is true and workFlow matches departmentId
//           {
//             isInterBranchProcess: true,
//             workFlow: new ObjectId(departmentId),
//             currentStepNumber: i + 1,
//             completed: true,
//           },

//           // For inter-branch processes where isInterBranchProcess is true and workFlow does not match departmentId
//         ],
//       }).select("_id name");

//       pendingProcessNames.push(...pendingProcesses.map((item) => item.name));

//       pendingProcessNames.push(...completedProcesses.map((item) => item.name));

//       pendingProcesses = pendingProcesses.map((item) => item.name);

//       processes_per_step.push({
//         step: steps[i],
//         noOfPendingProcesses: pendingProcesses.length,
//         pendingProcesses: pendingProcesses,
//       });
//     }

//     return res.status(200).json({
//       processesPerStep: processes_per_step,
//       pendingProcessNames: pendingProcessNames,
//     });
//   } catch (error) {
//     console.log("error getting pending process count per step", error);
//     return res.status(500).json({
//       message: "error getting pending process count per step",
//     });
//   }
// };

export const get_current_pending_process_per_step = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    const departmentId = req.body.department;

    let department = await Department.findOne({ _id: departmentId });

    department = await format_department_data([department]);

    const steps = department[0].workFlow;

    let processes_per_step = [];
    let pendingProcessDetails = [];
    let pendingProcessNames = [];

    for (let i = 0; i < steps.length; i++) {
      // Get pending and completed processes
      let pendingProcesses = await Process.find({
        $or: [
          {
            isInterBranchProcess: false,
            currentStepNumber: i + 1,
            completed: false,
            workFlow: new ObjectId(departmentId),
          },
          {
            isInterBranchProcess: true,
            connectors: {
              $elemMatch: {
                department: new ObjectId(departmentId),
                currentStepNumber: i + 1,
                completed: false,
              },
            },
          },
          {
            isInterBranchProcess: true,
            workFlow: new ObjectId(departmentId),
            currentStepNumber: i + 1,
            completed: false,
          },
        ],
      }).select(
        "_id name currentActorUser connectors isInterBranchProcess workFlow"
      );

      const completedProcesses = await Process.find({
        $or: [
          {
            isInterBranchProcess: false,
            currentStepNumber: i + 1,
            completed: true,
            workFlow: new ObjectId(departmentId),
          },
          {
            isInterBranchProcess: true,
            connectors: {
              $elemMatch: {
                department: new ObjectId(departmentId),
                currentStepNumber: i + 1,
                completed: true,
              },
            },
          },
          {
            isInterBranchProcess: true,
            workFlow: new ObjectId(departmentId),
            currentStepNumber: i + 1,
            completed: true,
          },
        ],
      }).select(
        "_id name currentActorUser connectors isInterBranchProcess workFlow"
      );

      pendingProcessNames.push(...pendingProcesses.map((item) => item.name));

      pendingProcessNames.push(...completedProcesses.map((item) => item.name));

      // Collect process details
      let processDetails = [];

      for (const process of pendingProcesses) {
        let actorUser;
        if (
          !process.isInterBranchProcess ||
          process.workFlow.equals(new ObjectId(departmentId))
        ) {
          actorUser = process.currentActorUser;
          actorUser = actorUser
            ? await User.findById(actorUser).select("username")
            : {
                username:
                  "The process is yet to be picked up by the users assigned to this step.",
              };
        } else {
          actorUser = process.connectors.find((connector) =>
            connector.department.equals(departmentId)
          ).currentActorUser;
          actorUser = actorUser
            ? await User.findById(actorUser).select("username")
            : {
                username:
                  "The process is yet to be picked up by the users assigned to this step.",
              };
        }
        // const actorUser =
        //   process.currentActorUser ||
        //   (
        //     process.connectors.find((connector) =>
        //       connector.department.equals(departmentId)
        //     ) || {}
        //   ).currentActorUser;
        // const user = actorUser
        //   ? await User.findById(actorUser).select("username")
        //   : { username: "The process is yet to be picked up by the users assigned to this step." };

        let workFlowToBeFollowed = null;
        const user = await User.findById(userData._id).populate(
          "processes.workFlowToBeFollowed"
        ); // Populate the workFlowToBeFollowed field

        if (user) {
          // Find the specific process in the processes array
          const foundProcess = user.processes.find(
            (proc) => proc.process.toString() === process._id.toString()
          );

          if (foundProcess) {
            workFlowToBeFollowed = foundProcess.workFlowToBeFollowed;
          } else {
            workFlowToBeFollowed = null;
          }
        } else {
          workFlowToBeFollowed = null;
        }

        // console.log("user workflow to be followed", user);
        processDetails.push({
          name: process.name,
          actorUser:
            actorUser.username ||
            "The process is yet to be picked up by the users assigned to this step.",
          processId: process._id,
          workFlowToBeFollowed: workFlowToBeFollowed,
        });
      }

      pendingProcessDetails.push({
        step: steps[i],
        noOfPendingProcesses: processDetails.length,
        pendingProcesses: processDetails,
      });
    }

    const completedProcesses = await Process.find({
      $or: [
        {
          isInterBranchProcess: false,
          currentStepNumber: 0,
          completed: true,
          workFlow: new ObjectId(departmentId),
        },
        {
          isInterBranchProcess: true,
          connectors: {
            $elemMatch: {
              department: new ObjectId(departmentId),
              currentStepNumber: 0,
              completed: true,
            },
          },
        },
        {
          isInterBranchProcess: true,
          workFlow: new ObjectId(departmentId),
          currentStepNumber: 0,
          completed: true,
        },
      ],
    }).select(
      "_id name currentActorUser connectors isInterBranchProcess workFlow"
    );

    pendingProcessNames.push(...completedProcesses.map((item) => item.name));
    return res.status(200).json({
      processesPerStep: pendingProcessDetails,
      pendingProcessNames: pendingProcessNames,
    });
  } catch (error) {
    console.log("error getting pending process count per step", error);
    return res.status(500).json({
      message: "error getting pending process count per step",
    });
  }
};
