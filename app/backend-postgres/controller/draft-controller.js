import { verifyUser } from "../utility/verifyUser.js";

import pkg from "@prisma/client";
import { file_copy, delete_file } from "./file-controller.js";
import { createFolder } from "./file-controller.js";
import { fileURLToPath } from "url";
import { dirname, join, normalize, extname } from "path";
import { file_delete } from "./file-controller.js";
import { watermarkDocument } from "./watermark.js";
import { generate_unique_process_name } from "./process-controller.js";
import { processAssignment } from "./process-controller.js";
import { ensureDocumentAccessWithParents } from "./process-controller.js";
import { checkUserProcessAssignment } from "./process-controller.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

import path from "path";

const STORAGE_PATH = process.env.STORAGE_PATH;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const {
  PrismaClient,
  AccessType,
  NotificationType,
  ProcessStatus,
  StepStatus,
} = pkg;

const prisma = new PrismaClient();

const createDraftFolder = async (draftName, userData) => {
  // Create a temporary folder for draft documents
  const draftPath = `../drafts/${draftName}`;
  await createFolder(false, draftPath, userData);
  return draftPath;
};

const copyToDraftFolder = async (
  sourcePath,
  draftPath,
  accessToken,
  docName,
) => {
  // Copy document to draft folder
  return new Promise((resolve, reject) => {
    file_copy(
      {
        headers: { authorization: `Bearer ${accessToken}` },
        body: {
          sourcePath,
          destinationPath: draftPath,
          name: docName,
        },
      },
      {
        status: (code) => ({
          json: (data) => {
            if (code === 200) resolve(data);
            else reject(data);
          },
        }),
      },
    );
  });
};

const prepareDocumentsForDraft = async (documents, draftPath, accessToken) => {
  const preparedDocs = [];

  for (const doc of documents) {
    const document = await prisma.document.findUnique({
      where: { id: parseInt(doc.documentId) },
      select: { path: true, id: true, name: true },
    });

    if (document) {
      // Copy to draft folder
      const copyResult = await copyToDraftFolder(
        `./${document.path}`,
        draftPath,
        accessToken,
        docName,
      );

      preparedDocs.push({
        documentId: copyResult.documentId,
        originalDocumentId: doc.documentId,
        isNewDocument: doc.isNewDocument || false,
        oldDocumentId: doc.oldDocumentId,
        preApproved: doc.preApproved || false,
        tags: doc.tags || [],
        partNumber: doc.partNumber,
        description: doc.description,
        issueNo: doc.issueNo,
        reasonOfSupersed: doc.reasonOfSupersed,
      });
    }
  }

  return preparedDocs;
};

const ensureDraftFolder = async (draftPath, userData) => {
  try {
    // Remove "../" prefix if present for checking
    const normalizedPath = draftPath.replace("../", "");

    // Check if folder exists
    if (fs.existsSync(draftPath)) {
      // Folder exists, create a unique backup folder name
      const backupPath = `${draftPath}_backup_${Date.now()}`;

      // Move existing folder to backup
      await fs.promises.rename(draftPath, backupPath);
      console.log(`Existing draft folder moved to: ${backupPath}`);
    }

    // Create new folder
    await createFolder(false, draftPath, userData);
    console.log(`Created new draft folder: ${draftPath}`);
  } catch (error) {
    console.error(`Error ensuring draft folder: ${draftPath}`, error);
    throw error;
  }
};

export const saveProcessDraft = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const {
      saveAsDraft = false,
      type,
      workflowId,
      processId,
      description,
      issueNo,
      documents = [],
      supersededDocuments = [],
    } = req.body;

    console.log("Saving REOPEN draft with data:", {
      type,
      processId,
      supersededDocumentsCount: supersededDocuments?.length || 0,
    });

    if (!type) {
      return res.status(400).json({ message: "Draft type is required" });
    }

    if (type === "INITIATE" && !workflowId) {
      return res
        .status(400)
        .json({ message: "Workflow ID is required for INITIATE drafts" });
    }

    if (type === "REOPEN" && !processId) {
      return res
        .status(400)
        .json({ message: "Process ID is required for REOPEN drafts" });
    }

    const draftName = `draft_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const draftPath = `../drafts/${draftName}`;

    await ensureDraftFolder(draftPath, userData);

    let existingDraft = null;

    console.log("req.body.draftId", req.body.draftId);
    if (req.body.draftId) {
      existingDraft = await prisma.processDraft.findUnique({
        where: {
          id: req.body.draftId,
          initiatorId: userData.id,
          status: "DRAFT",
        },
        include: { draftDocuments: true },
      });

      console.log("existing draft", existingDraft);
    }

    const draft = await prisma.$transaction(async (tx) => {
      let savedDraft;
      const preparedDocuments = [];

      if (type === "REOPEN" && supersededDocuments?.length > 0) {
        console.log(
          "Processing REOPEN supersededDocuments:",
          supersededDocuments,
        );

        // For REOPEN drafts, we need to handle document upload differently
        // The documents are already uploaded to the process folder via frontend upload
        // We just need to reference them, not copy them

        for (const [index, doc] of supersededDocuments.entries()) {
          try {
            if (!doc.newDocumentId) {
              console.warn(
                `Document at index ${index} has no newDocumentId, skipping`,
              );
              continue;
            }

            // Check if document already exists in the database
            let document = await tx.document.findUnique({
              where: { id: parseInt(doc.newDocumentId) },
            });

            if (!document) {
              console.error(
                `Document not found in database: ${doc.newDocumentId}`,
              );
              continue;
            }

            // For REOPEN drafts, we don't copy files to draft folder
            // We just store references to the already-uploaded documents
            preparedDocuments.push({
              documentId: document.id,
              newDocumentId: document.id,
              originalDocumentId: document.id, // Same as newDocumentId since already uploaded
              isNewDocument: doc.isNewDocument || false,
              oldDocumentId: doc.oldDocumentId || null,
              preApproved: doc.preApproved || false,
              tags: doc.tags || [],
              partNumber: doc.partNumber || "",
              description: doc.fileDescription || "",
              issueNo: doc.issueNo || "",
              reasonOfSupersed: doc.reasonOfSupersed || "",
              uploadedFileName: doc.uploadedFileName || document.name,
            });
          } catch (error) {
            console.error(
              `Error processing document at index ${index}:`,
              error,
            );
            continue;
          }
        }
      } else if (type === "INITIATE") {
        // Handle INITIATE draft documents (original logic)
        for (const doc of documents) {
          const document = await tx.document.findUnique({
            where: { id: parseInt(doc.documentId) },
            select: { path: true, id: true, name: true },
          });

          if (!document) continue;

          const copyResult = await new Promise((resolve, reject) => {
            file_copy(
              {
                headers: { authorization: `Bearer ${accessToken}` },
                body: {
                  sourcePath: `./${document.path}`,
                  destinationPath: draftPath,
                  name: document.name,
                },
              },
              {
                status: (code) => ({
                  json: (data) => {
                    if (code === 200) resolve(data);
                    else reject(data);
                  },
                }),
              },
            );
          });

          preparedDocuments.push({
            documentId: copyResult.documentId,
            originalDocumentId: doc.documentId,
            isNewDocument: doc.isNewDocument || false,
            oldDocumentId: doc.oldDocumentId,
            preApproved: doc.preApproved || false,
            tags: doc.tags || [],
            partNumber: doc.partNumber,
            description: doc.description,
            issueNo: doc.issueNo,
            reasonOfSupersed: doc.reasonOfSupersed,
          });
        }
      }

      if (existingDraft) {
        savedDraft = await tx.processDraft.update({
          where: { id: req.body.draftId },
          data: {
            description: description || existingDraft.description,
            issueNo: issueNo || existingDraft.issueNo,
            documentData: {
              documents: preparedDocuments,
            },
            supersededDocuments: type === "REOPEN" ? supersededDocuments : null,
            updatedAt: new Date(),
          },
        });

        // Delete old draft documents
        await tx.processDraftDocument.deleteMany({
          where: { draftId: req.body.draftId },
        });

        // For REOPEN drafts, we don't delete the actual documents
        // because they're stored in the process folder, not draft folder
        if (type === "INITIATE") {
          // Delete old files from draft folder only for INITIATE
          for (const oldDoc of existingDraft.draftDocuments) {
            try {
              await new Promise((resolve, reject) => {
                delete_file(
                  {
                    headers: { authorization: `Bearer ${accessToken}` },
                    body: { documentId: oldDoc.documentId },
                  },
                  {
                    status: (code) => ({
                      json: (data) => {
                        if (code === 200) resolve(data);
                        else reject(data);
                      },
                    }),
                  },
                );
              });
            } catch (err) {
              console.error(
                `Error deleting old draft document ${oldDoc.documentId}`,
                err,
              );
            }
          }
        }
      } else {
        savedDraft = await tx.processDraft.create({
          data: {
            type,
            workflowId: type === "INITIATE" ? workflowId : null,
            processId: type === "REOPEN" ? processId : null,
            initiatorId: userData.id,
            name: draftName,
            description: description || null,
            issueNo: issueNo || null,
            documentData: { documents: preparedDocuments },
            supersededDocuments: type === "REOPEN" ? supersededDocuments : null,
            storagePath: draftPath,
            status: "DRAFT",
          },
        });
      }

      // Create draft document records
      for (const [index, doc] of preparedDocuments.entries()) {
        await tx.processDraftDocument.create({
          data: {
            draftId: savedDraft.id,
            documentId: doc.documentId,
            isNewDocument: doc.isNewDocument,
            oldDocumentId: parseInt(doc.oldDocumentId),
            preApproved: doc.preApproved,
            tags: doc.tags,
            partNumber: doc.partNumber,
            description: doc.description,
            issueNo: doc.issueNo,
            reasonOfSupersed: doc.reasonOfSupersed,
            sortOrder: index,
          },
        });
      }

      return savedDraft;
    });

    return res.status(200).json({
      message: existingDraft
        ? "Draft updated successfully"
        : "Draft saved successfully",
      draftId: draft.id,
      draftName: draft.name,
    });
  } catch (error) {
    console.error("Error saving draft:", error);
    return res.status(500).json({
      message: "Error saving draft",
      error: error.message,
    });
  }
};

export const editProcessDraft = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { draftId } = req.params;

    const existingDraft = await prisma.processDraft.findUnique({
      where: {
        id: draftId,
        initiatorId: userData.id,
        status: "DRAFT",
      },
      include: {
        draftDocuments: {
          include: {
            document: true,
            oldDocument: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        workflow: true,
        process: true,
      },
    });

    if (!existingDraft) {
      return res
        .status(404)
        .json({ message: "Draft not found or not editable" });
    }

    const draftData = {
      type: existingDraft.type,
      workflowId: existingDraft.workflowId,
      processId: existingDraft.processId,
      description: existingDraft.description,
      issueNo: existingDraft.issueNo,
      documents: existingDraft.draftDocuments.map((doc) => ({
        documentId: doc.document.id,
        name: doc.document.name,
        type: doc.document.type,
        tags: doc.tags,
        partNumber: doc.partNumber,
        description: doc.description,
        issueNo: doc.issueNo,
        preApproved: doc.preApproved,
        isNewDocument: doc.isNewDocument,
        oldDocumentId: doc.oldDocumentId,
        reasonOfSupersed: doc.reasonOfSupersed,
      })),
      supersededDocuments: existingDraft.supersededDocuments || [],
    };

    return res.status(200).json({
      success: true,
      data: {
        draft: draftData,
        draftId: existingDraft.id,
        workflow: existingDraft.workflow,
        process: existingDraft.process,
        createdAt: existingDraft.createdAt,
        updatedAt: existingDraft.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error getting draft for edit:", error);
    return res.status(500).json({
      message: "Error getting draft",
      error: error.message,
    });
  }
};

export const submitProcessDraft = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { draftId } = req.body;

    const draft = await prisma.processDraft.findUnique({
      where: {
        id: draftId,
        initiatorId: userData.id,
        status: "DRAFT",
      },
      include: {
        draftDocuments: {
          include: {
            document: true,
            oldDocument: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        workflow: true,
        process: true,
      },
    });

    if (!draft) {
      return res
        .status(404)
        .json({ message: "Draft not found or already submitted" });
    }

    let result;

    if (draft.type === "INITIATE") {
      result = await submitInitiationDraft(draft, userData, accessToken);
    } else if (draft.type === "REOPEN") {
      result = await submitReopenDraft(draft, userData, accessToken);
    }

    await prisma.$transaction(async (tx) => {
      // Update draft status
      await tx.processDraft.update({
        where: { id: draftId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      // Clean up draft folder
      await cleanupDraftFolder(draft.storagePath, accessToken);
    });

    return res.status(200).json({
      message: `Draft submitted successfully`,
      ...result,
    });
  } catch (error) {
    console.error("Error submitting draft:", error);
    return res.status(500).json({
      message: "Error submitting draft",
      error: error.message,
    });
  }
};

const submitInitiationDraft = async (draft, userData, accessToken) => {
  return await prisma.$transaction(async (tx) => {
    const processName = await generate_unique_process_name(draft.workflowId);
    const workflowName = draft.workflow.name;
    const finalStoragePath = `../${workflowName}/${processName}`;

    // CRITICAL: Create the destination folder before copying files
    await createFolder(false, finalStoragePath, userData);

    const finalDocumentIds = [];

    console.log("draft docs", draft.draftDocuments);
    for (const draftDoc of draft.draftDocuments) {
      const sourcePath = `./${draftDoc.document.path}`;

      const copyResult = await new Promise((resolve, reject) => {
        file_copy(
          {
            headers: { authorization: `Bearer ${accessToken}` },
            body: {
              sourcePath,
              destinationPath: finalStoragePath,
              name: draftDoc.document.name,
            },
          },
          {
            status: (code) => ({
              json: (data) => {
                if (code === 200) resolve(data);
                else reject(data);
              },
            }),
          },
        );
      });

      finalDocumentIds.push(copyResult.documentId);

      await new Promise((resolve, reject) => {
        delete_file(
          {
            headers: { authorization: `Bearer ${accessToken}` },
            body: { documentId: draftDoc.documentId },
          },
          {
            status: (code) => ({
              json: (data) => {
                if (code === 200) resolve(data);
                else reject(data);
              },
            }),
          },
        );
      });
    }

    const process = await tx.processInstance.create({
      data: {
        workflowId: draft.workflowId,
        initiatorId: userData.id,
        name: processName,
        status: "IN_PROGRESS",
        description: draft.description,
        issueNo: draft.issueNo,
        currentStepId: null,
        reopenCycle: 0,
        storagePath: finalStoragePath,
      },
    });

    const processDocumentData = draft.draftDocuments.map((item, index) => ({
      processId: process.id,
      documentId: finalDocumentIds[index],
      reopenCycle: 0,
      SOPIssueNo: draft.issueNo || null,
      preApproved: item.preApproved || false,
      tags: item.tags || [],
      partNumber: item.partNumber || null,
      description: item.description || null,
      issueNo: item.issueNo || null,
    }));

    await tx.processDocument.createMany({
      data: processDocumentData,
    });

    const workflow = await tx.workflow.findUnique({
      where: { id: draft.workflowId },
      include: { steps: { include: { assignments: true } } },
    });

    if (!workflow || !workflow.steps.length) {
      throw new Error("Workflow or steps not found");
    }

    const step = workflow.steps[0];

    for (const assignment of step.assignments) {
      await processAssignment(
        tx,
        process,
        step,
        assignment,
        finalDocumentIds,
        false,
        true,
        draft.workflowId,
      );
    }

    await tx.processInstance.update({
      where: { id: process.id },
      data: { currentStepId: step.id, status: "IN_PROGRESS" },
    });

    return {
      message: `Process with the name ${processName} initiated successfully`,
      processId: process.id,
    };
  });
};

const submitReopenDraft = async (draft, userData, accessToken) => {
  return await prisma.$transaction(async (tx) => {
    const process = await tx.processInstance.findUnique({
      where: { id: draft.processId, initiatorId: userData.id },
      include: {
        workflow: {
          include: {
            steps: { include: { assignments: true } },
          },
        },
        documents: true,
      },
    });

    if (!process) {
      throw new Error(
        "Process not found, not completed, or user is not the initiator",
      );
    }

    const updatedProcess = await tx.processInstance.update({
      where: { id: draft.processId },
      data: {
        status: "IN_PROGRESS",
        reopenCycle: { increment: 1 },
        isRecirculated: true,
      },
    });

    const SOPIssueNo = draft.issueNo;
    const documentIds = [];

    // Get superseded documents data from the draft
    const supersededDocuments = draft.supersededDocuments || [];

    // If no supersededDocuments in JSON, use draftDocuments relation
    const draftDocsToProcess =
      supersededDocuments.length > 0
        ? supersededDocuments.map((doc, index) => {
            const draftDoc = draft.draftDocuments[index] || {};
            return {
              ...doc,
              // Merge with draft document data if available
              documentId: draftDoc.document?.id || doc.newDocumentId,
              documentName: draftDoc.document?.name || doc.uploadedFileName,
            };
          })
        : draft.draftDocuments.map((draftDoc) => ({
            isNewDocument: draftDoc.isNewDocument,
            preApproved: draftDoc.preApproved,
            oldDocumentId: draftDoc.oldDocumentId,
            newDocumentId: draftDoc.document?.id || null,
            uploadedFileName: draftDoc.document?.name,
            reasonOfSupersed: draftDoc.reasonOfSupersed,
            issueNo: draftDoc.issueNo,
            partNumber: draftDoc.partNumber,
            fileDescription: draftDoc.description,
            tags: draftDoc.tags,
            documentId: draftDoc.document?.id,
            documentName: draftDoc.document?.name,
          }));

    for (const draftDoc of draftDocsToProcess) {
      let newDoc;
      let finalDocumentId;

      if (draftDoc.documentId) {
        // Document already exists (from draft)
        newDoc = await tx.document.findUnique({
          where: { id: parseInt(draftDoc.documentId) },
        });

        if (!newDoc) {
          throw new Error(`Document not found: ${draftDoc.documentId}`);
        }

        finalDocumentId = newDoc.id;
      } else if (draftDoc.newDocumentId) {
        // Use newDocumentId from form
        newDoc = await tx.document.findUnique({
          where: { id: parseInt(draftDoc.newDocumentId) },
        });

        if (!newDoc) {
          throw new Error(`Document not found: ${draftDoc.newDocumentId}`);
        }

        finalDocumentId = newDoc.id;
      } else {
        throw new Error("No document ID provided for draft document");
      }

      // Create processDocument entry
      const processDocument = await tx.processDocument.create({
        data: {
          processId: draft.processId,
          documentId: finalDocumentId,
          isReplacement: !draftDoc.isNewDocument,
          superseding: !draftDoc.isNewDocument,
          replacedDocumentId: !draftDoc.isNewDocument
            ? parseInt(draftDoc.oldDocumentId)
            : null,
          preApproved: !!draftDoc.preApproved,
          reasonOfSupersed: !draftDoc.isNewDocument
            ? draftDoc.reasonOfSupersed || "No reason provided"
            : null,
          SOPIssueNo: SOPIssueNo || null,
          issueNo: draftDoc.issueNo || null,
          description: draftDoc.fileDescription || null,
          tags: draftDoc.tags || [],
          partNumber: draftDoc.partNumber || null,
          reopenCycle: updatedProcess.reopenCycle,
        },
      });

      // Record in document history
      await tx.documentHistory.create({
        data: {
          documentId: finalDocumentId,
          processId: draft.processId,
          userId: userData.id,
          actionType: draftDoc.isNewDocument ? "UPLOADED" : "REPLACED",
          actionDetails: {
            isNewDocument: draftDoc.isNewDocument,
            isReplacement: !draftDoc.isNewDocument,
            originalDocumentId: draftDoc.oldDocumentId || null,
            reopenCycle: updatedProcess.reopenCycle,
          },
          isRecirculationTrigger: true,
          processDocumentId: processDocument.id,
          replacedDocumentId: parseInt(draftDoc.oldDocumentId) || null,
        },
      });

      documentIds.push(finalDocumentId);

      // Ensure access for new document
      await ensureDocumentAccessWithParents(tx, {
        documentId: finalDocumentId,
        userId: userData.id,
        processId: draft.processId,
        assignmentId: null,
        roleId: null,
        departmentId: null,
      });

      if (draftDoc.oldDocumentId) {
        await ensureDocumentAccessWithParents(tx, {
          documentId: draftDoc.oldDocumentId,
          userId: userData.id,
          processId: draft.processId,
          assignmentId: null,
          roleId: null,
          departmentId: null,
        });
      }
    }

    // Handle recirculation of step instances (existing code)
    const engagedStepInstances = await tx.processStepInstance.findMany({
      where: {
        processId: draft.processId,
        OR: [
          { status: "APPROVED" },
          { status: "IN_PROGRESS" },
          { pickedById: { not: null } },
        ],
      },
      include: { workflowAssignment: true },
    });

    for (const oldStepInstance of engagedStepInstances) {
      const hasAccess = await checkUserProcessAssignment(
        draft.processId,
        parseInt(oldStepInstance.assignedTo),
      );

      if (hasAccess) continue;

      const newStepInstance = await tx.processStepInstance.create({
        data: {
          processId: draft.processId,
          stepId: oldStepInstance.stepId,
          assignmentId: oldStepInstance.assignmentId,
          progressId: oldStepInstance.progressId,
          assignedTo: oldStepInstance.assignedTo,
          roleId: oldStepInstance.roleId,
          departmentId: oldStepInstance.departmentId,
          status: "IN_PROGRESS",
          isRecirculated: true,
          recirculationCycle: updatedProcess.reopenCycle,
          recirculationReason: "Process reopened with superseded documents",
          createdAt: new Date(),
          deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      for (const docId of documentIds) {
        await ensureDocumentAccessWithParents(tx, {
          documentId: docId,
          userId: oldStepInstance.assignedTo,
          stepInstanceId: newStepInstance.id,
          processId: draft.processId,
          assignmentId: oldStepInstance.assignmentId,
          roleId: oldStepInstance.roleId,
          departmentId: oldStepInstance.departmentId,
        });
      }
    }

    // Update current step
    const firstRecirculatedStep = await tx.processStepInstance.findFirst({
      where: {
        processId: draft.processId,
        isRecirculated: true,
        status: "IN_PROGRESS",
      },
      orderBy: { createdAt: "asc" },
      select: { stepId: true },
    });

    if (firstRecirculatedStep) {
      await tx.processInstance.update({
        where: { id: draft.processId },
        data: { currentStepId: firstRecirculatedStep.stepId },
      });
    }

    return {
      message: "Process reopened successfully with superseded documents",
      processId: updatedProcess.id,
      reopenCycle: updatedProcess.reopenCycle,
    };
  });
};

export const getProcessDrafts = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const drafts = await prisma.processDraft.findMany({
      where: {
        initiatorId: userData.id,
        status: "DRAFT",
      },
      include: {
        workflow: {
          select: { name: true },
        },
        process: {
          select: { name: true },
        },
        draftDocuments: {
          include: {
            document: {
              select: { name: true, type: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.status(200).json({ drafts });
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return res.status(500).json({
      message: "Error fetching drafts",
      error: error.message,
    });
  }
};

export const deleteProcessDraft = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { draftId } = req.params;

    const draft = await prisma.processDraft.findUnique({
      where: {
        id: draftId,
        initiatorId: userData.id,
        status: "DRAFT",
      },
      include: {
        draftDocuments: true,
      },
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    await prisma.$transaction(async (tx) => {
      // Clean up draft folder first
      // await cleanupDraftFolder(draft.storagePath, accessToken);

      // Delete draft record (cascade will delete draftDocuments)
      await tx.processDraft.delete({
        where: { id: draftId },
      });
    });

    return res.status(200).json({ message: "Draft deleted successfully" });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return res.status(500).json({
      message: "Error deleting draft",
      error: error.message,
    });
  }
};

// Helper function for cleanup
const cleanupDraftFolder = async (storagePath, accessToken) => {
  try {
    // Only delete documents if they're in a draft folder
    if (!storagePath.includes("/drafts/")) {
      console.log(`Skipping cleanup for non-draft path: ${storagePath}`);
      return;
    }

    // Get all documents in the draft folder
    const documents = await prisma.document.findMany({
      where: {
        path: {
          contains: storagePath.replace("../", ""),
        },
      },
      select: { id: true, path: true },
    });

    console.log(
      `Found ${documents.length} documents to cleanup in ${storagePath}`,
    );

    // Delete all documents in the draft folder
    for (const doc of documents) {
      try {
        await new Promise((resolve, reject) => {
          delete_file(
            {
              headers: { authorization: `Bearer ${accessToken}` },
              body: { documentId: doc.id },
            },
            {
              status: (code) => ({
                json: (data) => {
                  if (code === 200) resolve(data);
                  else reject(data);
                },
              }),
            },
          );
        });
        console.log(`Deleted draft document: ${doc.id} from ${doc.path}`);
      } catch (error) {
        console.error(`Error deleting draft document ${doc.id}:`, error);
      }
    }

    console.log(`Cleaned up draft folder: ${storagePath}`);
  } catch (error) {
    console.error(`Error cleaning up draft folder ${storagePath}:`, error);
  }
};

// Add this to your draft controller
export const getDraftForEditing = async (req, res) => {
  // Helper function to remove filename from path
  const getDirectoryPath = (path) => {
    if (!path) return "";
    // Remove the last segment (filename) from the path
    const parts = path.split("/");
    parts.pop(); // Remove the filename
    return parts.join("/");
  };

  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { draftId } = req.params;

    const draft = await prisma.processDraft.findUnique({
      where: {
        id: draftId,
        // initiatorId: userData.id,
        // status: "DRAFT",
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            version: true,
            description: true,
          },
        },
        process: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
            documents: {
              include: {
                document: {
                  select: {
                    id: true,
                    name: true,
                    path: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
        draftDocuments: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                type: true,
                path: true,
                tags: true,
              },
            },
            oldDocument: {
              select: {
                id: true,
                name: true,
                path: true,
                type: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    // Format response based on draft type
    if (draft.type === "INITIATE") {
      const response = {
        type: "INITIATE",
        draftId: draft.id,
        workflowId: draft.workflowId,
        workflow: draft.workflow,
        formData: {
          workflowId: draft.workflowId,
          description: draft.description,
          issueNo: draft.issueNo,
          documents: draft.draftDocuments.map((doc) => ({
            documentId: doc.document.id,
            name: doc.document.name,
            type: doc.document.type,
            tags: doc.tags || [],
            partNumber: doc.partNumber,
            description: doc.description,
            issueNo: doc.issueNo,
            preApproved: doc.preApproved,
            // For display in the form - remove filename from path
            documentPath: getDirectoryPath(doc.document.path),
          })),
        },
      };
      return res.status(200).json(response);
    } else if (draft.type === "REOPEN") {
      // Get original process documents for the dropdown
      const originalDocuments =
        draft.process?.documents?.map((doc) => ({
          id: doc.document.id,
          name: doc.document.name,
          path: getDirectoryPath(doc.document.path), // Remove filename from path
          type: doc.document.type,
        })) || [];

      // Get superseded documents from draft data
      const supersededDocumentsFromDraft = draft.supersededDocuments || [];

      console.log(
        "Superseded documents from draft JSON:",
        supersededDocumentsFromDraft,
      );
      console.log("Draft documents from relation:", draft.draftDocuments);

      // Combine draft documents with superseded documents data
      const enhancedSupersededDocuments = supersededDocumentsFromDraft.map(
        (supersededDoc, index) => {
          const draftDoc = draft.draftDocuments[index] || {};

          return {
            isNewDocument: supersededDoc.isNewDocument || false,
            preApproved: supersededDoc.preApproved || false,
            oldDocumentId: supersededDoc.oldDocumentId || null,
            newDocumentId:
              draftDoc.document?.id || supersededDoc.newDocumentId || null,
            uploadedFileName:
              supersededDoc.uploadedFileName || draftDoc.document?.name || "",
            reasonOfSupersed:
              supersededDoc.reasonOfSupersed || draftDoc.reasonOfSupersed || "",
            issueNo: supersededDoc.issueNo || draftDoc.issueNo || "",
            partNumber: supersededDoc.partNumber || draftDoc.partNumber || "",
            fileDescription:
              supersededDoc.fileDescription ||
              supersededDoc.description ||
              draftDoc.description ||
              "",
            tags: supersededDoc.tags || draftDoc.tags || [],
            // Additional information for display
            oldDocumentName: draftDoc.oldDocument?.name || "",
            newDocumentName: draftDoc.document?.name || "",
            documentPath: getDirectoryPath(draftDoc.document?.path) || "", // Remove filename from path
            hasDocumentUploaded: !!draftDoc.document?.id,
          };
        },
      );

      // If no superseded documents in JSON but we have draft documents, create from draft documents
      if (
        enhancedSupersededDocuments.length === 0 &&
        draft.draftDocuments.length > 0
      ) {
        draft.draftDocuments.forEach((draftDoc, index) => {
          enhancedSupersededDocuments.push({
            isNewDocument: draftDoc.isNewDocument || false,
            preApproved: draftDoc.preApproved || false,
            oldDocumentId: draftDoc.oldDocumentId || null,
            newDocumentId: draftDoc.document?.id || null,
            uploadedFileName: draftDoc.document?.name || "",
            reasonOfSupersed: draftDoc.reasonOfSupersed || "",
            issueNo: draftDoc.issueNo || "",
            partNumber: draftDoc.partNumber || "",
            fileDescription: draftDoc.description || "",
            tags: draftDoc.tags || [],
            oldDocumentName: draftDoc.oldDocument?.name || "",
            newDocumentName: draftDoc.document?.name || "",
            documentPath: getDirectoryPath(draftDoc.document?.path) || "", // Remove filename from path
            hasDocumentUploaded: !!draftDoc.document?.id,
          });
        });
      }

      const response = {
        type: "REOPEN",
        draftId: draft.id,
        processId: draft.processId,
        process: draft.process,
        workflowId: draft.process?.workflow?.id,
        storagePath: draft.process?.storagePath,
        originalDocuments: originalDocuments,
        formData: {
          processId: draft.processId,
          issueNo: draft.issueNo, // SOP Issue No
          supersededDocuments: enhancedSupersededDocuments,
        },
      };

      console.log(
        "Returning REOPEN draft response:",
        JSON.stringify(response, null, 2),
      );
      return res.status(200).json(response);
    } else {
      return res.status(400).json({ message: "Invalid draft type" });
    }
  } catch (error) {
    console.error("Error getting draft for editing:", error);
    return res.status(500).json({
      message: "Error getting draft",
      error: error.message,
    });
  }
};
