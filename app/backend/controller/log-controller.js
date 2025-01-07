import Log from "../models/log.js";
import User from "../models/user.js";
import Process from "../models/process.js";
import Work from "../models/work.js";
import mongoose from "mongoose";
import { verifyUser } from "../utility/verifyUser.js";
import Role from "../models/role.js";
import {
  format_workflow_steps,
  format_workflow_step,
} from "./department-controller.js";
import LogWork from "../models/logWork.js";

import { format_process_documents } from "./processes-controller.js";
import Edition from "../models/process-edition.js";
import { ObjectId } from "mongodb";
export const addLog = async (
  processId,
  reverted,
  currentStep,
  nextStep,
  documents,
  belongingDepartment
) => {
  try {
    let currentWorkName;

    if (currentStep.work) {
      currentWorkName = await Work.findOne({ _id: currentStep.work }).select(
        "name"
      );

      currentWorkName = currentWorkName.name;
    }

    const logWork = await LogWork.findOne({
      process: processId,
      user: currentStep.actorUser,
    });

    console.log("found log work", logWork);

    let logData = {
      processId: processId,
      time: Date.now(),
      reverted: reverted,
      currentStep: currentStep,
      documents: documents,
      belongingDepartment: belongingDepartment,
      workflowChanges: logWork
        ? {
            previous: logWork.workflowChanges.previous,
            updated: logWork.workflowChanges.updated,
          }
        : null,
    };

    await LogWork.deleteOne({
      process: processId,
      user: currentStep.actorUser,
    });

    if (nextStep) {
      logData.nextStep = nextStep;
    }

    if (currentWorkName === "publish") {
      const publishWorkId = await Work.findOne({ name: "publish" }).select(
        "_id"
      );
      const previousLogWhichHadPublishWork = await Log.findOne({
        "currentStep.work": publishWorkId._id,
        processId: processId,
      });

      let publishedToInLastLog =
        previousLogWhichHadPublishWork === null
          ? []
          : previousLogWhichHadPublishWork.publishedTo;

      let currentPublishedToOfProcess = await Process.findOne({
        _id: processId,
      }).select("publishedTo");

      currentPublishedToOfProcess = currentPublishedToOfProcess.publishedTo;

      publishedToInLastLog = publishedToInLastLog.map((item) =>
        String(item.department)
      );

      const currentProcessDepartmentIds = currentPublishedToOfProcess.map(
        (item) => String(item.department)
      );

      const newlyAddedDepartmentIds = currentProcessDepartmentIds.filter(
        (departmentId) => !publishedToInLastLog.includes(departmentId)
      );

      const newlyAddedDepartments = newlyAddedDepartmentIds.map(
        (departmentId) => ({
          department: departmentId, // You may need to modify this according to your schema
        })
      );

      logData.publishedTo = newlyAddedDepartments;
    }

    let log = new Log(logData);

    /*
        processId -> processName,
        forward(reverted: false) -> you  forwarded this process to 
        ${nextUser} for ${nextWork}
        remarks : 
    */

    log = await log.save(log);

    const newLog = {
      log: log._id,
    };

    if (currentStep) {
      await User.findByIdAndUpdate(
        { _id: currentStep.actorUser },
        {
          $push: {
            workDone: newLog,
          },
        }
      );
    }
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  }
};

// const formatStep = async (step_) => {
//   try {
//     let step = {};
//     const work = await Work.findOne({ _id: step_.work }).select("name");
//     step.work = "N/A";
//     if (work) {
//       step.work = work.name;
//     }

//     const user = await User.findOne({ _id: step_.actorUser }).select(
//       "username"
//     );

//     step.user = "N/A";

//     if (user) {
//       step.user = user.username;
//     }

//     const role = await Role.findOne({ _id: step_.actorRole }).select("role");

//     step.role = "N/A";

//     if (role) {
//       step.role = role.role;
//     }

//     step.stepNumber = step_.stepNumber;

//     return step;
//   } catch (error) {
//     throw new Error(error);
//   }
// };

export const formatUserLogs = async (workDone_, detailed) => {
  let workDone = workDone_.map((item) => item.log);

  if (detailed) {
    workDone = workDone_;
  }
  try {
    let worksDone = [];
    for (let i = 0; i < workDone.length; i++) {
      let completedWork = {};
      let work = workDone[i];
      let log = await Log.findOne({ _id: work });
      let process = await Process.findOne({ _id: log.processId }).select(
        "name"
      );

      if (!process) {
        continue;
      }

      completedWork.processName = process.name;
      completedWork.time = log.time;
      completedWork.reverted = log.reverted;
      completedWork._id = log._id;

      if (detailed) {
        const documentDetails = log.documents;

        let documents_ = await format_process_documents(documentDetails);

        for (let i = 0; i < documents_.length; i++) {
          documents_[i] = {
            details: documents_[i].details,
            isSigned: documentDetails[i].isSigned,
            isRejected: documentDetails[i].isRejected,
            isUploaded: documentDetails[i].isUploaded,
            reason: documentDetails[i].reason,
          };
        }

        completedWork.documents = documents_;
      }
      let currentStep = log.currentStep;
      let nextStep = log.nextStep;

      if (currentStep !== undefined) {
        const finalStep = await format_workflow_step(currentStep, true);

        if (finalStep !== null) {
          completedWork.currentStep = finalStep;
        }
      }
      if (nextStep !== undefined) {
        const finalStep = await format_workflow_step(nextStep, false);
        if (finalStep !== null) {
          completedWork.nextStep = finalStep;
        }
      }

      if (log.workflowChanges) {
        completedWork.workflowChanges = {
          previous: await format_workflow_steps(
            log.workflowChanges.previous.workflow
          ),
          updated: await format_workflow_steps(
            log.workflowChanges.updated.workflow
          ),
        };
      }
      worksDone.push(completedWork);
    }
    return {
      worksDone,
    };
  } catch (error) {
    console.log("error in formating logs", error);
    throw new Error(error);
  }
};

// export const get_user_logs = async (req, res, next) => {
//   try {
//     const accessToken = req.headers["authorization"].substring(7);
//     const userData = await verifyUser(accessToken);
//     if (userData === "Unauthorized") {
//       return res.status(401).json({
//         message: "Unauthorized request",
//       });
//     }

//     const user = await User.findOne({ _id: userData._id }).select("workDone");

//     let workDone = [];
//     let remaining = false;
//     const PAGE_SIZE = req.body.pageSize;
//     const startingIndex = req.body.startingIndex;
//     const pagesToSkip = Math.floor(startingIndex / PAGE_SIZE);
//     // const skipAmount = pagesToSkip * PAGE_SIZE;
//     if (user.workDone) {
//       if (
//         user.workDone.slice(startingIndex, user.workDone.length).length > 10
//       ) {
//         remaining = true;
//       }

//       workDone = await formatUserLogs(
//         user.workDone.slice(startingIndex, PAGE_SIZE * (pagesToSkip + 1)),
//         false
//       );
//     }
//     return res.status(200).json({
//       worksDone: workDone,
//       remaining: remaining,
//     });
//   } catch (error) {
//     console.log("error accessing user logs", error);
//     return res.status(500).json({
//       message: "error accessing user logs",
//     });
//   }
// };

// export const get_user_logs = async (req, res, next) => {
//   try {
//     const accessToken = req.headers["authorization"].substring(7);
//     const userData = await verifyUser(accessToken);

//     if (userData === "Unauthorized") {
//       return res.status(401).json({
//         message: "Unauthorized request",
//       });
//     }

//     const PAGE_SIZE = req.body.pageSize || 10;
//     const startingIndex = req.body.startingIndex || 0;
//     const pagesToSkip = Math.floor(startingIndex / PAGE_SIZE);
//     const skipAmount = pagesToSkip * PAGE_SIZE;

//     const userId = new ObjectId(userData._id);

//     const result = await User.aggregate([
//       { $match: { _id: userId } },
//       { $unwind: "$workDone" },
//       {
//         $lookup: {
//           from: "logs",
//           localField: "workDone.log",
//           foreignField: "_id",
//           as: "workDone.log",
//         },
//       },
//       { $unwind: "$workDone.log" },
//       { $sort: { "workDone.log.time": -1 } },
//       { $skip: skipAmount },
//       { $limit: PAGE_SIZE + 1 },
//       {
//         $group: {
//           _id: "$_id",
//           workDone: { $push: "$workDone" },
//         },
//       },
//     ]);

//     let logCount = await User.aggregate([
//       { $match: { _id: userId } },
//       { $unwind: "$workDone" },
//       {
//         $lookup: {
//           from: "logs",
//           localField: "workDone.log",
//           foreignField: "_id",
//           as: "workDone.log",
//         },
//       },
//       { $unwind: "$workDone.log" },
//       {
//         $group: {
//           _id: "$_id",
//           logCount: { $sum: 1 }, // Counting the number of logs
//           workDone: { $push: "$workDone" },
//         },
//       },
//     ]);

//     // The logCount array will contain the log count for the specific user
//     logCount = logCount.length > 0 ? logCount[0].logCount : 0;

//     const userWithRecentLogs = result.length > 0 ? result[0] : null;

//     let workDone = [];
//     let remaining = false;

//     if (userWithRecentLogs && userWithRecentLogs.workDone) {
//       remaining = userWithRecentLogs.workDone.length > PAGE_SIZE;
//       workDone = await formatUserLogs(
//         userWithRecentLogs.workDone.slice(0, PAGE_SIZE),
//         false
//       );
//     }

//     return res.status(200).json({
//       worksDone: workDone,
//       remaining: remaining,
//       totalNumberOfPages: Math.ceil(logCount / PAGE_SIZE),
//     });
//   } catch (error) {
//     console.log("error accessing user logs", error);
//     return res.status(500).json({
//       message: "error accessing user logs",
//     });
//   }
// };

export const get_user_logs = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const userId = new ObjectId(userData._id);

    const result = await User.aggregate([
      { $match: { _id: userId } },
      { $unwind: "$workDone" },
      {
        $lookup: {
          from: "logs",
          localField: "workDone.log",
          foreignField: "_id",
          as: "workDone.log",
        },
      },
      { $unwind: "$workDone.log" },
      { $sort: { "workDone.log.time": -1 } },
      {
        $group: {
          _id: "$_id",
          workDone: { $push: "$workDone" },
        },
      },
    ]);

    const userWithLogs = result.length > 0 ? result[0] : null;

    let workDone = [];

    if (userWithLogs && userWithLogs.workDone) {
      workDone = await formatUserLogs(userWithLogs.workDone, false);
    }

    return res.status(200).json({
      worksDone: workDone.worksDone,
    });
  } catch (error) {
    console.log("error accessing user logs", error);
    return res.status(500).json({
      message: "error accessing user logs",
    });
  }
};

export const format_edition_logs = async (editions) => {
  try {
    let formattedEditions = [];
    for (let i = 0; i < editions.length; i++) {
      let edition = editions[i];
      let process = await Process.findOne({ _id: edition.processId }).select(
        "name"
      );

      let actorUser = await User.findOne({ _id: edition.actorUser }).select(
        "username"
      );

      let previousWorkflow = await format_workflow_steps(
        edition.workflowChanges.previous.workflow
      );

      let updatedWorkflow = await format_workflow_steps(
        edition.workflowChanges.updated.workflow
      );

      formattedEditions.push({
        processName: process.name,
        actorUser: actorUser.username,
        time: edition.time,
        previousWorkflow: previousWorkflow,
        updatedWorkflow: updatedWorkflow,
      });
    }

    return formattedEditions;
  } catch (error) {
    console.log("error in formatting edition logs", error);
    throw new Error(error);
  }
};

export const get_user_log = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const work = await Log.findOne({ _id: req.params.id });

    let log = await formatUserLogs([work], true);

    log = log.worksDone[0];

    return res.status(200).json({
      log: log,
    });
  } catch (error) {
    console.log(error, "error getting a log");
    return res.status(500).json({
      message: "error getting a log",
    });
  }
};

// Function to fetch and format edition details
export const get_edition_details = async (processId) => {
  try {
    // Fetch editions for the process, sorted by time
    const editions = await Edition.find({
      processId: new mongoose.Types.ObjectId(processId),
    })
      // .populate("actorUser", "username") // Populate actorUser's username
      .sort({ time: 1 }); // Sort by time in ascending order

    const actorUser = await User.findOne({ _id: editions[0].actorUser }).select(
      "username"
    );

    if (!editions || editions.length === 0) {
      return [];
    }

    // Format edition details
    const formattedEditions = await Promise.all(
      editions.map(async (edition) => {
        console.log("edition", edition);
        const previousWorkflow = edition.workflowChanges.previous
          ? await format_workflow_steps(
              edition.workflowChanges.previous.workflow
            )
          : [];
        const updatedWorkflow = edition.workflowChanges.updated
          ? await format_workflow_steps(
              edition.workflowChanges.updated.workflow
            )
          : [];

        console.log("prev", previousWorkflow);
        console.log("updated", updatedWorkflow);

        return {
          time: edition.time,
          actorUser: actorUser.username,
          previousWorkflow,
          updatedWorkflow,
          isEdition: true,
          isWorkFlowChange: true,
        };
      })
    );

    return formattedEditions;
  } catch (error) {
    console.error("Error fetching edition details:", error);
    throw new Error("Unable to fetch edition details");
  }
};
