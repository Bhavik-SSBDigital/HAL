import { ObjectId } from "mongodb";
import LogWork from "../models/logWork.js";

export const get_log_docs = async (processId, userId, documents) => {
  const logWork = await LogWork.findOne({
    process: processId,
    user: userId,
  });

  let signedDocuments = logWork ? logWork.signedDocuments || [] : [];

  let rejectedDocuments = logWork ? logWork.rejectedDocuments || [] : [];

  let uploadedDocuments = logWork ? logWork.uploadedDocuments || [] : [];

  const operatedDocuments = [
    ...signedDocuments,
    ...rejectedDocuments,
    ...uploadedDocuments,
  ];

  signedDocuments = signedDocuments.map((item) => {
    const signedDoc = {
      documentId: item,
      isSigned: true,
      isUploaded: false,
      isRejected: false,
    };
    return signedDoc;
  });

  rejectedDocuments = rejectedDocuments.map((item) => {
    const rejectedDoc = {
      documentId: item.document,
      isRejected: true,
      isUploaded: false,
      isSigned: false,
      reason: item.reason,
    };
    return rejectedDoc;
  });

  uploadedDocuments = uploadedDocuments.map((item) => {
    const uploadedDoc = {
      documentId: item,
      isUploaded: true,
      isSigned: false,
      isRejected: false,
    };
    return uploadedDoc;
  });

  // // Extract the IDs of the operated documents
  // const operatedSet = new Set(
  //   operatedDocuments.map((doc) => doc.document.toString())
  // );

  // // Filter the documents
  // let unOperatedDocuments = documents.filter(
  //   (doc) => !operatedSet.has(doc.documentId.toString())
  // );

  // unOperatedDocuments = unOperatedDocuments.map((item) => {
  //   const unOperatedDoc = {
  //     documentId: item.documentId,
  //     isRejected: false,
  //     isSigned: false,
  //   };
  //   return unOperatedDoc;
  // });

  const logDocs = [
    ...rejectedDocuments,
    ...signedDocuments,
    ...uploadedDocuments,
  ];

  return logDocs;
};
