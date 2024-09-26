import cron from "node-cron";
import Process from "../models/process.js";
import ProcessAnalytics from "../models/analytics/process-analytics.js";
import Department from "../models/department.js";
import User from "../models/user.js";
import { getDaysDifference } from "../controller/dashboard-controllers/process-number-analysis-controller.js";
// const PendingCount = require("./models/PendingCount"); // Import the PendingCount model

// Schedule a task to run at 11:30 PM IST every day
export const setPendingProcessNumber = cron.schedule(
  "59 23 * * *",
  async () => {
    try {
      const currentDateIST = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });

      let pendingProcesses = await Process.find({
        completed: false,
      }).select("_id lastStepDone workFlow");

      for (let i = 0; i < pendingProcesses.length; i++) {
        const pendingProcess = pendingProcesses[i];
        const processId = pendingProcess._id;
        const lastStepDoneOfProcess = pendingProcess.lastStepDone;
        let stepsOfProcesses = await Department.findOne({
          _id: pendingProcess.workFlow,
        }).select("steps");
        const currentStepOfUser = stepsOfProcesses.steps[lastStepDoneOfProcess];
        let currentUserOfProcess = await User.findOne({
          _id: currentStepOfUser.actorUser,
        }).select("processes notifications");

        const processToBeChecked = currentUserOfProcess.processes.find((item) =>
          item.process.equals(processId)
        );
        if (processToBeChecked) {
          const receivedAt = processToBeChecked.receivedAt;
          if (receivedAt === undefined) {
            continue;
          }
          const dayDifference = getDaysDifference(
            receivedAt,
            new Date(currentDateIST)
          );
          if (dayDifference >= 7) {
            const notificationsOfUser = currentUserOfProcess.notifications;
            const processIndexInNotifications = notificationsOfUser.indexOf(
              (item) => item.processId.equals(processId)
            );
            if (processIndexInNotifications !== -1) {
              currentUserOfProcess.notifications[
                processIndexInNotifications
              ].isAlert = true;
            } else {
              const process = await Process.findOne({ _id: processId }).select(
                "name"
              );
              currentUserOfProcess.notifications.push({
                processId: processId,
                processName: process.name,
                receivedAt: Date.now(),
                isAlert: true,
              });
            }
            await currentUserOfProcess.save();
          }
        } else {
          continue;
        }
      }
    } catch (error) {
      console.error(
        "Error counting pending processes or saving to the database:",
        error
      );
    }
  },
  {
    timezone: "Asia/Kolkata", // Set the timezone to Indian Standard Time (IST)
  }
);

export const startSettingPendingProcessNumber = () => {
  setPendingProcessNumber.start();
};
