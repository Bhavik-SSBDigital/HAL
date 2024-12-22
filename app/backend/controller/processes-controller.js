import Process from "../models/process.js";
import { verifyUser } from "../utility/verifyUser.js";
import Document from "../models/document.js";
import Department from "../models/department.js";
import User from "../models/user.js";
import { getParents } from "../utility/accessFunction.js";
import mongoose from "mongoose";
import { format_department_data } from "./department-controller.js";
import Branch from "../models/branch.js";
import { addLog } from "./log-controller.js";
import Log from "../models/log.js";
import nodemailer from "nodemailer";
import Role from "../models/role.js";
import Work from "../models/work.js";
import fs from "fs";

import path from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import ProcessAnalytics from "../models/analytics/process-analytics.js";
import { format_workflow_step } from "./department-controller.js";
import { ObjectId } from "mongodb";
import dotenv from "dotenv";
import { convertToISTAndFormatISO } from "../utility/date-functions.js";
import { get_documents_with_replacements } from "../utility/process-docs-manager.js";
import LogWork from "../models/logWork.js";
import { is_process_forwardable } from "./process-utility-controller.js";
import { get_log_docs } from "./log-work-controller.js";
import Meeting from "../models/Meeting.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const systemEmail = process.env.EMAIL;
const senderPassword = process.env.APP_PASS;

const attach_process_with_user = async (processId, department, userId) => {
  try {
    const newProcess = {
      process: processId, // Replace with the actual process ID
      pending: true, // Set to the desired value
      receivedAt: Date.now(),
      workFlowToBeFollowed: new ObjectId(department),
      isToBeSentToClerk: true,
    };
    await User.updateOne(
      { _id: userId },
      {
        $push: {
          processes: newProcess,
        },
      }
    );
  } catch (error) {
    console.log("error attaching process with user", error);
    throw new Error(error);
  }
};

const add_notification_in_user_account = async (
  process,
  department,
  userId
) => {
  try {
    let usernameOfProcessIsForwardedTo = await User.findOne({
      _id: userId,
    }).select("username notifications");

    if (usernameOfProcessIsForwardedTo.notifications) {
      usernameOfProcessIsForwardedTo.notifications.push({
        processId: process._id,
        processName: process.name,
        completed: process.completed,
        receivedAt: Date.now(),
        workFlowToBeFollowed: new ObjectId(department),
        isPending: true,
      });
      const z = await usernameOfProcessIsForwardedTo.save();
    } else {
      usernameOfProcessIsForwardedTo.notifications = [];
      usernameOfProcessIsForwardedTo.notifications.push({
        processId: process._id,
        processName: process.name,
        completed: process.completed,
        receivedAt: Date.now(),
        workFlowToBeFollowed: new ObjectId(department),
        isPending: true,
      });

      const z = await usernameOfProcessIsForwardedTo.save();
    }
  } catch (error) {
    console.log("error adding process in head's notification array", error);
  }
};

export const add_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    // selecting all the process done/pending in the workflow, current process is being aadded with
    /* CHANGE: use documentCount() method instead of selecting all the process to get the count of process 
    exising in current workflow */

    let process = req.body;

    let ifProcessContainsCustomWorkFlow =
      req.body.steps && req.body.steps.length > 0 ? true : false;

    let processName;

    let initiatorDepartment_;

    if (!ifProcessContainsCustomWorkFlow) {
      initiatorDepartment_ = await Department.findOne({
        _id: req.body.workFlow,
      }).select("name steps");
    }

    if (ifProcessContainsCustomWorkFlow) {
      let process_no = await Process.countDocuments({
        steps: { $ne: null },
      });

      processName = `manual_process_${process_no}`;
    } else {
      let process_no = await Process.countDocuments({
        workFlow: req.body.workFlow,
      });

      let departmentName = req.body.initiatorDepartment;

      processName = `${initiatorDepartment_.name}_${process_no}`;
    }

    /*
      getting count work name wise, so that we can add in analytics that on this specific date this many
      document had been added for this specific work
      EX. 6 document related to LOAN work was added on 6th of DEC.
    */
    let workNameGroups = {};

    req.body.documents.forEach((obj) => {
      const workName = obj.workName;
      // Initialize the array if it doesn't exist
      if (!workNameGroups[workName]) {
        workNameGroups[workName] = [];
      }
      // Add the current document to the array
      workNameGroups[workName].push(obj.documentId);
    });

    // Convert the object into an array of objects
    workNameGroups = Object.entries(workNameGroups).map(
      ([workName, documents]) => {
        return {
          workName: workName,
          documentsUploaded: documents,
          documentsRejected: [],
        };
      }
    );

    /* getting the document ids (as per Document collection entries) representing any document added in 
    file system */
    let docIds = req.body.documents.map((item) => item.documentId.toString());

    /* getting all the document ids, representing folders which are parents of the current documents */
    const docIds_ = await getParents(docIds);

    docIds = [...docIds, ...docIds_];

    /* giving read access of documents to the user adding the process (most of the times - clerk) */
    await User.findByIdAndUpdate(
      { _id: userData._id },
      {
        $push: {
          readable: {
            $each: docIds,
          },
        },
      }
    );

    process.createdAt = Date.now();

    /*
      DESCRIPTION OF THIS IF BLOCK FOR THE CONDITION: 
      
      1. If isInterBranchProcess of the process is true in the body
      - add isInterBranchProcess property with value true
      - add connectors property in process object, with the value having object consisting documents &department
      - Here if initiator department is not from headOffice & headOffice is included in the process, then
        documents uploaded while adding the process will belong to the initiator department and there will not
        be any sample documents, if that is not the case then documents will be treated as sample documents
      - sample document means, documents attached to the process directly and not with the department (
        for inter-branch processes
      )

      2. If process is not inter-branch add documents to process object directly
    */

    let isInitiatorDepartmentFromHeadOffice;

    const headOfficeBranch = Branch.findOne({ isHeadOffice: true }).select(
      "name"
    );
    if (!ifProcessContainsCustomWorkFlow) {
      isInitiatorDepartmentFromHeadOffice = headOfficeBranch
        ? initiatorDepartment_.name.split("_")[0] === headOfficeBranch.name
        : false;
    }

    if (req.body.isInterBranchProcess) {
      process.isInterBranchProcess = req.body.isInterBranchProcess;

      process.connectors = req.body.connectors.map((item) => {
        return {
          department: item,
          documents:
            !isInitiatorDepartmentFromHeadOffice &&
            req.body.isHeadofficeIncluded
              ? req.body.documents
              : [],
          remarks: req.body.remarks,
        };
      });

      if (
        !isInitiatorDepartmentFromHeadOffice &&
        req.body.isHeadofficeIncluded
      ) {
        process.documents = [];
      } else {
        process.documents = req.body.documents;
      }
    } else {
      process.documents = req.body.documents;
    }

    if (!ifProcessContainsCustomWorkFlow) {
      process.maxReceiverStepNumber = req.body.maxReceiverStepNumber;
    }

    let steps = ifProcessContainsCustomWorkFlow
      ? req.body.steps
      : initiatorDepartment_.steps;

    let updatedSteps = [];

    if (ifProcessContainsCustomWorkFlow) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        let users = [];

        for (let j = 0; j < step.users.length; j++) {
          const currentUser = step.users[j].user;

          const currentRole = step.users[j].role;
          let user = await User.findOne({ username: currentUser }).select(
            "_id"
          );

          if (!user) {
            return res.status(400).json({
              message:
                "one of the users mentioned in steps as an actor doesn't exist",
            });
          }
          user = user._id;

          let role = await Role.findOne({ role: currentRole }).select("_id");

          if (!role) {
            return res.status(400).json({
              message:
                "one of the roles mentioned in steps as an role doesn't exist",
            });
          }

          role = role._id;

          users.push({
            user: user,
            role: role,
          });
        }

        let work = await Work.findOne({ name: step.work });

        if (!work) {
          const newWork = new Work({
            name: step.work,
          });

          work = await newWork.save();
        }

        work = work._id;

        updatedSteps.push({
          users: users,
          work: work,
          stepNumber: step.step,
        });
      }
    }

    if (ifProcessContainsCustomWorkFlow) {
      process.steps = updatedSteps;
    }

    process.name = processName;

    if (req.body.meetingId) {
      process.meetingId = req.body.meetingId;
    }

    let Process_ = new Process(process);

    Process_ = await Process_.save();

    process._id = Process_._id;

    if (req.body.meetingId) {
      const meet = await Meeting.findOne({
        meetingId: req.body.meetingId,
      }).select("associatedProcesses");

      if (meet.associatedProcesses.length > 0) {
        meet.associatedProcesses.push(process._id);
      } else {
        meet.associatedProcesses = [process._id];
      }

      await meet.save();
    }

    /*
      For inter branch process, we need to send process to connectors but there is a catch,
      if process is inter-branch, initiator depatment doesn't belong to head office, and still
      head office is included then connector will be initiator branch itself and we don't need
      to send process to initiator as it already has, so in such case department involved in the 
      process which belongs to headOffice will have to be sent a process. 

      While when process is interbranch and case is not as same as mentioned above process must be 
      sent to all the connectors 
    */

    if (req.body.isInterBranchProcess) {
      if (
        !isInitiatorDepartmentFromHeadOffice &&
        req.body.isHeadofficeIncluded
      ) {
        // await sendProcessToHeadDeptClerkForMonitoring(
        //   req.body.workFlow,
        //   process
        // );
      } else {
        const connectors = req.body.connectors.map((item) => item.department);
        for (let i = 0; i < connectors.length; i++) {
          const connnectorDepartment = connectors[i];
          let head = await Department.findOne({
            _id: new ObjectId(connnectorDepartment),
          }).select("head");
          head = head.head;
          if (head) {
            await attach_process_with_user(
              Process_._id,
              connnectorDepartment,
              head
            );
            // await add_notification_in_user_account(
            //   process,
            //   connnectorDepartment,
            //   head
            // );
          }
        }
      }
      await sendProcessToHeadDeptClerkForMonitoring(req.body.workFlow, process);
    }

    /* 
      after successfully adding process, increase pending count for current day
    */

    let currentDate = new Date();

    currentDate.setHours(0, 0, 0, 0);

    try {
      // Check if the document exists
      let processAnalytics = await ProcessAnalytics.findOne({
        date: currentDate,
      });

      try {
        if (processAnalytics) {
          processAnalytics.pendingProcesses.push(process._id);
          let documentDetailsOfOverallBank = processAnalytics.documentDetails;
          if (documentDetailsOfOverallBank) {
            for (let i = 0; i < workNameGroups.length; i++) {
              const workNameIndex = documentDetailsOfOverallBank.findIndex(
                (work) => work.workName === workNameGroups[i].workName
              );
              if (workNameIndex !== -1) {
                documentDetailsOfOverallBank[workNameIndex].documentsUploaded =
                  [
                    ...(documentDetailsOfOverallBank[workNameIndex]
                      .documentsUploaded || []),
                    ...workNameGroups[i].documentsUploaded,
                  ];
              } else {
                documentDetailsOfOverallBank.push(workNameGroups[i]);
              }
            }
            processAnalytics.documentDetails = documentDetailsOfOverallBank;
          } else {
            processAnalytics.documentDetails = workNameGroups;
          }

          if (!ifProcessContainsCustomWorkFlow) {
            // Document found, update the counts
            const departmentIndex = processAnalytics.departmentsPendingProcess
              ? processAnalytics.departmentsPendingProcess.findIndex(
                  (department) =>
                    department.department.equals(
                      new ObjectId(req.body.workFlow)
                    )
                )
              : -1;

            if (departmentIndex !== -1) {
              // If the department is found, increment its count
              // processAnalytics.noOfPendingProcess += 1;
              // processAnalytics.departmentsPendingProcess[
              //   departmentIndex
              // ].noOfPendingProcess += 1;

              processAnalytics.departmentsPendingProcess[
                departmentIndex
              ].pendingProcesses =
                processAnalytics.departmentsPendingProcess[departmentIndex]
                  .pendingProcesses || [];
              processAnalytics.departmentsPendingProcess[
                departmentIndex
              ].pendingProcesses.push(process._id);

              let documentDetailsOfDepartment =
                processAnalytics.departmentsPendingProcess[departmentIndex]
                  .documentDetails;
              if (documentDetailsOfDepartment) {
                for (let i = 0; i < workNameGroups.length; i++) {
                  const workNameIndex = documentDetailsOfDepartment.findIndex(
                    (work) => work.workName === workNameGroups[i].workName
                  );
                  if (workNameIndex !== -1) {
                    documentDetailsOfDepartment[
                      workNameIndex
                    ].documentsUploaded = [
                      ...(documentDetailsOfOverallBank[workNameIndex]
                        .documentsUploaded || []),
                      ...workNameGroups[i].documentsUploaded,
                    ];
                  } else {
                    documentDetailsOfDepartment.push(workNameGroups[i]);
                  }
                }
                processAnalytics.departmentsPendingProcess[
                  departmentIndex
                ].documentDetails = documentDetailsOfDepartment;
              } else {
                processAnalytics.departmentsPendingProcess[
                  departmentIndex
                ].documentDetails = workNameGroups;
              }
            } else {
              // If the department is not found, add it with an initial count of 1
              // processAnalytics.noOfPendingProcess += 1;
              processAnalytics.departmentsPendingProcess.push({
                department: new ObjectId(req.body.workFlow),
                pendingProcesses: [Process._id],
                documentDetails: workNameGroups,
              });
            }
          }

          // Save the updated document back to the database
          await processAnalytics.save();
        } else {
          let newProcessAnalyticsData = !ifProcessContainsCustomWorkFlow
            ? {
                date: new Date(),
                pendingProcesses: [process._id],
                revertedProcesses: [],
                documentDetails: workNameGroups,
                departmentsPendingProcess: [
                  {
                    department: new ObjectId(req.body.workFlow),
                    pendingProcesses: [process._id],
                    revertedProcesses: [],
                    documentDetails: workNameGroups,
                  },
                ],
              }
            : {
                date: new Date(),
                pendingProcesses: [process._id],
                revertedProcesses: [],
                documentDetails: workNameGroups,
              };

          let newProcessAnalytics = new ProcessAnalytics(
            newProcessAnalyticsData
          );

          await newProcessAnalytics.save();
        }
      } catch (error) {
        console.log("error adding process analytics data", error);
      }
    } catch (error) {
      console.log("error adding process analytics data", error);
    }

    // const newProcess = {
    //   process: Process_._id, // Replace with the actual process ID
    //   pending: false, // Set to the desired value
    // };

    await User.updateOne(
      { _id: userData._id },
      {
        $pull: {
          processes: { process: Process_._id },
        },
      }
    );

    let message;

    if (
      !req.body.isInterBranchProcess ||
      (req.body.isInterBranchProcess &&
        req.body.isHeadofficeIncluded &&
        !isInitiatorDepartmentFromHeadOffice)
    ) {
      let workFlowToBeFollowed;

      if (req.body.connectors.length === 0) {
        workFlowToBeFollowed = req.body.workFlow;
      } else {
        workFlowToBeFollowed = req.body.connectors[0].department;
      }

      const completed = await forwardProcess(
        Process_._id,
        1,
        userData._id,
        req.body.nextStepNumber,
        req.body.remarks,
        false,
        workFlowToBeFollowed,
        req.body.isInterBranchProcess,
        true
      );

      if (completed.completed) {
        message: "process completed successfully";
      } else {
        message: "successfully added process";
      }
    } else {
      message = "Inter branch process is initiated successfully";
    }

    return res.status(200).json({
      message: message,
      newProcess: Process_,
    });
  } catch (error) {
    console.log("error adding process", error);
    return res.status(500).json({
      message: "error adding process",
    });
  }
};

const sendProcessToHeadDeptClerkForMonitoring = async (
  headDepartmentId,
  process
) => {
  try {
    let head = await Department.findOne({
      _id: new ObjectId(headDepartmentId),
    }).select("head");
    head = head.head;
    if (head) {
      const newProcess = {
        process: process._id, // Replace with the actual process ID
        pending: true, // Set to the desired value
        receivedAt: Date.now(),
        workFlowToBeFollowed: new ObjectId(headDepartmentId),
        isToBeSentToClerk: true,
        forMonitoring: true,
      };
      await User.updateOne(
        { _id: head },
        {
          $push: {
            processes: newProcess,
          },
        }
      );
      try {
        let usernameOfProcessIsForwardedTo = await User.findOne({
          _id: head,
        }).select("username notifications");

        if (usernameOfProcessIsForwardedTo.notifications) {
          usernameOfProcessIsForwardedTo.notifications.push({
            processId: process._id,
            processName: process.name,
            completed: process.completed,
            receivedAt: Date.now(),
            workFlowToBeFollowed: new ObjectId(headDepartmentId),
            isPending: true,
            forMonitoring: true,
          });
          const z = await usernameOfProcessIsForwardedTo.save();
        } else {
          usernameOfProcessIsForwardedTo.notifications = [];
          usernameOfProcessIsForwardedTo.notifications.push({
            processId: process._id,
            processName: process.name,
            completed: process.completed,
            receivedAt: Date.now(),
            workFlowToBeFollowed: new ObjectId(headDepartmentId),
            isPending: true,
            forMonitoring: true,
          });

          const z = await usernameOfProcessIsForwardedTo.save();
        }
      } catch (error) {
        console.log("error adding process in head's notification array");
      }
    }
  } catch (error) {
    console.log(
      "error adding process to head of department for monitoring",
      error
    );
    return;
  }
};

export const publish_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let users = [];
    const processId = req.body.processId;
    const newProcess = {
      process: processId, // Replace with the actual process ID
      pending: true, // Set to the desired value
      receivedAt: Date.now(),
      published: true,
    };
    // const nonContinuous = req.body.nonContinuous;
    let publishedDepartments = [];

    if (req.body.departments) {
      let departments = req.body.departments;

      let department;
      for (let i = 0; i < departments.length; i++) {
        department = departments[i];
        department = await Department.findOne({ name: department }).select(
          "steps"
        );

        publishedDepartments.push(department._id);

        let steps = department.steps;

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];

          const users_ = step.users;

          for (let j = 0; j < users_.length; j++) {
            const roleToCheck = users_[j].role;
            const userToCheck = users_[j].user;

            const role = await Role.findOne({ _id: roleToCheck }).select(
              "role"
            );

            if (!role) {
              continue;
            }

            if (req.body.roles.includes(role.role.toString())) {
              const user = await User.findOne({ _id: userToCheck }).select(
                "_id"
              );
              if (!user) {
                continue;
              }

              users.push(user._id);
            }
          }
        }
      }
    }
    if (req.body.branches) {
      let branches = req.body.branches;
      for (let i = 0; i < branches.length; i++) {
        let branch = branches[i];
        branch = await Branch.findOne({ name: branch }).select("_id");

        const department = await Department.findOne({
          branch: branch._id,
        }).select("steps");

        if (department) {
          publishedDepartments.push(department._id);
        } else {
          continue;
        }

        const steps = department.steps;
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];

          const users_ = step.users;

          for (let j = 0; j < users_.length; j++) {
            const roleToCheck = await Role.findOne({
              _id: users_[j].role,
            }).select("role");

            if (!roleToCheck) {
              continue;
            }

            if (req.body.roles.includes(roleToCheck.role.toString())) {
              const user = await User.findOne({
                _id: users_[j].user,
              }).select("_id");

              if (!user) {
                continue;
              }

              users.push(user._id);
            }
          }
        }
      }
    }

    users = users.map((ele) => ele.toString());

    const mySet = new Set(users);

    users = Array.from(mySet);

    const processDetails = await Process.findOne({
      _id: new ObjectId(processId),
    }).select("name completed");
    for (let i = 0; i < users.length; i++) {
      await User.updateOne(
        { _id: users[i] },
        {
          $push: {
            processes: newProcess,
            notifications: {
              processId: processId,
              processName: processDetails.name,
              completed: processDetails.completed,
              receivedAt: Date.now(),
              isPublished: true,
            },
          },
        }
      );
    }

    let finalDepartments = [];
    for (let i = 0; i < publishedDepartments.length; i++) {
      finalDepartments.push({
        department: publishedDepartments[i],
      });
    }

    await Process.findByIdAndUpdate(
      { _id: processId },
      {
        $push: {
          publishedTo: {
            $each: finalDepartments,
          },
        },
      }
    );

    const updatedProcess = await Process.findOne({ _id: processId }).select(
      "publishedTo"
    );

    if (updatedProcess) {
      publishedDepartments = updatedProcess.publishedTo;
    } else {
      console.log("Process not found.");
    }

    return res.status(200).json({
      message: "process published successfully",
      publishedDepartments: publishedDepartments,
    });
  } catch (error) {
    console.log("error publishing process", error);
    return res.status(500).json({
      message: "error publishing process",
    });
  }
};

export const forward_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const workflowToBeFollowed = req.body.workFlowToBeFollowed;

    const completed = await forwardProcess(
      req.body.processId,
      req.body.currentStep,
      userData._id,
      req.body.nextStepNumber,
      req.body.remarks,
      req.body.completeBeforeLastStep !== undefined
        ? req.body.completeBeforeLastStep
        : false,
      req.body.workFlowToBeFollowed,
      req.body.isInterBranchProcess,
      false
    );

    if (completed.statusCode !== undefined) {
      return res.status(completed.statusCode).json({
        message: completed.message,
      });
    }

    let message;
    if (completed.completed) {
      message = "completed process successfully";
    } else {
      message = "process forwarded successfully";
    }

    return res.status(200).json({
      message: message,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "error forwarding process",
    });
  }
};

async function sendEmail(
  currentStep,
  nextStep,
  processDetails,
  isForwarded,
  documents
) {
  console.log("Document IDs in mail:", documents);

  // Fetch recipient's username
  let username = await User.findOne({ _id: nextStep.actorUser }).select(
    "username"
  );
  const action = isForwarded ? "forwarded" : "reverted";
  username = username.username;

  // Fetch sender details
  let sender = await User.findOne({ _id: currentStep.actorUser }).select(
    "username email branch"
  );

  let senderBranch = await Branch.findOne({ _id: sender.branch }).select(
    "name"
  );
  senderBranch = senderBranch.name;

  const senderEmail = sender.email;
  const senderUsername = sender.username;

  let senderRole = await Role.findOne({ _id: currentStep.actorRole }).select(
    "role"
  );
  senderRole = senderRole.role;

  let receiverWork = await Work.findOne({ _id: nextStep.work });
  receiverWork = receiverWork.name;

  // Fetch document details from MongoDB
  const attachmentFiles = [];
  for (const docId of documents) {
    const document = await Document.findOne({ _id: docId });

    if (document) {
      let filePath = document.path; // File path on the file system
      const fileName = document.name; // File name
      filePath = path.join(__dirname, filePath, fileName);
      console.log("document path", filePath);

      // Check if the file exists in the file system
      if (fs.existsSync(filePath)) {
        attachmentFiles.push({
          filename: fileName,
          content: fs.createReadStream(filePath),
        });
      } else {
        console.warn(`File not found: ${filePath}`);
      }
    } else {
      console.warn(`Document not found in database: ${docId}`);
    }
  }

  // Create transporter using SMTP
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: systemEmail,
      pass: senderPassword,
    },
  });

  // Email content
  const mailOptions = {
    from: systemEmail,
    to: senderEmail,
    subject: `Update on ${processDetails.name}`,
    html: `
      <p>Hello, ${username}</p>
      <p>${processDetails.name} is ${action} to you by ${senderUsername} for ${receiverWork}</p>
      <p>${senderUsername} holds the role ${senderRole} in branch ${senderBranch}</p>
      <p>Thank you for choosing our service!</p>
    `,
    attachments: attachmentFiles, // Attach files dynamically
  };

  // Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
  } catch (error) {
    console.log("Error sending email:", error);
    throw new Error("Error sending email");
  }
}

export const forwardProcess = async (
  processId,
  currentStep,
  currentUserId,
  nextStepNumber_,
  remarks,
  completeBeforeLastStep,
  workFlowToBeFollowed,
  isInterBranchProcess,
  initialisation
) => {
  try {
    let process = await Process.findOne({ _id: processId });

    /* 
      1. removal of process from notifications array for current user 
      2. removal of process from processes array for current user

      - notifications array: resposible for showing process when user clicks on notification icon
      - processes array: responsible for showing process when user click on processes icon, from which user can do operation on process
    */

    /* PROBLEM: Developer needs to make sure that process is not removed from processes array, if process is not forwarded to another
                user or not completed successfully, else process will be gone without being in the flow.          
    */
    if (currentUserId) {
      let userWithNotifications = await User.findOne({
        _id: currentUserId,
      }).select("notifications");

      userWithNotifications.notifications =
        userWithNotifications.notifications.filter(
          (item) => !item.processId.equals(new ObjectId(processId))
        );

      await userWithNotifications.save();
      await User.updateOne(
        { _id: currentUserId },
        {
          $pull: {
            processes: { process: processId },
          },
        }
      );
    }

    /*
      To find nextStepNumber, 
      - for intra branch use, process' workflow
      - for inter branch use workFlowToBeUsed (value associated with the process in processes' array of user forwarding process)
    */

    /* 
        workflow will be used to send the process to the further user, so if it is inter-branch 
        process then we will use the workflow which should be followed (it will be stored in user's
        processes array), that can be different from process' workflow. This workflow will be same
        when all connector department's head approve the process and flow is started in the 
        handler department, which will complete the process.

        Handler department user might not have the workFlowToBeProcessed value in its processes array
    */
    let workflow;
    let departmentName;

    let isCustomProcess =
      process.steps && process.steps.length > 0 ? true : false;

    let steps = [];

    if (isCustomProcess) {
      steps = process.steps;
    } else {
      workflow = isInterBranchProcess
        ? new ObjectId(workFlowToBeFollowed)
        : process.workFlow;

      workflow = await Department.findOne({ _id: workflow });
      departmentName = workflow.name;
      steps = workflow.steps;
    }

    let nextStepNumber;

    if (nextStepNumber_) {
      nextStepNumber = nextStepNumber_;
    } else {
      nextStepNumber = currentStep + 1;
    }

    let nextStep = steps.find((step) => step.stepNumber === nextStepNumber);

    let currentStepObject = steps[currentStep - 1].toObject();

    /*
      complete the process if workFlowToBeFollowed is same as process workflow, basically
      only handler department can complete the process
    */

    if (
      !isInterBranchProcess ||
      (isInterBranchProcess &&
        new ObjectId(workFlowToBeFollowed).equals(process.workFlow))
    ) {
      if (currentStep === steps.length || completeBeforeLastStep) {
        await Process.findOneAndUpdate(
          { _id: process._id },
          {
            completed: true,
            completedAt: Date.now(),
            lastStepDone: currentStep,
          }
        );

        let currentDate = new Date();

        let processCreationDateStart = new Date(process.createdAt);

        processCreationDateStart.setHours(0, 0, 0, 0);

        let processCreationDateEnd = new Date(process.createdAt);

        processCreationDateEnd.setHours(23, 59, 0, 0);

        if (
          currentDate >= processCreationDateStart &&
          currentDate <= processCreationDateEnd
        ) {
          currentDate.setHours(0, 0, 0, 0);

          try {
            let processAnalytics = await ProcessAnalytics.findOne({
              date: currentDate,
            });

            if (processAnalytics) {
              // Document found, update the counts

              if (isCustomProcess) {
                processAnalytics.noOfPendingProcess -= 1;
              } else {
                const departmentIndex =
                  processAnalytics.departmentsPendingProcess.findIndex(
                    (department) =>
                      department.department.equals(
                        new ObjectId(process.workFlow)
                      )
                  );

                if (departmentIndex !== -1) {
                  // If the department is found, increment its count
                  processAnalytics.departmentsPendingProcess[
                    departmentIndex
                  ].noOfPendingProcess -= 1;
                }
              }

              // Save the updated document back to the database
              await processAnalytics.save();
            }
          } catch (error) {
            console.log("error updating process analytics", error);
          }
        }

        currentStepObject.actorUser = currentUserId;
        const currentRoleOfUser = await User.findOne({
          _id: currentUserId,
        }).select("role");

        currentStepObject.actorRole = currentRoleOfUser.role;
        delete currentStepObject.users;

        const logWorkDocs = await get_log_docs(
          processId,
          currentUserId,
          process.documents
        );

        if (isCustomProcess) {
          await addLog(
            processId,
            false,
            currentStepObject,
            null,
            logWorkDocs,
            null
          );
        } else {
          await addLog(
            processId,
            false,
            currentStepObject,
            null,
            logWorkDocs,
            process.workFlow
          );
        }

        const firstLog = await Log.findOne({ processId }).sort({ time: 1 }); // Sort by time in ascending order

        if (!firstLog) {
          console.log("No log found for the given processId.");
        }

        // for custom process, completed process will be sent to initiator
        const head = isCustomProcess
          ? firstLog
            ? firstLog.currentStep.actorUser
            : process.steps[0].users[0]
          : workflow.head;

        if (head) {
          let newProcess = {
            process: process._id, // Replace with the actual process ID
            pending: true, // Set to the desired value
            receivedAt: Date.now(),
          };

          if (!isCustomProcess) {
            newProcess.workFlowToBeFollowed = workFlowToBeFollowed;
          }

          await User.updateOne(
            { _id: head },
            {
              $push: {
                processes: newProcess,
              },
            }
          );

          try {
            let usernameOfProcessIsForwardedTo = await User.findOne({
              _id: head,
            }).select("username notifications");

            let notification = {
              processId: process._id,
              processName: process.name,
              completed: process.completed,
              receivedAt: Date.now(),
              isPending: true,
            };

            if (!isCustomProcess) {
              notification.workFlowToBeFollowed = workFlowToBeFollowed;
            }

            if (isCustomProcess)
              if (usernameOfProcessIsForwardedTo.notifications) {
                usernameOfProcessIsForwardedTo.notifications.push(notification);
                const z = await usernameOfProcessIsForwardedTo.save();
              } else {
                usernameOfProcessIsForwardedTo.notifications = [];
                usernameOfProcessIsForwardedTo.notifications.push(notification);

                const z = await usernameOfProcessIsForwardedTo.save();
              }
          } catch (error) {
            console.log(
              "error adding process in head's notification array",
              error
            );
          }

          // Send the email

          try {
            let deptHead = await User.findOne({ _id: head }).select(
              "email username"
            );

            let userProcessIsCompletedBy = await User.findOne({
              _id: currentStepObject.actorUser,
            }).select("username role branch");

            let branchOfCompletor = await Branch.findOne({
              _id: userProcessIsCompletedBy.branch,
            }).select("name");
            branchOfCompletor = branchOfCompletor.name;

            let roleOfCompletor = await Role.findOne({
              _id: userProcessIsCompletedBy.role,
            }).select("role");

            roleOfCompletor = roleOfCompletor.role;

            const transporter = nodemailer.createTransport({
              service: "Gmail",
              auth: {
                user: systemEmail,
                pass: senderPassword,
              },
            });

            // Email content
            const mailOptions = {
              from: systemEmail,
              to: deptHead.email,
              subject: `Update on ${process.name}`,
              html: `
            <p>Hello, ${deptHead.username}</p>
            <p>${process.name} is completed/approved by ${userProcessIsCompletedBy.username}. ${userProcessIsCompletedBy.username} holds the role of ${roleOfCompletor} in branch ${branchOfCompletor}. </p>
          `,
            };
            const info = await transporter.sendMail(mailOptions);
          } catch (error) {
            console.error("Error sending email:", error);
          }
        }

        return {
          completed: true,
        };
      }
    }

    let documents = [];

    let isInitiatorDepartmentFromHeadOffice;

    const headOfficeBranch = Branch.findOne({ isHeadOffice: true }).select(
      "name"
    );

    if (!isCustomProcess) {
      isInitiatorDepartmentFromHeadOffice = headOfficeBranch
        ? departmentName.split("_")[0] === headOfficeBranch.name
        : false;
    }

    if (
      isInterBranchProcess &&
      !new ObjectId(workFlowToBeFollowed).equals(process.workFlow)
    ) {
      const departmentState = process.connectors.find((item) =>
        item.department.equals(new ObjectId(workflow))
      );

      if (departmentState) {
        documents = departmentState.documents || [];
      }
    }

    documents = [...documents, ...process.documents];

    currentStepObject.actorUser = currentUserId;
    const currentRoleOfUser = await User.findOne({
      _id: currentUserId,
    }).select("role");

    currentStepObject.actorRole = currentRoleOfUser.role;
    delete currentStepObject.users;

    const logWorkDocs = initialisation
      ? process.documents.map((item) => {
          let doc = {
            documentId: item.documentId,
            isUploaded: true,
          };

          return doc;
        })
      : await get_log_docs(processId, currentUserId, documents);

    if (!isCustomProcess) {
      await addLog(
        processId,
        false,
        currentStepObject,
        nextStep,
        logWorkDocs,
        process.workFlow
      );
    } else {
      await addLog(
        processId,
        false,
        currentStepObject,
        nextStep,
        logWorkDocs,
        null
      );
    }

    if (nextStep) {
      // let nextActor = nextStep.actorUser;

      let newProcess = {
        process: process._id, // Replace with the actual process ID
        pending: true, // Set to the desired value
        receivedAt: Date.now(),
        workFlowToBeFollowed: workflow,
        isToBeSentToClerk: false,
      };

      // await User.updateOne(
      //   { _id: nextActor },
      //   {
      //     $push: {
      //       processes: newProcess,
      //     },
      //   }
      // );

      newProcess.pending = false;

      let docIds = process.documents.map((item) => item.documentId.toString());

      let connectorDocumentIds = [];

      const nextStepUsers = nextStep.users;

      let log;

      if (!isCustomProcess) {
        log = await Log.findOne({
          processId: processId,
          belongingDepartment:
            workFlowToBeFollowed !== null &&
            workFlowToBeFollowed !== undefined &&
            workFlowToBeFollowed !== "null" &&
            workFlowToBeFollowed !== "undefined"
              ? new ObjectId(workFlowToBeFollowed)
              : process.workFlow,
          "currentStep.stepNumber": nextStepNumber,
        }).sort({ time: -1 });
      } else {
        log = await Log.findOne({
          processId: processId,
          "currentStep.stepNumber": nextStepNumber,
        }).sort({ time: -1 });
      }

      if (
        isInterBranchProcess &&
        !new ObjectId(workFlowToBeFollowed).equals(process.workFlow)
      ) {
        const connectorsObject = process.connectors.find((connector) =>
          connector.department.equals(new ObjectId(workflow))
        );

        // Access the documents array from the connectors object
        const documentsArray = connectorsObject
          ? connectorsObject.documents
          : [];

        // Extract document IDs from the documents array
        connectorDocumentIds = documentsArray.map((doc) => doc.documentId);

        const connectorIndex = process.connectors.findIndex((connector) =>
          connector.department.equals(new ObjectId(workFlowToBeFollowed))
        );
        if (connectorIndex === -1) {
          throw new Error("error finding connector");
        } else {
          if (remarks) {
            process.connectors[connectorIndex].remarks = remarks;
          }
          // process.connectors[connectorIndex].remarks = remarks ? remarks : "";

          process.connectors[connectorIndex].lastStepDone = currentStep;

          process.connectors[connectorIndex].currentStepNumber = nextStepNumber;

          if (log) {
            process.connectors[connectorIndex].currentActorUser =
              log.currentStep.actorUser;
          } else {
            if (nextStepUsers.length === 1) {
              const actorUser = nextStepUsers[0].user;
              process.connectors[connectorIndex].currentActorUser = actorUser;
            }
          }
        }

        await process.save();
      } else {
        await Process.findOneAndUpdate(
          { _id: processId },
          {
            currentStepNumber: nextStepNumber,
            lastStepDone: currentStep,
            remarks: remarks ? remarks : process.remarks,
          }
        );

        if (log) {
          await Process.findByIdAndUpdate(
            { _id: process._id },
            { currentActorUser: log.currentStep.actorUser }
          );
        } else {
          if (nextStepUsers.length === 1) {
            const actorUser = nextStepUsers[0].user;

            await Process.findByIdAndUpdate(
              { _id: process._id },
              { currentActorUser: actorUser }
            );
          }
        }
      }

      docIds = [...docIds, ...connectorDocumentIds];

      let docs = await getParents(docIds);

      // combining both sample documents of process and documents uploaded by connector
      docs = [...docIds, ...docs];

      // giving access of documents to the next user
      // await User.findByIdAndUpdate(
      //   { _id: nextActor },
      //   {
      //     $push: {
      //       readable: {
      //         $each: docs,
      //       },
      //     },
      //   }
      // );

      if (
        isInterBranchProcess &&
        !new ObjectId(workFlowToBeFollowed).equals(process.workFlow)
      ) {
        if (log) {
          // await add_notification_in_user_account(
          //   process,
          //   workFlowToBeFollowed,
          //   log.currentStep.actorUser
          // );
        } else {
          for (let k = 0; k < nextStepUsers.length; k++) {
            const recepient = nextStepUsers[k].user;
            // await add_notification_in_user_account(
            //   process,
            //   workFlowToBeFollowed,
            //   recepient
            // );
          }
        }
        // await add_notification_in_user_account(
        //   process,
        //   workFlowToBeFollowed,
        //   nextActor
        // );
      }

      if (log) {
        await User.updateOne(
          { _id: log.currentStep.actorUser },
          {
            $push: {
              processes: newProcess,
              readable: {
                $each: docs,
              },
            },
          }
        );

        nextStep.actorUser = log.currentStep.actorUser;

        try {
          await sendEmail(
            currentStepObject,
            nextStep,
            {
              name: process.name,
            },
            true,
            docs
          );
        } catch (error) {
          console.log("error sending email fron sendEmail function");
        }
      } else {
        for (let k = 0; k < nextStepUsers.length; k++) {
          const recepient = nextStepUsers[k];

          let notification = {
            processId: process._id,
            processName: process.name,
            completed: process.completed,
            receivedAt: Date.now(),
            isPending: true,
          };
          await User.updateOne(
            { _id: recepient.user },
            {
              $push: {
                processes: newProcess,
                notifications: notification,
                readable: {
                  $each: docs,
                },
              },
            }
          );

          nextStep.actorUser = recepient.user;

          try {
            await sendEmail(
              currentStepObject,
              nextStep,
              {
                name: process.name,
              },
              true,
              docs
            );
          } catch (error) {
            console.log("error sending mail from sendEmail");
          }
        }
      }
    }

    return {
      completed: false,
    };
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  }
};

/*
    params: id
    body: workFlowToBeFollowed
*/
export const branch_manager_approval = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const currentUserId = new ObjectId(userData._id);
    const processId = req.params.processId;
    const workFlowToBeFollowed = req.body.workFlowToBeFollowed;

    const process = await Process.findOne({ _id: processId });

    let userWithNotifications = await User.findOne({
      _id: currentUserId,
    }).select("notifications");

    userWithNotifications.notifications =
      userWithNotifications.notifications.filter(
        (item) => !item.processId.equals(new ObjectId(processId))
      );

    await userWithNotifications.save();
    await User.updateOne(
      { _id: currentUserId },
      {
        $pull: {
          processes: { process: processId },
        },
      }
    );

    if (!process) {
      return res.status(404).json({
        message: "Process you want to approve doesn't exist",
      });
    }

    // Find the connector in the connectors array with the given department ID
    const connectorIndex = process.connectors.findIndex((connector) =>
      connector.department.equals(new ObjectId(workFlowToBeFollowed))
    );
    if (connectorIndex === -1) {
      return res.status(400).json({
        message:
          "Department on behalf of you want to approve this process is not added as the connector in process",
      });
    }

    const department_documents = process.connectors[connectorIndex].documents;

    // Update the completed field to true
    process.connectors[connectorIndex].completed = true;

    // Save the updated process
    await process.save();

    let currentDate = new Date();

    let processCreationDateStart = new Date(process.createdAt);

    processCreationDateStart.setHours(0, 0, 0, 0);

    let processCreationDateEnd = new Date(process.createdAt);

    processCreationDateEnd.setHours(23, 59, 0, 0);

    if (
      currentDate >= processCreationDateStart &&
      currentDate <= processCreationDateEnd
    ) {
      currentDate.setHours(0, 0, 0, 0);

      let processAnalytics = await ProcessAnalytics.findOne({
        date: currentDate,
      });

      try {
        if (processAnalytics) {
          // Document found, update the counts
          const departmentIndex =
            processAnalytics.departmentsPendingProcess.findIndex((department) =>
              department.department.equals(new ObjectId(workFlowToBeFollowed))
            );

          if (departmentIndex !== -1) {
            // If the department is found, increment its count
            processAnalytics.noOfPendingProcess -= 1;
            processAnalytics.departmentsPendingProcess[
              departmentIndex
            ].noOfPendingProcess -= 1;
          }

          // Save the updated document back to the database
          await processAnalytics.save();
        }
      } catch (error) {
        console.log("error updating process analytics", error);
      }
    }

    const department = await Department.findOne({
      _id: workFlowToBeFollowed,
    }).select("steps");

    let currentStep = department.steps[req.body.currentStep - 1].toObject();

    currentStep.actorUser = currentUserId;
    const currentRoleOfUser = await User.findOne({
      _id: currentUserId,
    }).select("role");

    currentStep.actorRole = currentRoleOfUser.role;
    delete currentStep.users;

    const logWorkDocs = await get_log_docs(
      processId,
      currentUserId,
      department_documents
    );

    await addLog(
      processId,
      false,
      currentStep, //current step,
      null, // next step
      logWorkDocs,
      new ObjectId(workFlowToBeFollowed)
    );

    return res.status(200).json({
      message: "process is approved successfully",
    });
  } catch (error) {
    console.log(
      "error approving process by branch manager or department head",
      error
    );
    return res.status(500).json({
      message: "Error approving process",
    });
  }
};

export const get_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const process_id = req.params.id;

    let workFlowToBeFollowed = req.body.workFlowToBeFollowed;

    workFlowToBeFollowed = workFlowToBeFollowed ? workFlowToBeFollowed : null;

    let isInterBranchProcess = await Process.findOne({
      _id: new ObjectId(process_id),
    }).select("isInterBranchProcess");

    isInterBranchProcess = isInterBranchProcess.isInterBranchProcess;

    const process = await getProcess(
      process_id,
      workFlowToBeFollowed,
      userData._id,
      isInterBranchProcess,
      req.body.forMonitoring
    );

    // console.log("process", process.publishedTo);

    if (process === null) {
      return res.status(404).json({
        message: "process not found",
      });
    }

    return res.status(200).json({
      process: process,
    });
  } catch (error) {
    console.log("error accessing process", error);
    return res.status(500).json({
      message: "error accessing process",
    });
  }
};

export const format_process_documents = async (
  documents,
  isInterBranchProcess
) => {
  try {
    let documents_ = [];
    for (let i = 0; i < documents.length; i++) {
      let finalDocument = {};
      if (documents[i].ref) {
        finalDocument.ref = documents[i].ref;
      }
      finalDocument.workName = documents[i].workName;
      finalDocument.cabinetNo = documents[i].cabinetNo;
      let document = documents[i];
      if (document.rejection !== undefined) {
        if (isInterBranchProcess) {
          let stepDetails = await format_workflow_step(
            document.rejection.step,
            true
          );
          finalDocument.rejection = {
            reason: document.rejection.reason,
            step: stepDetails,
          };
        } else {
          let stepDetails = await format_workflow_step(
            document.rejection.step,
            true
          );
          if (stepDetails !== null) {
            finalDocument.rejection = {
              reason: document.rejection.reason,
              step: stepDetails,
            };
            // document.rejection.step = stepDetails;
          }
        }
      }

      let signedBy = [];

      if (document.signedBy !== undefined && document.signedBy.length > 0) {
        for (let i = 0; i < document.signedBy.length; i++) {
          const userId = document.signedBy[i];
          let user = await User.findOne({ _id: userId }).select(
            "username branch role"
          );
          user = {
            username: user.username,
            branch: await Branch.findOne({ _id: user.branch }).select("name"),
            role: await Role.findOne({ _id: user.role }).select("role"),
          };

          signedBy.push(user);
        }
      }

      finalDocument.signedBy = signedBy;

      let document_ = document.documentId;

      document_ = await Document.findOne({ _id: document_ });

      finalDocument.details = document_;

      documents_.push(finalDocument);
    }
    return documents_;
  } catch (error) {
    console.log(error, "error processing documents data");
    throw new Error(error);
  }
};

/* is head, isToBeSentToClerk, documents with samples */
export const getProcess = async (
  process_id,
  workflowToBeFollowed,
  userId,
  isInterBranchProcess,
  forMonitoring
) => {
  try {
    let process_ = await Process.findOne({ _id: process_id });

    if (process_ === undefined || process_ === null || process_.length === 0) {
      return null;
    }

    const user = await User.findOne(
      {
        _id: userId,
        processes: { $elemMatch: { process: new ObjectId(process_id) } }, // Filter to find the process with the given processId
      },
      {
        "processes.$": 1, // Projection to retrieve only the first matched element of the processes array
      }
    );

    if (!user) {
      throw new Error("user not found");
    }

    const foundProcess = user.processes[0]; // Assuming there is only one matched process

    if (!foundProcess) {
      throw new Error("process not found for work in associated user account");
    }

    const { work, isToBeSentToClerk } = foundProcess;

    let process = JSON.parse(JSON.stringify(process_));

    let process_result = await is_process_forwardable(process, userId);

    process.isForwardable = process_result.isForwardable;

    process.isRevertable = process_result.isRevertable;

    let department;
    let workFlowToBeFollowed;

    if (!(process.steps && process.steps.length > 0)) {
      workFlowToBeFollowed = foundProcess.workFlowToBeFollowed;
      if (workFlowToBeFollowed !== null && workFlowToBeFollowed !== "null") {
        department = workFlowToBeFollowed;
      } else {
        department = new ObjectId(process.workFlow);
      }
      // workflowToBeFollowed !== null || workFlowToBeFollowed !== "null"
      //   ? workflowToBeFollowed
      //   : new ObjectId(process.workFlow);

      department = await Department.findOne({ _id: department });

      if (department.head && department.head.equals(new ObjectId(userId))) {
        process.isHead = true;
      } else {
        process.isHead = false;
      }

      department = await format_department_data([department]);
    }

    let documents_ = [];

    let documents = process.documents;

    let samples = isInterBranchProcess
      ? await format_process_documents(documents, isInterBranchProcess)
      : [];

    if (process.currentActorUser) {
      const usernameOfActor = await User.findOne({
        _id: process.currentActorUser,
      }).select("username");

      process.currentActorUser = usernameOfActor.username;
    }

    if (
      isInterBranchProcess &&
      process.connectors &&
      process.connectors.length > 0
    ) {
      /*
          If someone from headOffice sees document, they should see all the documents 
      */
      if (
        new ObjectId(process.workFlow).equals(
          new ObjectId(workflowToBeFollowed)
        )
      ) {
        for (let i = 0; i < process.connectors.length; i++) {
          if (!forMonitoring) {
            documents = [...documents, ...process.connectors[i].documents];
          }
        }

        process.remarks = process.remarks || "";

        documents_ = await format_process_documents(
          documents,
          isInterBranchProcess
        );
      } else {
        const connectorIndex = process.connectors.findIndex(
          (connector) =>
            new ObjectId(workflowToBeFollowed).equals(
              new ObjectId(connector.department)
            )
          // connector.department.equals(new ObjectId(workflowToBeFollowed))
        );
        if (connectorIndex === -1) {
          throw new Error("error getting connector");
        }

        documents = process.connectors[connectorIndex].documents;

        documents_ = await format_process_documents(
          documents,
          isInterBranchProcess
        );

        process.lastStepDone = process.connectors[connectorIndex].lastStepDone;

        process.currentStepNumber =
          process.connectors[connectorIndex].currentStepNumber || 1;

        process.remarks = process.connectors[connectorIndex].remarks || "";

        if (process.connectors[connectorIndex].currentActorUser) {
          const usernameOfActor = await User.findOne({
            _id: process.connectors[connectorIndex].currentActorUser,
          }).select("username");

          process.currentActorUser = usernameOfActor.username;
        }
      }
    }

    if (isInterBranchProcess && forMonitoring) {
      process.connectors = await Promise.all(
        process.connectors.map(async (item) => {
          let departmentName = await Department.findOne({
            _id: item.department,
          }).select("name");
          departmentName = departmentName.name;
          let documents = await format_process_documents(
            item.documents,
            isInterBranchProcess
          );
          let isCompleted = item.completed;
          let workflowId = item.department;
          return {
            departmentName,
            documents,
            isCompleted,
            workflowId,
          };
        })
      );
    } else {
      delete process.connectors;
    }

    process.isMultiUserStep = false;

    process.currentStepNumber = process.currentStepNumber || 1;

    if (!process.isInterBranchProcess) {
      process.remarks = process.remarks || "";
    }

    /*
      If process hasn't been on the current step and multi users exist in the current step
      then only set multiUserStep property to true
    */

    const count =
      process && process.steps.length > 0
        ? await Log.countDocuments({
            processId: process_id,
            "currentStep.stepNumber": process.currentStepNumber,
          })
        : await Log.countDocuments({
            processId: process_id,
            belongingDepartment: workFlowToBeFollowed
              ? new ObjectId(workFlowToBeFollowed)
              : process.workFlow,
            "currentStep.stepNumber": process.currentStepNumber,
          });

    if (count <= 0) {
      if (process.steps && process.steps.length > 0) {
        if (process.steps[process.currentStepNumber - 1].users.length > 1) {
          process.isMultiUserStep = true;
        }
      } else {
        if (
          department[0].workFlow[process.currentStepNumber - 1].users.length > 1
        ) {
          process.isMultiUserStep = true;
        }
      }
    }

    process.processWorkFlow = process.workFlow;

    let formattedSteps = [];
    if (process.steps && process.steps.length > 0) {
      for (let k = 0; k < process.steps.length; k++) {
        const formattedStep = await format_workflow_step(process.steps[k]);
        formattedSteps.push(formattedStep);
      }
    } else {
      process.workFlow = department[0].workFlow;
    }

    if (process.steps && process.steps.length > 0) {
      process.workFlow = formattedSteps;
      delete process.steps;
    }

    process.samples = samples;

    process.documents = isInterBranchProcess
      ? documents_
      : await format_process_documents(documents, isInterBranchProcess);

    process.isToBeSentToClerk = isToBeSentToClerk;

    if (process.completedAt) {
      process.completedAt = convertToISTAndFormatISO(process.completedAt);
    }

    if (process.updatedAt) {
      process.updatedAt = convertToISTAndFormatISO(process.updatedAt);
    }

    if (process.createdAt) {
      process.createdAt = convertToISTAndFormatISO(process.createdAt);
    }

    const results = await Log.aggregate([
      {
        $match: {
          "currentStep.actorUser": new ObjectId(userId),
          processId: new ObjectId(process_id),
        },
      },
      {
        $project: {
          documents: {
            $filter: {
              input: "$documents",
              as: "document",
              cond: { $eq: ["$$document.isRejected", true] },
            },
          },
        },
      },
      {
        $match: {
          "documents.0": { $exists: true },
        },
      },
    ]);

    process.rejectedDocIdsInPrevLogs = [];

    let rejectedDocIdsInPrevLogs = results.map((item) => item.documents);

    for (let k = 0; k < rejectedDocIdsInPrevLogs.length; k++) {
      process.rejectedDocIdsInPrevLogs = [
        ...process.rejectedDocIdsInPrevLogs,
        ...rejectedDocIdsInPrevLogs[k],
      ];
    }

    process.rejectedDocIdsInPrevLogs = process.rejectedDocIdsInPrevLogs.map(
      (doc) => doc.documentId
    );

    const result = await get_documents_with_replacements(process.documents);

    process.documents = result.activeDocs;

    process.replacementsWithRef = result.replacementsWithRef;

    const logWork = await LogWork.findOne({
      process: process_id,
      user: userId,
    });

    if (logWork) {
      process.hasUserDoneAnythingAfterReceivingProcess = true;
    } else {
      process.hasUserDoneAnythingAfterReceivingProcess = false;
    }

    return process;
  } catch (error) {
    console.log("error getting process", error);
    throw new Error(error);
  }
};

export const get_process_for_user = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    let remaining = false;
    const PAGE_SIZE = req.body.pageSize;
    const startingIndex = req.body.startingIndex;
    const pagesToSkip = Math.floor(startingIndex / PAGE_SIZE);
    const skipAmount = pagesToSkip * PAGE_SIZE;
    let processes = [];
    let totalNumberOfPages;

    if (userData.username !== "admin") {
      const user = await User.find({ _id: userData._id }).select("processes");

      if (!user) {
        return res.status(400).json({
          message: "User not found",
        });
      }

      totalNumberOfPages = user[0].processes.length / PAGE_SIZE;

      processes = user[0].processes.sort(
        (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)
      );

      if (processes !== null) {
        if (req.body.forPublishedProcesses) {
          processes = processes.filter((item) => item.published);
        }

        if (req.body.forMonitoring) {
          processes = processes.filter((item) => item.forMonitoring);
        }

        if (!req.body.forMonitoring && !req.body.forPublishedProcesses) {
          processes = processes.filter(
            (item) => !item.forMonitoring && !item.published
          );
        }

        if (processes.slice(startingIndex, processes.length).length > 10) {
          remaining = true;
        }

        processes = processes.slice(startingIndex, processes.length);
      }

      //657c1409a03fbbca3ccfcd1e
    } else {
      processes = await Process.find({})
        .skip(skipAmount)
        .limit(PAGE_SIZE + 1);

      totalNumberOfPages = await Process.countDocuments({});

      totalNumberOfPages = totalNumberOfPages / PAGE_SIZE;

      if (processes.length > 10) {
        remaining = true;
      }
    }

    let processes_ = [];

    for (let i = 0; i < processes.length; i++) {
      let process;
      const process_ = processes[i];

      if (!process_.process) {
        continue;
      }

      if (userData.username !== "admin") {
        process = await Process.findOne({ _id: process_.process });
      } else {
        process = processes[i];
      }

      if (process === null) {
        // console.log("null");
      } else {
        // console.log("process");
      }

      if (!process) {
        continue;
      }
      let department = await Department.findOne({ _id: process.workFlow });

      department = await format_department_data([department]);

      department = department[0];

      let workName = "";

      if (process_.work) {
        workName = await Work.findById({ _id: process_.work }).select("name");

        workName = workName.name;
      }

      let documents = process.documents;

      for (let l = 0; l < process.connectors.length; l++) {
        documents = [...documents, ...process.connectors[l].documents];
      }

      documents = documents.map((item) => item.documentId);

      for (let k = 0; k < documents.length; k++) {
        let docName = await Document.findOne({ _id: documents[k] }).select(
          "name"
        );
        documents[k] = docName.name;
      }

      processes_.push(
        userData.username === "admin"
          ? {
              _id: process._id,
              // to be changed
              lastWork: department.workFlow.find(
                (step) => step.step === process.lastStepDone
              ),
              name: process.name,
              completed: process.completed,
              createdAt: process.createdAt,
              departmentName: department.name,
              isPending: true,
              work: workName,
              workFlowToBeFollowed: process_.workFlowToBeFollowed,
              files: documents,
            }
          : {
              _id: process._id,
              lastWork: department.workFlow.find(
                (step) => step.step === process.lastStepDone
              ),
              name: process.name,
              work: workName,
              completed: process.completed,
              createdAt: process.createdAt,
              departmentName: department.name,
              isPending: process_.pending,
              workFlowToBeFollowed: process_.workFlowToBeFollowed,
              files: documents,
            }
      );
    }

    return res.status(200).json({
      processes: processes_,
      remaining: remaining,
      totalNumberOfPages: Math.ceil(totalNumberOfPages),
    });
  } catch (error) {
    console.log("error while getting processes for user", error);
    return res.status(500).json({
      message: "error while getting processes for user",
    });
  }
};

//department_name, specific_work_name, year, cabinetnumber, uniqueId
export const get_process_document_name = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const { cabinetNo, workName, fileName } = req.body;
    const year = req.body.year || new Date().getFullYear();
    let name = `${req.body.department}`;

    if (fileName) {
      name += `_${fileName}`;
    }

    if (workName) {
      name += `_${workName}`;
    }

    if (year) {
      name += `_${year}`;
    }

    if (cabinetNo) {
      name += `_CB${cabinetNo}`;
    }

    name = name.toLowerCase();

    const regexPattern = new RegExp(`^${name}`);

    let targets = await Document.find({
      name: { $regex: regexPattern },
    }).select("_id");

    const uniqueNo = targets.length + 1;
    name = `${name}_${uniqueNo}`;

    return res.status(200).json({
      name: name,
    });
  } catch (error) {
    console.log("error getting name of the document", error);
    return res.status(500).json({
      message: "error getting name of the document",
    });
  }
};

export const revert_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const completed = await revertProcess(
      req.body.processId,
      req.body.currentStep,
      userData._id,
      req.body.remarks,
      req.body.workFlowToBeFollowed,
      req.body.isInterBranchProcess
    );

    if (completed.statusCode) {
      return res.status(completed.statusCode).json({
        message: completed.message,
      });
    }

    let message;
    if (completed.completed) {
      message = "completed process successfully";
    } else {
      message = "process forwarded successfully";
    }

    return res.status(200).json({
      message: message,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "error forwarding process",
    });
  }
};

export const revertProcess = async (
  processId,
  currentStep,
  currentUserId,
  remarks,
  workFlowToBeFollowed,
  isInterBranchProcess
) => {
  try {
    // find the process using its id
    if (currentUserId) {
      let userWithNotifications = await User.findOne({
        _id: currentUserId,
      }).select("notifications");

      userWithNotifications.notifications =
        userWithNotifications.notifications.filter(
          (item) => !item.processId.equals(new ObjectId(processId))
        );

      await userWithNotifications.save();
      // this is to remove process from pending list of current user
      await User.updateOne(
        { _id: currentUserId },
        {
          $pull: {
            processes: { process: processId },
          },
        }
      );
    }
    let process = await Process.findOne({ _id: processId });

    const isCustomProcess = process.steps && process.steps.length > 0;

    // get the process workflow id
    let workflow;

    if (!isCustomProcess) {
      workflow = isInterBranchProcess
        ? new ObjectId(workFlowToBeFollowed)
        : process.workFlow;
      workflow = await Department.findOne({ _id: workflow });
    }

    // fetch the workflow details using its id

    const log = isCustomProcess
      ? await Log.findOne({
          "nextStep.users.user": currentUserId,
          processId: processId,
          reverted: false,
        }).sort({ time: -1 })
      : await Log.findOne({
          "nextStep.users.user": currentUserId,
          processId: processId,
          reverted: false,
          belongingDepartment: workflow,
        }).sort({ time: -1 });

    // const log = await Log.findOne({
    //   "nextStep.actorUser": currentUserId,
    //   processId: processId,
    //   reverted: false,
    //   belongingDepartment: workflow,
    // }).sort({ time: -1 }); // Sort in descending order to get the latest log first;

    let nextStepNumber = log.currentStep.stepNumber;

    let nextActor = log.currentStep.actorUser;

    // get the workflow steps
    let steps = isCustomProcess ? process.steps : workflow.steps;

    // let nextStepNumber;

    // if (previousStepNumber_) {
    //   nextStepNumber = previousStepNumber_;
    // } else {
    //   nextStepNumber = currentStep - 1;
    // }

    // this is previous step, but will be next in to do list
    let nextStep = steps
      .find((step) => step.stepNumber === nextStepNumber)
      .toObject();

    let currentStepObject = steps[currentStep - 1].toObject();

    if (currentStep === 1) {
      return {
        message: "initiator can't revert the process",
        statusCode: 400,
      };
    }

    let documentsArray = [];
    let connectorDocumentIds = [];

    if (
      isInterBranchProcess &&
      !new ObjectId(workFlowToBeFollowed).equals(process.workFlow)
    ) {
      const connectorsObject = process.connectors.find((connector) =>
        connector.department.equals(new ObjectId(workflow))
      );

      // Access the documents array from the connectors object
      documentsArray = connectorsObject ? connectorsObject.documents : [];

      // Extract document IDs from the documents array
      connectorDocumentIds = documentsArray.map((doc) => doc.documentId);

      const connectorIndex = process.connectors.findIndex((connector) =>
        connector.department.equals(new ObjectId(workFlowToBeFollowed))
      );
      if (connectorIndex === -1) {
        throw new Error("error finding connector");
      } else {
        if (remarks) {
          process.connectors[connectorIndex].remarks = remarks;
        }
        // process.connectors[connectorIndex].remarks = remarks ? remarks : "";

        process.connectors[connectorIndex].lastStepDone =
          log.currentStep.stepNumber - 1;

        process.connectors[connectorIndex].currentStepNumber =
          log.currentStep.stepNumber - 1;

        process.connectors[connectorIndex].currentActorUser = nextActor;
      }

      await process.save();
    } else {
      await Process.findOneAndUpdate(
        { _id: processId },
        {
          currentStepNumber: log.currentStep.stepNumber,
          lastStepDone: log.currentStep.stepNumber - 1,
          remarks: remarks ? remarks : process.remarks,
          currentActorUser: nextActor,
        }
      );
    }

    currentStepObject.actorUser = currentUserId;
    const currentRoleOfUser = await User.findOne({
      _id: currentUserId,
    }).select("role");

    currentStepObject.actorRole = currentRoleOfUser.role;
    delete currentStepObject.users;

    const logWorkDocs = await get_log_docs(
      processId,
      currentUserId,
      documentsArray
    );

    await addLog(
      processId,
      true,
      currentStepObject,
      nextStep,
      logWorkDocs,
      workflow
    );

    // let nextActor = nextStep.actorUser;

    let newProcess = {
      process: process._id, // Replace with the actual process ID
      pending: true, // Set to the desired value
      receivedAt: Date.now(),
      workFlowToBeFollowed: workflow,
    };

    await User.updateOne(
      { _id: nextActor },
      {
        $push: {
          processes: newProcess,
        },
      }
    );

    if (
      isInterBranchProcess &&
      !new ObjectId(workFlowToBeFollowed).equals(process.workFlow)
    ) {
      // await add_notification_in_user_account(
      //   process,
      //   workFlowToBeFollowed,
      //   nextActor
      // );
    }

    const docIds = process.documents.map((item) => item.documentId.toString());

    let docs = await getParents(docIds);

    docs = [...docIds, ...docs];

    await User.findByIdAndUpdate(
      { _id: nextActor },
      {
        $push: {
          readable: {
            $each: docs,
          },
        },
      }
    );

    let currentDate = new Date();

    currentDate.setHours(0, 0, 0, 0);

    // Check if the document exists
    let processAnalytics = await ProcessAnalytics.findOne({
      date: currentDate,
    });

    try {
      if (processAnalytics) {
        processAnalytics.revertedProcesses =
          processAnalytics.revertedProcesses || [];

        processAnalytics.revertedProcesses.push(process._id);

        console.log(
          "process analytics reverted processes",
          processAnalytics.revertedProcesses
        );
        if (process.steps && process.steps.length > 0) {
          // Document found, update the counts
          const departmentIndex = -1;

          try {
            processAnalytics.departmentsPendingProcess
              ? processAnalytics.departmentsPendingProcess.findIndex(
                  (department) =>
                    department.department.equals(new ObjectId(process.workFlow))
                )
              : -1;
          } catch (error) {
            console.log(
              "process analytics has faulty departmentsPendingProcesses"
            );
          }

          if (departmentIndex !== -1) {
            // If the department is found, increment its count

            if (
              processAnalytics.departmentsPendingProcess[departmentIndex]
                .revertedProcesses &&
              processAnalytics.departmentsPendingProcess[departmentIndex]
                .revertedProcesses.length > 0
            ) {
              processAnalytics.departmentsPendingProcess[
                departmentIndex
              ].revertedProcesses.push(process._id);
            } else {
              processAnalytics.departmentsPendingProcess[
                departmentIndex
              ].revertedProcesses = [process._id];
            }
          } else {
            // If the department is not found, add it with an initial count of 1
            processAnalytics.departmentsPendingProcess.push({
              department: new ObjectId(process.workFlow),
              revertedProcesses: [process._id],
            });
          }
        }

        // Save the updated document back to the database
        console.log(
          "in existing analytics object",
          processAnalytics.revertedProcesses
        );

        await processAnalytics.save();
      } else {
        let newAnalyticsData =
          process.steps && process.steps.length > 0
            ? {
                date: new Date(),
                pendingProcesses: [],
                revertedProcesses: [process._id],
                departmentsPendingProcess: [
                  {
                    department: new ObjectId(process.workFlow),
                    pendingProcesses: [],
                    revertedProcesses: [process._id],
                  },
                ],
              }
            : {
                date: new Date(),
                pendingProcesses: [],
                revertedProcesses: [process._id],
                departmentsPendingProcess: [
                  {
                    department: new ObjectId(process.workFlow),
                    pendingProcesses: [],
                    revertedProcesses: [process._id],
                  },
                ],
              };

        console.log(
          "in new analytics object",
          newAnalyticsData.revertedProcesses
        );

        let newProcessAnalytics = new ProcessAnalytics(newAnalyticsData);
        // newProcessAnalytics = new ProcessAnalytics(newProcessAnalytics);
        await newProcessAnalytics.save();
      }
    } catch (error) {
      console.log("error updating pocess analytics", error);
    }

    delete nextStep.users;

    nextStep.actorUser = nextActor;

    try {
      await sendEmail(
        currentStepObject,
        nextStep,
        {
          name: process.name,
        },
        false,
        docs
      );
    } catch (error) {
      console.log("error sending email from sendEmail function");
    }

    return {
      completed: false,
    };
  } catch (error) {
    console.log("error", error);
    throw new Error(error);
  }
};

export const upload_documents_in_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const process = await Process.findOne({
      _id: new ObjectId(req.body.processId),
    }).select("workFlow documents connectors steps currentStepNumber");

    const workFlow = req.body.isInterBranchProcess
      ? new ObjectId(req.body.workFlowToBeFollowed)
      : process.workFlow;

    if (
      (process.steps && process.steps.length > 0) ||
      process.workFlow.equals(workFlow)
    ) {
      process.documents = [...process.documents, ...req.body.documents];
      // await Process.findOneAndUpdate(
      //   { _id: req.body.processId },
      //   {
      //     $push: {
      //       documents: { $each: req.body.documents },
      //     },
      //   }
      // );
    } else {
      const connectorIndex = process.connectors.findIndex((connector) =>
        connector.department.equals(new ObjectId(workFlow))
      );

      if (connectorIndex === -1) {
        throw new Error("error finding connector");
      } else {
        process.connectors[connectorIndex].documents = [
          ...process.connectors[connectorIndex].documents,
          ...req.body.documents,
        ];
      }
    }

    const formattedDocuments = await format_process_documents(
      process.documents
    );
    const result = await get_documents_with_replacements(formattedDocuments);

    const documents = result.activeDocs;

    const replacementsWithRef = result.replacementsWithRef;

    await process.save();

    let workNameGroups = {};

    req.body.documents.forEach((obj) => {
      const workName = obj.workName;
      // Initialize the array if it doesn't exist
      if (!workNameGroups[workName]) {
        workNameGroups[workName] = [];
      }
      // Add the current document to the array
      workNameGroups[workName].push(obj);
    });

    // Convert the object into an array of objects
    workNameGroups = Object.entries(workNameGroups).map(
      ([workName, documents]) => {
        return { workName: workName, documentsUploaded: documents };
      }
    );

    const logWork = await LogWork.findOne({
      user: new ObjectId(userData._id),
      process: new ObjectId(req.body.processId),
    });

    if (logWork) {
      const uploadedDocuments = logWork.uploadedDocuments || [];
      logWork.uploadedDocuments = [
        ...uploadedDocuments,
        ...req.body.documents.map((item) => new ObjectId(item.documentId)),
      ];
      await logWork.save();
    } else {
      const logWorkData = {
        process: new ObjectId(req.body.processId),
        user: new ObjectId(userData._id),
        uploadedDocuments: req.body.documents.map(
          (item) => new ObjectId(item.documentId)
        ),
      };

      const logWorkDataObj = new LogWork(logWorkData);
      await logWorkDataObj.save();
    }

    let currentDate = new Date();

    currentDate.setHours(0, 0, 0, 0);

    // Check if the document exists
    let processAnalytics = await ProcessAnalytics.findOne({
      date: currentDate,
    });

    try {
      if (processAnalytics) {
        let documentDetailsOfOverallBank = processAnalytics.documentDetails;
        if (documentDetailsOfOverallBank) {
          for (let i = 0; i < workNameGroups.length; i++) {
            const workNameIndex = documentDetailsOfOverallBank.findIndex(
              (work) => work.workName === workNameGroups[i].workName
            );
            if (workNameIndex !== -1) {
              documentDetailsOfOverallBank[workNameIndex].documentsUploaded += [
                ...(documentDetailsOfOverallBank[workNameIndex]
                  .documentsUploaded || []),
                ...workNameGroups[i].documentsUploaded,
              ];
            } else {
              documentDetailsOfOverallBank.push(workNameGroups[i]);
            }
          }
          processAnalytics.documentDetails = documentDetailsOfOverallBank;
        } else {
          processAnalytics.documentDetails = workNameGroups;
        }

        // Document found, update the counts

        if (!(process.steps && process.steps.length > 0)) {
          const departmentIndex = processAnalytics.departmentsPendingProcess
            ? processAnalytics.departmentsPendingProcess.findIndex(
                (departmentData) =>
                  departmentData.department.equals(process.workFlow)
              )
            : -1;

          if (departmentIndex !== -1) {
            // If the department is found, increment its count
            // processAnalytics.noOfPendingProcess += 1;

            let documentDetailsOfDepartment =
              processAnalytics.departmentsPendingProcess[departmentIndex]
                .documentDetails;
            if (documentDetailsOfDepartment) {
              for (let i = 0; i < workNameGroups.length; i++) {
                const workNameIndex = documentDetailsOfDepartment.findIndex(
                  (work) => work.workName === workNameGroups[i].workName
                );
                if (workNameIndex !== -1) {
                  documentDetailsOfDepartment[workNameIndex].documentsUploaded =
                    [
                      ...(documentDetailsOfDepartment[workNameIndex]
                        .documentsUploaded || []),
                      ...workNameGroups[i].documentsUploaded,
                    ];
                } else {
                  documentDetailsOfDepartment.push(workNameGroups[i]);
                }
              }
              processAnalytics.departmentsPendingProcess[
                departmentIndex
              ].documentDetails = documentDetailsOfDepartment;
            } else {
              processAnalytics.departmentsPendingProcess[
                departmentIndex
              ].documentDetails = workNameGroups;
            }
          } else {
            // If the department is not found, add it with an initial count of 1
            // processAnalytics.noOfPendingProcess += 1;
            processAnalytics.departmentsPendingProcess.push({
              department: new ObjectId(req.body.workFlow),
              documentDetails: workNameGroups,
            });
          }
        }

        // Save the updated document back to the database
        await processAnalytics.save();
      } else {
        const processData =
          process.steps && process.steps.length > 0
            ? {
                date: new Date(),
                documentDetails: workNameGroups,
              }
            : {
                date: new Date(),
                documentDetails: workNameGroups,
                departmentsPendingProcess: [
                  {
                    department: new ObjectId(req.body.workFlow),
                    documentDetails: workNameGroups,
                  },
                ],
              };
        let newProcessAnalytics = new ProcessAnalytics();

        await newProcessAnalytics.save();
      }
    } catch (error) {
      console.log("error updating process analytics", error);
    }

    // const process_result = await is_process_forwardable(process, userData._id);
    return res.status(200).json({
      message: "added newly uploaded documents successfully",
      documents: documents,
      replacementsWithRef: replacementsWithRef,
      isForwardable: true,
      isRevertable: true,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "error adding documents in process",
    });
  }
};

function removeDuplicateNotifications(notifications) {
  const seenProcessIds = new Set();
  const uniqueNotifications = [];

  notifications.forEach((notification) => {
    const processIdStr = notification.processId.toString(); // Convert ObjectId to string
    if (!seenProcessIds.has(processIdStr)) {
      uniqueNotifications.push(notification);
      seenProcessIds.add(processIdStr);
    }
  });

  return uniqueNotifications;
}

export const get_user_notifications_for_processes = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let user = await User.findOne({ _id: userData._id })
      .select("notifications")
      .lean();

    let notifications = [];

    if (user.notifications) {
      for (let i = 0; i < user.notifications.length; i++) {
        let note = user.notifications[i];
        if (note.work) {
          const workName = await Work.findOne({ _id: note.work }).select(
            "name"
          );
          if (workName) {
            note.work = workName.name;
          } else {
            note.work = "";
          }
        } else {
          note.work = "";
        }
        notifications.push(note);
      }
    }

    return res.status(200).json({
      notifications: removeDuplicateNotifications(notifications),
    });
  } catch (error) {
    console.log("error getting user notifications for user", error);
    return res.status(500).json({
      message: "error getting user notifications for user",
    });
  }
};

export const remove_notification_from_user_document = async (
  req,
  res,
  next
) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let userWithNotifications = await User.findOne({
      _id: userData._id,
    }).select("notifications");

    userWithNotifications.notifications =
      userWithNotifications.notifications.filter(
        (item) => !item.processId.equals(new ObjectId(req.params.id))
      );

    await userWithNotifications.save();

    return res.status(200).json({
      message: "updated notifications successfully",
    });
  } catch (error) {
    console.log("error removing notification from user document", error);
    return res.status(500).json({
      message: "error removing notification from user document",
    });
  }
};

export const send_process_to_clerk_for_work = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const processId = req.params.id;

    const process = await Process.findById({ _id: processId }).select(
      "workFlow documents name completed connectors"
    );

    let department;
    let clerks;

    if (req.body.workFlowToBeFollowed) {
      department = await Department.findOne({
        _id: req.body.workFlowToBeFollowed,
      }).select("head steps");
      clerks = department.steps[0].users.map((item) => item.user);
      const connectorIndex = process.connectors.findIndex((connector) =>
        connector.department.equals(new ObjectId(req.body.workFlowToBeFollowed))
      );
      if (connectorIndex !== -1) {
        // Update the currentStepNumber for the found connector
        process.connectors[connectorIndex].currentStepNumber = 0; // Set to the desired value, probably based on some logic
        if (clerks.length === 1) {
          process.connectors[connectorIndex].currentActorUser = clerks[0];
          process.connectors[connectorIndex].remarks = req.body.remarks;
        }
      } else {
        process.currentStepNumber = 0;
        process.currentActorUser = clerks[0];
        process.remarks = req.body.remarks;
      }
    } else {
      department = await Department.findOne({
        _id: process.workFlow,
      }).select("head steps");
      clerks = department.steps[0].users.map((item) => item.user);
      process.currentActorUser = clerks[0];
      process.currentStepNumber = 0;
    }

    if (department.head) {
      await User.updateOne(
        { _id: department.head },
        {
          $pull: {
            processes: { process: processId },
          },
        }
      );
    }

    // let clerks = department.steps[0].users.map((item) => item.user);

    let work;
    if (department.steps.length > 0) {
      for (let m = 0; m < clerks.length; m++) {
        const clerk = clerks[m];
        if (clerk) {
          let docIds = process.documents.map((item) =>
            item.documentId.toString()
          );

          if (req.body.workFlowToBeFollowed) {
            const connector = process.connectors.find((item) =>
              item.equals(new ObjectId(req.body.workFlowToBeFollowed))
            );
            if (connector && connector.documents) {
              const connectorDocuments = connector.documents.map((item) =>
                item.documentId.toString()
              );
              docIds = [...docIds, ...connectorDocuments];
            }
          }

          let docs = await getParents(docIds);

          docs = [...docIds, ...docs];

          work = await Work.findOne({ name: req.body.work });

          let newProcess;

          if (work) {
            newProcess = {
              process: process._id, // Replace with the actual process ID
              pending: true, // Set to the desired value
              receivedAt: Date.now(),
              work: work._id,
            };
          } else {
            newProcess = {
              process: process._id, // Replace with the actual process ID
              pending: true, // Set to the desired value
              receivedAt: Date.now(),
            };
          }

          if (req.body.workFlowToBeFollowed) {
            newProcess.workFlowToBeFollowed = req.body.workFlowToBeFollowed;
          }

          await User.updateOne(
            { _id: clerk },
            {
              $push: {
                processes: newProcess,
                readable: { $each: docs },
              },
            }
          );
        }

        const clerk_var = clerk;

        try {
          const clerk = await User.findOne({
            _id: clerk_var,
          }).select("username role branch email");

          const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
              user: systemEmail,
              pass: senderPassword,
            },
          });

          // Email content
          const mailOptions = {
            from: systemEmail,
            to: clerk.email,
            subject: `Update on ${process.name}`,
            html: req.body.workFlowToBeFollowed
              ? `<p>Hello, ${clerk.username}</p>
          <p>${process.name} is forwarded to you by ${userData.username}`
              : `<p>Hello, ${clerk.username}</p>
          <p>${process.name} is forwarded to you by ${userData.username} for work ${req.body.work}.</p>
        `,
          };
          const info = await transporter.sendMail(mailOptions);
        } catch (error) {
          console.error("Error sending email:", error);
        }

        try {
          let usernameOfProcessIsForwardedTo = await User.findOne({
            _id: clerk,
          }).select("username notifications");

          const newNotification = {
            processId: process._id,
            processName: process.name,
            completed: process.completed,
            receivedAt: Date.now(),
            isPending: true,
            work: work ? work._id : null,
          };

          if (req.body.workFlowToBeFollowed) {
            newNotification.workFlowToBeFollowed = new ObjectId(
              req.body.workFlowToBeFollowed
            );
          }
          if (usernameOfProcessIsForwardedTo.notifications) {
            usernameOfProcessIsForwardedTo.notifications.push(newNotification);
            const z = await usernameOfProcessIsForwardedTo.save();
          } else {
            usernameOfProcessIsForwardedTo.notifications = [];
            usernameOfProcessIsForwardedTo.notifications.push(newNotification);

            const z = await usernameOfProcessIsForwardedTo.save();
          }
        } catch (error) {
          console.log("error adding process in head's notification array");
        }
      }
    }

    const workFlow = req.body.workFlowToBeFollowed
      ? new ObjectId(req.body.workFlowToBeFollowed)
      : process.workFlow;

    if (!req.body.workFlowToBeFollowed) {
      try {
        let work = await Work.findOne({ name: "publish" });

        const logWorkDocs = await get_log_docs(
          processId,
          currentUserId,
          process.documents
        );

        await addLog(
          processId,
          false,
          {
            work: work._id,
            actorUser: userData._id,
            actorRole: userData.role,
            stepNumber: department.steps.length + 1,
          },
          {
            work: work._id,
            users: clerks,
            stepNumber: department.steps.length + 2,
          },
          logWorkDocs,
          workFlow
        );
      } catch (error) {
        console.log("error adding log", error);
      }
    }

    process.markModified("connectors");
    await process.save();
    return res.status(200).json({
      message: "process sent to clerk for given work",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "error sending process to clerk",
    });
  }
};

export const end_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    await User.updateOne(
      { _id: userData._id },
      {
        $pull: {
          processes: { process: req.params.id },
        },
      }
    );

    let process = await Process.findOne({ _id: req.params.id }).select(
      "documents workFlow"
    );

    let department = await Department.findOne({ _id: process.workFlow }).select(
      "steps"
    );

    let clerkRoleId = await Role.findOne({ _id: userData.role }).select("_id");

    let work = await Work.findOne({ name: req.body.work });

    try {
      const logWorkDocs = await get_log_docs(
        process._id,
        userData._id,
        process.documents
      );

      await addLog(
        req.params.id,
        false,
        {
          work: work._id,
          actorUser: userData._id,
          actorRole: clerkRoleId._id,
          stepNumber: department.steps.length + 2,
        },
        null,
        logWorkDocs
      );
    } catch (error) {
      console.log("error adding log", error);
    }

    return res.status(200).json({
      message: "ended process successfully",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "error ending process",
    });
  }
};

export const head_office_rejection = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const currentUserId = new ObjectId(userData._id);
    const processId = req.params.processId;
    const workFlowToBeFollowed = req.body.workFlowToBeFollowed;
    const remarks = req.body.remarks;

    const process = await Process.findOne({ _id: processId });

    if (!process) {
      return res.status(404).json({
        message: "Process you want to approve doesn't exist",
      });
    }

    // Find the connector in the connectors array with the given department ID
    const connectorIndex = process.connectors.findIndex((connector) =>
      connector.department.equals(new ObjectId(workFlowToBeFollowed))
    );
    if (connectorIndex === -1) {
      return res.status(400).json({
        message:
          "Department on behalf of you want to approve this process is not added as the connector in process",
      });
    }

    // Update the completed field to true
    process.connectors[connectorIndex].completed = false;

    process.connectors[connectorIndex].remarks = remarks ? remarks : "";

    process.connectors[connectorIndex].lastStepDone = 0;

    process.connectors[connectorIndex].currentStepNumber = 1;

    // Save the updated process
    await process.save();

    let head = await Department.findOne({
      _id: new ObjectId(workFlowToBeFollowed),
    }).select("head");
    head = head.head;
    if (head) {
      await attach_process_with_user(processId, workFlowToBeFollowed, head);
      // await add_notification_in_user_account(
      //   process,
      //   workFlowToBeFollowed,
      //   head
      // );
    }

    return res.status(200).json({
      message: "process is rejected successfully",
    });
  } catch (error) {
    console.log(
      "error approving process by branch manager or department head",
      error
    );
    return res.status(500).json({
      message: "Error approving process",
    });
  }
};

export const pick_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const processId = req.params.processId;

    const process = await Process.findOne({ _id: processId }).select(
      "isInterBranchProcess connectors workFlow steps"
    );

    let workFlow;

    if (!(process.steps && process.steps.length > 0)) {
      workFlow = req.body.workFlowToBeFollowed
        ? new ObjectId(req.body.workFlowToBeFollowed)
        : process.workFlow;
    }

    if (
      !process.isInterBranchProcess ||
      process.workFlow.equals(req.body.workFlowToBeFollowed)
    ) {
      await Process.findByIdAndUpdate(
        { _id: processId },
        {
          currentActorUser: userData._id,
        }
      );
    } else {
      const connectorIndex = process.connectors.findIndex((connector) =>
        connector.department.equals(new ObjectId(workFlow))
      );

      if (connectorIndex === -1) {
        process.currentActorUser = userData._id;
      } else {
        process.connectors[connectorIndex].currentActorUser = userData._id;

        await process.save();
      }
    }

    return res.status(200).json({
      message: "process is picked successfully",
    });
  } catch (error) {
    console.log("error picking process", error);
    return res.status(500).json({
      message: "Error picking process",
    });
  }
};

export const get_documents_names_in_process = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const processName = req.body.processName;

    const process = await Process.findOne({ name: processName }).select(
      "documents connectors"
    );

    let documents = process.documents;

    let connectors = process.connectors;

    for (let j = 0; j < connectors.length; j++) {
      documents = [...documents, ...connectors[j].documents];
    }

    documents = documents.map((item) => item.documentId);

    for (let k = 0; k < documents.length; k++) {
      const docDetails = await Document.findOne({ _id: documents[k] }).select(
        "name"
      );
      documents[k] = docDetails.name;
    }

    return res.status(200).json({
      files: documents,
    });
  } catch (error) {
    console.log(
      "error getting document details involved in the process",
      error
    );
    return res.status(500).json({
      message: "error getting document details involved in the process",
    });
  }
};

/*
  step-1: fetch all the processes
  step-2: fetch processes pending at user who is hitting this function
  step:3: loop over each process & get currentStepNumber of process & get all the steps coming
          before currentStepNumber and check if user is present in those steps or not
  step:4: if user is involved then check if process is present in user processes array
  step:5 if process is present then consider process, if not then check in log's currentStep
         if user is present out there, consider process else ignore
*/
export const get_process_names_for_specific_user = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const processes = await Process.find({}) // Only fetch non-completed processes
      .populate({
        path: "workFlow",
        populate: {
          path: "steps.users",
          select: "_id name", // Adjust fields as necessary
        },
      })
      .exec();

    const userProcesses = await User.findById(userData._id)
      .populate("processes.process", "name workFlowToBeFollowed")
      .exec();

    const processNames = [];

    // Use Promise.all to handle asynchronous operations
    await Promise.all(
      processes.map(async (process) => {
        try {
          let logs = await Log.find({
            processId: process._id,
          });

          const stepNumbers = logs.map((log) => log.nextStep?.stepNumber || 0);

          // Find the maximum stepNumber
          const maxStepNumber = Math.max(...stepNumbers);

          const currentStepNumber = maxStepNumber || 0;
          const workflowSteps = process.workFlow.steps;

          // Check if user is involved in the current or later steps
          const isUserInvolved = workflowSteps.some(
            (step) =>
              step.stepNumber <= currentStepNumber &&
              step.users.some((userObj) =>
                userObj.user.equals(new ObjectId(userData._id))
              )
          );

          if (isUserInvolved) {
            // Find user's corresponding process and retrieve 'workFlowToBeFollowed'
            const userProcess = userProcesses.processes.find((userProcess) =>
              userProcess.process
                ? userProcess.process.equals(process._id) && !process.completed
                : false
            );

            if (userProcess) {
              processNames.push({
                name: process.name,
                _id: process._id,
                workFlowToBeFollowed: userProcess.workFlowToBeFollowed,
              });
            } else {
              logs = logs
                .map((item) => item.currentStep)
                .map((step) => step.actorUser);

              const userExistsInLogs = logs.some((id) =>
                id.equals(new ObjectId(userData._id))
              );

              if (userExistsInLogs) {
                processNames.push({
                  name: process.name,
                  _id: process._id,
                  workFlowToBeFollowed: null,
                });
              }
            }
          }
        } catch (error) {
          console.log("error returning process");
        }
      })
    );

    // Once all asynchronous operations are done, return the result
    return res.status(200).json({
      processNames: processNames,
    });
  } catch (error) {
    console.log("Error returning process names' list", error);
    return res.status(500).json({
      message: "Error returning process names' list",
    });
  }
};
