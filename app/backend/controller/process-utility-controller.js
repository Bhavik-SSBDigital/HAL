import LogWork from "../models/logWork.js";
import Log from "../models/log.js";
import User from "../models/user.js";
import { ObjectId } from "mongodb";
import Department from "../models/department.js";
import Work from "../models/work.js";
import Process from "../models/process.js";
export const is_process_forwardable = async (process, userId) => {
  try {
    if (process.completed) {
      return {
        isForwardable: false,
        isRevertable: false,
      };
    }
    let signed_docs = [];

    let workflow;

    if (!(process.steps && process.steps.length > 0)) {
      workflow = process.workFlow;
      workflow = await Department.findOne({ _id: workflow }).select("steps");
    } else {
      workflow = process.steps;
    }

    // if (process.currentStepNumber === process.maxReceiverStepNumber) {
    //   return {
    //     isForwardable: false,
    //     isRevertable: false,
    //   };
    // }

    let currentWork =
      process.steps && process.steps.length > 0
        ? workflow[process.currentStepNumber - 1]
        : workflow.steps[process.currentStepNumber - 1];

    currentWork = await Work.findOne({ _id: currentWork.work }).select("name");

    currentWork = currentWork.name;

    for (let x = 0; x < process.documents.length; x++) {
      const signed_doc = process.documents[x];

      const signers = signed_doc.signedBy;

      let signFound = false;

      for (let s = 0; s < signers.length; s++) {
        let signer = new ObjectId(signers[s]._id);
        if (signer.equals(new ObjectId(userId))) {
          signed_docs.push(signed_doc.documentId);
          break;
        }
      }
    }

    const results = await Log.aggregate([
      {
        $match: {
          "currentStep.actorUser": new ObjectId(userId),
          processId: new ObjectId(process._id),
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

    const logWork = await LogWork.findOne({
      process: process._id,
      user: userId,
    });

    let currently_rejected_docs = [];

    if (logWork && logWork.rejectedDocuments) {
      currently_rejected_docs = logWork.rejectedDocuments.map(
        (item) => item.document
      );
    }

    // get the uploaded documents in log if any

    let uploadedDocsInPrevLogs = [];
    if (currentWork === "upload") {
      const uploadWorks = await Work.find({ name: "upload" }).select("_id");
      const uploadWorkIds = uploadWorks.map((work) => work._id);

      // Find the logs where processId, currentStep.actorUser, and currentStep.work match the conditions
      const logs = await Log.find({
        processId: process._id,
        "currentStep.actorUser": userId,
        "currentStep.work": { $in: uploadWorkIds },
      }).select("documents");

      // Extract documents from the matched logs
      uploadedDocsInPrevLogs = logs.flatMap((log) =>
        log.documents.map((doc) => doc.documentId)
      );
    }

    let currently_uploaded_docs = logWork
      ? logWork.uploadedDocuments
        ? logWork.uploadedDocuments
        : []
      : [];

    console.log("uploaded docs in prev logs", uploadedDocsInPrevLogs);
    console.log("currently uploaded docs", currently_uploaded_docs);

    const all_worked_docs =
      currentWork === "e-sign"
        ? [
            ...signed_docs,
            ...currently_rejected_docs,
            ...process.rejectedDocIdsInPrevLogs,
          ]
        : [...uploadedDocsInPrevLogs, ...currently_uploaded_docs];

    const rejected_docs = process.documents.filter(
      (item) =>
        item.rejection &&
        !new ObjectId(item.rejection.step.actorUser).equals(
          new ObjectId(userId)
        ) &&
        item.signedBy.some((sign) =>
          new ObjectId(sign._id).equals(new ObjectId(userId))
        )
    );

    console.log("process docs", process.documents.length);
    console.log("all worked docs", all_worked_docs.length);
    console.log("currently rejected docs", currently_rejected_docs.length);
    console.log("current step number", process.currentStepNumber);
    console.log("max step receiver number", process.maxReceiverStepNumber);

    if (
      process.documents.length === all_worked_docs.length &&
      // rejected_docs.length === 0 &&
      currently_rejected_docs.length === 0 &&
      !(process.currentStepNumber === process.maxReceiverStepNumber)
    ) {
      return {
        isForwardable: true,
        isRevertable: false,
      };
    }

    if (currently_rejected_docs.length > 0) {
      return {
        isForwardable: false,
        isRevertable: true,
      };
    }

    return {
      isForwardable: false,
      isRevertable: false,
    };
  } catch (error) {
    console.log("error finding process is forwardable or not", error);
    throw new Error(error);
  }
};
