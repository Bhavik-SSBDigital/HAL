import Process from "../models/process.js";
import Log from "../models/log.js";
import {
  format_department_data,
  format_workflow_step,
} from "./department-controller.js";
import Department from "../models/department.js";
import Work from "../models/work.js";
import Document from "../models/document.js";
import Branch from "../models/branch.js";
import User from "../models/user.js";
import Role from "../models/role.js";
import { ObjectId } from "mongodb";
import { is_branch_head_office } from "../utility/branch-handlers.js";

export const get_process_history = async (req, res, next) => {
  try {
    // const accessToken = req.headers["authorization"].substring(7);
    // const userData = await verifyUser(accessToken);
    // if (userData === "Unauthorized") {
    //   return res.status(401).json({
    //     message: "Unauthorized request",
    //   });
    // }

    // getting the process name from the body
    const processName = req.body.processName;

    // fetching the process
    let process = await Process.findOne({ name: processName });

    const processHasCustomWorkflow = process.steps && process.steps.length > 0;

    if (!process) {
      return res.status(400).json({
        message: "process doesn't exist",
      });
    }

    // found all the logs that are of given process
    const logs = await Log.find({ processId: process._id })
      .sort({ time: 1 })
      .exec();

    let historyDetails = [];

    let formattedDepartment;

    /* this array will hold the workflows of every department as in frontend 
    we show progress in workflow for all the involved department in specific
    process' history
    */
    let deparment_wise_workflows = [];

    // looping over each log
    for (let i = 0; i < logs.length; i++) {
      let history = {};
      const currentLog = logs[i];
      const stepDone = currentLog.currentStep;

      // getting the department from where the work mentioned in log is done
      let department;

      if (!processHasCustomWorkflow) {
        department = await Department.findOne({
          _id: currentLog.belongingDepartment,
        });

        formattedDepartment = await format_department_data([department]);

        formattedDepartment = formattedDepartment[0];

        const targettedDepartmentIndex = deparment_wise_workflows
          .map((item) => item.departmentName)
          .indexOf(formattedDepartment.department);

        if (targettedDepartmentIndex === -1) {
          deparment_wise_workflows.push({
            departmentName: formattedDepartment.department,
            workFlow: formattedDepartment.workFlow,
            lastStepDone: stepDone.stepNumber,
            isCompleted:
              !process.isInterBranchProcess ||
              process.workFlow.equals(new ObjectId(formattedDepartment._id))
                ? process.completed
                : process.connectors.filter((item) =>
                    item.department.equals(
                      new ObjectId(formattedDepartment._id)
                    )
                  )[0].completed,
            usedStepNumbers: [stepDone.stepNumber],
          });
        } else {
          deparment_wise_workflows[targettedDepartmentIndex].lastStepDone =
            deparment_wise_workflows[targettedDepartmentIndex].lastStepDone <
            stepDone.stepNumber
              ? stepDone.stepNumber
              : deparment_wise_workflows[targettedDepartmentIndex].lastStepDone;

          deparment_wise_workflows[targettedDepartmentIndex].usedStepNumbers = [
            ...deparment_wise_workflows[targettedDepartmentIndex]
              .usedStepNumbers,
            stepDone.stepNumber,
          ];
        }
        delete formattedDepartment.createdAt;
      }

      console.log("department wise workflows", deparment_wise_workflows);

      const workFlow = processHasCustomWorkflow
        ? process.steps
        : formattedDepartment.workFlow;

      // here we will have formatted step of department for given log
      let currentFormattedStep = workFlow.find(
        (item) => item.step === stepDone.stepNumber
      );

      let nextFormattedStep = workFlow.find(
        (item) => item.step === currentLog.nextStep.stepNumber
      );

      if (stepDone.stepNumber > workFlow.length) {
        let work = await Work.findOne({ _id: stepDone.work }).select("name");
        let user = await User.findOne({ _id: stepDone.actorUser }).select(
          "username"
        );
        let role = await Role.findOne({ _id: stepDone.actorRole }).select(
          "role"
        );
        currentFormattedStep = {
          work: work.name,
          user: user.username,
          role: role.role,
          step: stepDone.stepNumber,
        };

        if (
          currentLog.nextStep.actorRole &&
          currentLog.nextStep.actorUser &&
          currentLog.nextStep.work &&
          currentLog.nextStep.stepNumber
        ) {
          work = await Work.findOne({ _id: currentLog.nextStep.work }).select(
            "name"
          );
          let nextUsers = currentLog.nextStep.users;
          let receivers = [];
          for (let j = 0; j < nextUsers.length; j++) {
            const userDetails = await User.findOne({
              _id: nextUsers[j],
            }).select("username");
            receivers.push(userDetails.username);
          }
          // user = await User.findOne({
          //   _id: currentLog.nextStep.actorUser,
          // }).select("username");
          role = await Role.findOne({
            _id: currentLog.nextStep.actorRole,
          }).select("role");
          nextFormattedStep = {
            work: work.name,
            receivers: receivers,
            role: role.role,
            step: currentLog.nextStep.stepNumber,
          };
        }
      } else {
        const actor = await User.findOne({ _id: stepDone.actorUser }).select(
          "username"
        );

        const receiver = await User.findOne({
          _id: currentLog.nextStep.actorUser,
        }).select("username");

        currentFormattedStep = {
          ...currentFormattedStep,
          user: actor.username,
        };

        let nextUsers = currentLog.nextStep.users;
        let receivers = [];
        for (let m = 0; m < nextUsers.length; m++) {
          const userDetails = await User.findOne({
            _id: nextUsers[m].user,
          }).select("username");
          receivers.push(userDetails.username);
        }

        nextFormattedStep = {
          ...nextFormattedStep,
          receivers: receivers,
        };
      }

      let workDoneName = await Work.findOne({ _id: stepDone.work });
      let documentsInvolvedInCurrentLog = currentLog.documents;

      let publishedTo = currentLog.publishedTo || [];

      publishedTo = publishedTo.map(async (item) => {
        const department = await Department.findOne({
          _id: item.department,
        }).select("branch name");
        const branch = await Branch.findOne({ _id: department.branch }).select(
          "name"
        );

        const isHeadOffice = await is_branch_head_office(branch.name);
        if (isHeadOffice) {
          return department.name;
        } else {
          return branch.name;
        }
      });

      publishedTo = await Promise.all(publishedTo);

      if (i === 0) {
        const completedOrForwardedStatement =
          nextFormattedStep.work !== undefined
            ? `was forwarded to ${nextFormattedStep.receivers} for ${nextFormattedStep.work}.`
            : `was completed`;
        history.description = `process initiated by ${currentFormattedStep.user}`;
        history.documentsInvolved = await Promise.all(
          documentsInvolvedInCurrentLog.map(async (item) => {
            let documentName = await Document.findOne({
              _id: item.documentId,
            }).select("name");

            return {
              documentName: documentName.name,
              documentId: item.documentId,
              cabinetNo: item.cabinetNo,
              workName: item.workName,
              signedBy: item.signedBy,
              change: item.isRejected
                ? "rejection"
                : item.isSigned
                ? "approval"
                : "upload",
              reason: item.reason,
            };
          })
        );
        history.isReverted = currentLog.reverted;
        history.date = currentLog.time;
      } else {
        history.documentsInvolved = await Promise.all(
          documentsInvolvedInCurrentLog.map(async (item) => {
            let documentName = await Document.findOne({
              _id: item.documentId,
            }).select("name");

            return {
              documentName: documentName.name,
              documentId: item.documentId,
              cabinetNo: item.cabinetNo,
              workName: item.workName,
              signedBy: item.signedBy,
              change: item.isRejected
                ? "rejection"
                : item.isSigned
                ? "approval"
                : "upload",
              reason: item.reason,
            };
          })
        );

        const noOfRejectedDocuments = documentsInvolvedInCurrentLog.filter(
          (item) => item.isRejected
        ).length;
        const noOfSignedDocuments = documentsInvolvedInCurrentLog.filter(
          (item) => item.isSigned
        ).length;

        const rejectionStatement =
          noOfRejectedDocuments === 0
            ? "No document rejection happened"
            : `${noOfRejectedDocuments} document/s were rejected`;
        const signStatement =
          noOfSignedDocuments === 0
            ? "No document was approved"
            : `${noOfSignedDocuments} document/s were signed`;

        const documentChangeStatement = `${rejectionStatement} and ${signStatement} in the activity covered by this log`;
        const action = currentLog.reverted
          ? `${currentFormattedStep.user} reverted process to ${nextFormattedStep.receivers} for ${nextFormattedStep.work}`
          : nextFormattedStep.work !== undefined
          ? `${currentFormattedStep.user} forwarded process to ${nextFormattedStep.receivers} for ${nextFormattedStep.work}`
          : "";

        history.description = currentLog.reverted
          ? `${documentChangeStatement}. ${action}`
          : `${documentChangeStatement}. ${action}`;
        // history.documentsInvolved = documentsInvolvedInCurrentLog;
        history.isReverted = currentLog.reverted;
        history.date = currentLog.time;
      }

      history.publishedTo = publishedTo;
      historyDetails.push(history);
      history.belongingDepartment = department ? department.name : "custom";
    }

    /* 
        now there will be 3 possible changes 
        1- (sign & rejection of document) + revert/forward
        2- upload of new documents
        3- publish
    */

    deparment_wise_workflows = deparment_wise_workflows.map((item) => {
      const { usedStepNumbers, ...rest } = item;
      const allNumbersSet = new Set(
        Array.from({ length: item.lastStepDone }, (_, i) => i + 1)
      );

      // Create a set from the original array
      const usedStepNumbersSet = new Set(usedStepNumbers);

      // Find the difference between the sets to get missing numbers
      let missingNumbers = [...allNumbersSet].filter(
        (num) => !usedStepNumbersSet.has(num)
      );

      return {
        ...rest,
        skippedStepNumbers: missingNumbers, // Rename and update the property
      };
    });

    let processSteps = [];

    if (process.steps && process.steps.length > 0) {
      const steps = process.steps;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        let work = await Work.findOne({ _id: step.work });
        work = work.name;

        let users = step.users;

        users = await Promise.all(
          users.map(async (user) => {
            let user_ = user.user;
            user_ = await User.findOne({ _id: user_ }).select("username");
            user_ = user_.username;

            let role = user.role;
            role = await Role.findOne({ _id: role }).select("role");
            role = role.role;

            return {
              user: user_,
              role: role,
            };
          })
        );

        processSteps.push({
          work: work,
          users: users,
          stepNumber: step.stepNumber,
        });
      }
    }

    return res.status(200).json({
      name: process.name,
      documentsPath: process.documentsPath,
      isInterBranchProcess: process.isInterBranchProcess,
      currentRemarks: process.remarks,
      workFlow: formattedDepartment
        ? formattedDepartment.workFlow
        : processSteps,
      lastStepDone: process.lastStepDone,
      historyDetails: historyDetails,
      workflows: deparment_wise_workflows,
    });
  } catch (error) {
    console.log("error getting process history", error);
    return res.status(500).json({
      message: "error getting process history",
    });
  }
};
