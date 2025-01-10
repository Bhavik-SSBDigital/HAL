import Document from "../models/document.js";
import { verifyUser } from "../utility/verifyUser.js";
import User from "../models/user.js";
import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFParser,
  PDFName,
  PDFArray,
} from "pdf-lib";
import fs from "fs/promises";
import Process from "../models/process.js";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import Branch from "../models/branch.js";
import Role from "../models/role.js";
import Department from "../models/department.js";
import ProcessAnalytics from "../models/analytics/process-analytics.js";
import { ObjectId } from "mongodb";
import { exec } from "child_process";
import sharp from "sharp";
import LogWork from "../models/logWork.js";
import { promisify } from "util";
import { is_process_forwardable } from "./process-utility-controller.js";
import { get_sign_coordinates_for_specific_step_in_process } from "./sign-handlers/sign-coordinates-handler.js";
import SignCoordinate from "../models/signCoordinates.js";
import { sign } from "crypto";
const execPromise = promisify(exec);

const envVariables = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// DEMO

async function executePythonScript(
  pythonEnvPath,
  pythonScriptPath,
  absDocumentPath
) {
  const command = `${pythonEnvPath} ${pythonScriptPath} "${absDocumentPath}"`;

  try {
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error(`Error output: ${stderr}`);
      throw new Error(stderr);
    }

    // Process the script output
    const scriptOutput = JSON.parse(stdout);

    return scriptOutput;
  } catch (error) {
    console.error(`Error executing script: ${error.message}`);
    throw error;
  }
}

function formatDate(timestamp) {
  // Create a Date object from the timestamp
  const date = new Date(timestamp);

  // Define options for the date part
  const dateOptions = { day: "numeric", month: "short", year: "numeric" };

  // Define options for the time part
  const timeOptions = { hour: "numeric", minute: "numeric", hour12: true };

  // Format the date part
  const datePart = new Intl.DateTimeFormat("en-US", dateOptions).format(date);

  // Format the time part
  const timePart = new Intl.DateTimeFormat("en-US", timeOptions).format(date);

  // Combine the date and time parts
  return `${datePart} at ${timePart}`;
}
export const sign_document = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    let eSignFileName = await User.findOne({ _id: userData._id }).select(
      "signaturePicFileName"
    );
    eSignFileName = eSignFileName.signaturePicFileName;

    if (!eSignFileName) {
      return res
        .status(400)
        .json({ message: "Please upload pic of your signature first" });
    }

    const imagePath = path.join(
      __dirname,
      envVariables.SIGNATURE_FOLDER_PATH,
      eSignFileName
    );

    try {
      await fs.access(imagePath);
    } catch (error) {
      return res
        .status(400)
        .json({ message: "Couldn't find your signature image" });
    }

    const convertToJpeg = async (inputPath) => {
      const metadata = await sharp(inputPath).metadata();

      if (metadata.format === "jpeg") {
        return inputPath;
      }
      const outputFilePath = path.join(
        __dirname,
        envVariables.SIGNATURE_FOLDER_PATH,
        `${userData.username.toLowerCase()}.jpeg`
      );
      await sharp(inputPath).jpeg().toFile(outputFilePath);
      return outputFilePath;
    };

    const jpegImagePath = await convertToJpeg(imagePath);

    const documentId = req.body.documentId;
    const processId = req.body.processId;

    let branchName = await Branch.findOne({ _id: userData.branch }).select(
      "name"
    );
    branchName = branchName.name;

    let roleName = await Role.findOne({ _id: userData.role }).select("role");
    roleName = roleName.role;

    const document = await Document.findById({ _id: documentId });
    const process = await Process.findById({ _id: processId });

    let noOfSigns = 0;
    let currentStepNumber;
    let foundDocument;

    const workFlowToBeFollowed =
      req.body.workFlowToBeFollowed !== "null" && req.body.workFlowToBeFollowed
        ? req.body.workFlowToBeFollowed
        : process.workFlow;

    if (process) {
      const connectorIndex = process.connectors.findIndex((connector) =>
        connector.department.equals(new ObjectId(workFlowToBeFollowed))
      );
      if (process.isInterBranchProcess) {
        if (process.workFlow.equals(new ObjectId(workFlowToBeFollowed))) {
          foundDocument = process.documents.find(
            (doc) => doc.documentId.toString() === documentId
          );
          currentStepNumber = process.currentStepNumber;
        } else {
          if (connectorIndex === -1) {
            throw new Error("Error finding connector");
          } else {
            foundDocument = process.connectors[connectorIndex].documents.find(
              (doc) => doc.documentId.toString() === documentId
            );
            currentStepNumber =
              process.connectors[connectorIndex].currentStepNumber;
          }
        }
      } else {
        foundDocument = process.documents.find(
          (doc) => doc.documentId.toString() === documentId
        );
        currentStepNumber = process.currentStepNumber;
      }

      if (foundDocument) {
        foundDocument.signedBy.push(userData._id);
        noOfSigns = foundDocument.signedBy.length;
      } else {
        return res.status(404).json({
          message:
            "Error signing document as document doesn't exist in process",
        });
      }
    } else {
      return res.status(404).json({
        message:
          "Error signing document as process containing document doesn't exist",
      });
    }

    noOfSigns -= 1;

    if (noOfSigns === -1) {
      return res.status(500).json({ message: "Error signing document" });
    }

    const documentPath = document.path;
    const existingPdfBytes = await fs.readFile(
      path.join(__dirname, documentPath)
    );
    let date = Date.now();
    date = formatDate(date);

    let departmentName;
    if (!(process.steps && process.steps.length)) {
      departmentName = await Department.findOne({
        _id: new ObjectId(workFlowToBeFollowed),
      }).select("name");
      departmentName = departmentName.name;
    }

    let documentName = await Document.findOne({
      _id: foundDocument.documentId,
    }).select("name");
    documentName = documentName.name;

    const signature =
      process.steps && process.steps.length > 0
        ? `[${userData.username}(branch-${branchName}, role-${roleName}, Timestamp: ${date}, fileName: ${documentName})]`
        : `[${userData.username}(branch-${branchName}, department-${departmentName}, role-${roleName}, Timestamp: ${date}, fileName: ${documentName})]`;

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const lastPageIndex = pages.length - 1;
    const lastPage = pages[lastPageIndex];
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let coordinates = await get_sign_coordinates_for_specific_step_in_process(
      foundDocument.documentId,
      currentStepNumber
    );

    const remarks =
      req.body.remarks === "" || !req.body.remarks ? "N/A" : req.body.remarks;

    let newCoordinates = [];

    const pythonScriptPath = path.join(
      __dirname,
      "../../",
      "support",
      "getFileSpace.py"
    );

    const pythonEnvPath = path.join(
      __dirname,
      "../../",
      "support",
      "venv",
      "bin",
      "python"
    );

    if (coordinates.length > 0) {
      const absDocumentPath = path.join(__dirname, documentPath);
      await print_signature_at_coordinates(
        pdfDoc,
        coordinates,
        jpegImagePath,
        userData.username,
        remarks,
        formatDate(Date.now()),
        helveticaFont,
        absDocumentPath,
        documentId,
        userData
      );
    } else {
      const signatureCoordinates =
        await print_signature_after_content_on_the_last_page(
          pdfDoc,
          lastPage,
          documentPath,
          jpegImagePath,
          userData.username,
          formatDate(Date.now()),
          remarks,
          helveticaFont,
          pythonEnvPath,
          pythonScriptPath
        );

      await SignCoordinate.updateOne(
        { docId: documentId },
        {
          $push: {
            coordinates: {
              page: signatureCoordinates.newlyAdded
                ? lastPageIndex + 2
                : lastPageIndex + 1, // Add page number (1-based index)
              x: signatureCoordinates.x,
              y: signatureCoordinates.y,
              width: signatureCoordinates.width,
              height: signatureCoordinates.height,
              stepNo: process.currentStepNumber || 1, // You can adjust this as per your requirement
              isSigned: true,
              signedBy: userData._id, // Ensure to pass the userData object
            },
          },
        },
        { upsert: true }
      );
    }

    await process.save();

    const logWork = await LogWork.findOne({
      user: new ObjectId(userData._id),
      process: new ObjectId(processId),
    });

    if (logWork) {
      const signedDocuments = logWork.signedDocuments || [];
      logWork.signedDocuments = [...signedDocuments, new ObjectId(documentId)];
      await logWork.save();
    } else {
      const logWorkData = {
        process: new ObjectId(processId),
        user: new ObjectId(userData._id),
        signedDocuments: [new ObjectId(documentId)],
      };
      const logWorkDataObj = new LogWork(logWorkData);
      await logWorkDataObj.save();
    }

    const process_result = await is_process_forwardable(process, userData._id);

    return res.status(200).json({
      message: "Document signed successfully",
      isForwardable: process_result.isForwardable,
      isRevertable: process_result.isRevertable,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const revoke_sign = async (req, res, next) => {
  try {
    // Step 1: Validate user and authorization token
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const { documentId, processId } = req.body;

    // Step 2: Find the process and document
    const process = await Process.findById({ _id: processId });
    if (!process) {
      return res.status(404).json({
        message: "Process not found",
      });
    }

    const foundDocument = process.documents.find(
      (doc) => doc.documentId.toString() === documentId
    );

    if (!foundDocument) {
      return res.status(404).json({
        message: "Document not found in process",
      });
    }

    // Step 3: Remove the user from the signedBy array

    const signedIndex = foundDocument.signedBy
      .map((item) => item._id.toString())
      .indexOf(userData._id.toString());
    if (signedIndex === -1) {
      return res.status(400).json({
        message: "User has not signed this document",
      });
    }

    foundDocument.signedBy.splice(signedIndex, 1);

    // Step 4: Locate the document file and reverse changes
    const document = await Document.findById({ _id: documentId });
    const documentPath = path.join(__dirname, document.path);

    const existingPdfBytes = await fs.readFile(documentPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Remove signature from PDF
    const coordinates = await get_sign_coordinates_for_specific_step_in_process(
      foundDocument.documentId,
      process.currentStepNumber
    );

    // Clear signature at specific coordinates
    await clear_signature_at_coordinates(pdfDoc, coordinates, documentId);

    const updatedPdfBytes = await pdfDoc.save();
    await fs.writeFile(documentPath, updatedPdfBytes);

    // Step 5: Update the process document and save changes
    await process.save();

    // Step 6: Update logWork to remove the document from signedDocuments
    const logWork = await LogWork.findOne({
      user: new ObjectId(userData._id),
      process: new ObjectId(processId),
    });

    if (logWork) {
      logWork.signedDocuments = logWork.signedDocuments.filter(
        (docId) => docId.toString() !== documentId
      );
      await logWork.save();
    }

    return res.status(200).json({
      message: "Signature reversed successfully",
    });
  } catch (error) {
    console.error("Error in reverse_sign_document:", error.message);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Helper function to clear signature at specific coordinates
async function clear_signature_at_coordinates(pdfDoc, coordinates, documentId) {
  for (const coord of coordinates) {
    const page = pdfDoc.getPage(coord.page - 1); // Convert 1-based index to 0-based

    // Step 1: Remove annotations (signatures, sticky notes, etc.)
    if (page.node.has(PDFName.of("Annots"))) {
      page.node.set(PDFName.of("Annots"), PDFArray.withContext(pdfDoc.context));
    }

    // Step 2: Mask content by drawing a solid opaque rectangle
    page.drawRectangle({
      x: coord.x - 1, // Expand slightly for better masking
      y: page.getHeight() - coord.y - coord.height - 1,
      width: coord.width + 2,
      height: coord.height + 2,
      color: rgb(1, 1, 1), // White color to match common backgrounds (adjust if needed)
      opacity: 1, // Ensure full opacity
    });
  }

  // Update all coordinates in a single update call
  const updateData = coordinates.map((coord) => ({
    page: coord.page,
    x: coord.x,
    y: coord.y,
  }));

  await SignCoordinate.updateOne(
    { docId: documentId },
    {
      $set: {
        "coordinates.$[coord].isSigned": false,
        "coordinates.$[coord].signedBy": null,
      },
    },
    {
      arrayFilters: [
        {
          "coord.page": { $in: updateData.map((c) => c.page) },
          "coord.x": { $in: updateData.map((c) => c.x) },
          "coord.y": { $in: updateData.map((c) => c.y) },
        },
      ],
      multi: true,
    }
  );
}

async function print_signature_after_content_on_the_last_page(
  pdfDoc,
  lastPage,
  documentPath,
  jpegImagePath,
  username,
  timestamp,
  remarks,
  helveticaFont,
  pythonEnvPath,
  pythonScriptPath
) {
  try {
    console.log("called this mf");
    const absDocumentPath = path.join(__dirname, documentPath);

    // Get the last content's position from the Python script
    const lastContentCoordinates = await executePythonScript(
      pythonEnvPath,
      pythonScriptPath,
      absDocumentPath
    );

    const startingY = lastContentCoordinates.last_y;
    console.log("starting y", startingY);
    const pageHeight = lastContentCoordinates.height;

    const availableSpace = pageHeight - startingY;

    const signatureImageBytes = await fs.readFile(jpegImagePath);
    const signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
    const signatureImageWidth = 200;
    const signatureImageHeight = 75;

    console.log("page height", pageHeight);
    console.log("image height", signatureImageHeight);

    const fontSize = 12;
    const textPadding = 15; // Space between text lines
    const bottomMargin = 70; // Fixed margin from the bottom of the page

    const requiredHeight =
      signatureImageHeight + // Image height
      fontSize +
      textPadding + // Signed By
      fontSize +
      textPadding + // Timestamp
      fontSize +
      textPadding; // Remarks
    // bottomMargin;

    let currentY = availableSpace - 20;

    let signatureCoordinates = {};

    // Check if the content fits on the current page
    if (currentY < requiredHeight) {
      // Add a new page if there's not enough space
      const newPage = pdfDoc.addPage();
      console.log("rcncnkanmkkkkk");
      currentY = pageHeight - signatureImageHeight; // Reset the Y-coordinate
      console.log("current y", currentY);

      // Draw the signature image on the new page
      newPage.drawImage(signatureImage, {
        x: 50,
        y: currentY,
        width: signatureImageWidth,
        height: signatureImageHeight,
      });

      currentY -= textPadding;

      // Draw the text details below the image
      newPage.drawText(`Signed By: ${username}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      currentY -= fontSize + textPadding;

      newPage.drawText(`Timestamp: ${timestamp}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      currentY -= fontSize + textPadding;

      newPage.drawText(`Remarks: ${remarks}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      signatureCoordinates = {
        x: 50,
        y: signatureImageHeight - 20 - textPadding, // Final Y-coordinate after printing the signature
        width: signatureImageWidth,
        height: requiredHeight,
        newlyAdded: true,
      };
    } else {
      console.log("current y", currentY);
      currentY = currentY - signatureImageHeight;
      // Draw the signature image on the last page
      lastPage.drawImage(signatureImage, {
        x: 50,
        y: currentY,
        width: signatureImageWidth,
        height: signatureImageHeight,
      });

      currentY -= textPadding;

      // Draw the text details below the image
      lastPage.drawText(`Signed By: ${username}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      currentY -= fontSize + textPadding;

      lastPage.drawText(`Timestamp: ${timestamp}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      currentY -= fontSize + textPadding;

      lastPage.drawText(`Remarks: ${remarks}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      signatureCoordinates = {
        x: 50,
        y: startingY + textPadding,
        width: signatureImageWidth,
        height: requiredHeight,
      };
    }

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(absDocumentPath, pdfBytes);

    return signatureCoordinates;
  } catch (error) {
    console.error(
      "Error in print_signature_after_content_on_the_last_page:",
      error.message
    );
    throw error;
  }
}

async function print_signature_at_coordinates(
  pdfDoc,
  coordinates,
  jpegImagePath,
  username,
  remarks,
  timestamp,
  helveticaFont,
  absDocumentPath,
  documentId,
  userData
) {
  try {
    console.log("reache wrong mf");
    const signatureImageBytes = await fs.readFile(jpegImagePath);
    const signatureImage = await pdfDoc.embedJpg(signatureImageBytes);

    for (const coord of coordinates) {
      const page = pdfDoc.getPage(coord.page - 1); // Convert to zero-based index
      const { x, y, width, height } = coord;

      // Allocate layout space for image and text
      const imageHeight = height * 0.65; // 65% for image
      const textHeight = height * 0.35; // 35% for text
      const textFontSize = Math.min(10, textHeight / 3); // Adjust font size dynamically
      const textPadding = 2;

      // Draw signature image
      page.drawImage(signatureImage, {
        x: x,
        y: page.getHeight() - y - imageHeight,
        width: width,
        height: imageHeight,
      });

      // Start text just below the image
      let currentTextY = page.getHeight() - y - imageHeight - textPadding;

      // Helper to draw text lines
      function drawTextLine(text) {
        page.drawText(text, {
          x: x + 2, // Slight horizontal padding
          y: currentTextY,
          size: textFontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
          maxWidth: width - 4,
        });
        currentTextY -= textFontSize + textPadding; // Move position for the next line
      }

      // Draw text details
      drawTextLine(`SignedBy: ${username}`);
      drawTextLine(`Remarks: ${remarks}`);
      drawTextLine(`Timestamp: ${timestamp}`);

      // Update database with signature coordinates
      await SignCoordinate.updateOne(
        { docId: documentId },
        {
          $push: {
            coordinates: {
              page: coord.page,
              x: x,
              y: y,
              width: width,
              height: height,
              stepNo: coord.stepNo || 1,
              isSigned: true,
              signedBy: userData._id,
            },
          },
        },
        { upsert: true }
      );
    }

    // Save updated PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(absDocumentPath, pdfBytes);
  } catch (error) {
    console.error("Error in print_signature_at_coordinates:", error.message);
    throw error;
  }
}

export const reject_document = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const processId = req.body.processId;

    const documentId = req.body.documentId;

    const process = await Process.findOne({ _id: processId });

    if (process) {
      let workFlow;

      if (!(process.steps && process.steps.length > 0)) {
        workFlow = await Department.findOne({
          _id:
            req.body.workFlowToBeFollowed !== "null" &&
            req.body.workFlowToBeFollowed
              ? req.body.workFlowToBeFollowed
              : process.workFlow,
        });
      }

      const steps =
        process.steps && process.steps.length > 0
          ? process.steps
          : workFlow.steps;

      let foundDocument;

      if (process.isInterBranchProcess) {
        const connectorIndex = process.connectors.findIndex((connector) =>
          connector.department.equals(
            new ObjectId(req.body.workFlowToBeFollowed)
          )
        );
        if (
          process.workFlow.equals(new ObjectId(req.body.workFlowToBeFollowed))
        ) {
          foundDocument = process.documents.find(
            (doc) => doc.documentId.toString() === documentId
          );
        } else {
          if (connectorIndex === -1) {
            throw new Error("error finding connector");
          } else {
            foundDocument = process.connectors[connectorIndex].documents.find(
              (doc) => doc.documentId.toString() === documentId
            );
          }
        }
      } else {
        foundDocument = process.documents.find(
          (doc) => doc.documentId.toString() === documentId
        );
      }

      // const foundDocument = process.documents.find(
      //   (doc) => doc.documentId.toString() === documentId
      // );

      const updatedDocument = await Document.findByIdAndUpdate(
        foundDocument.documentId,
        { isRejected: true }
      );

      const targetStep =
        !process.isInterBranchProcess ||
        process.workFlow.equals(new ObjectId(req.body.workFlowToBeFollowed))
          ? steps[process.lastStepDone]
          : steps[process.connectors[connectorIndex].lastStepDone];

      const actorRole = await User.findOne({ _id: userData._id }).select(
        "role"
      );

      const wantedStepNumber =
        !process.isInterBranchProcess ||
        process.workFlow.equals(new ObjectId(req.body.workFlowToBeFollowed))
          ? process.currentStepNumber
          : process.connectors[connectorIndex].currentStepNumber;

      if (foundDocument) {
        foundDocument.rejection = {
          reason: req.body.reason,
          step: {
            work: targetStep.work,
            stepNumber: wantedStepNumber,
            actorUser: new ObjectId(userData._id),
            actorRole: actorRole.role,
          },
        }; // Push the new user ID to the signedBy array

        if (
          process.isInterBranchProcess &&
          !process.workFlow.equals(new ObjectId(req.body.workFlowToBeFollowed))
        ) {
          process.markModified(`connectors.${connectorIndex}.documents`);
        } else {
          process.markModified("documents");
        }

        await process.save(); // Save the updated process document

        let currentDate = new Date();

        currentDate.setHours(0, 0, 0, 0);

        // Check if the document exists
        let processAnalytics = await ProcessAnalytics.findOne({
          date: currentDate,
        });

        let documentDetailsIfAddedForTheFirstTime = [];

        documentDetailsIfAddedForTheFirstTime.push({
          workName: foundDocument.workName,
          documentsReverted: [documentId],
        });

        try {
          if (processAnalytics) {
            if (processAnalytics.documentDetails) {
              const workNameIndex = processAnalytics.documentDetails.findIndex(
                (work) => work.workName === foundDocument.workName
              );
              if (workNameIndex !== -1) {
                processAnalytics.documentDetails[
                  workNameIndex
                ].documentsReverted =
                  processAnalytics.documentDetails[workNameIndex]
                    .documentsReverted || [];

                processAnalytics.documentDetails[
                  workNameIndex
                ].documentsReverted.push(documentId);
              } else {
                processAnalytics.documentDetails.push({
                  workName: foundDocument.workName,
                  documentsReverted: [documentId],
                });
              }
              // processAnalytics.documentDetails = processAnalytics.documentDetails;
            } else {
              processAnalytics.documentDetails =
                documentDetailsIfAddedForTheFirstTime;
            }

            // Document found, update the counts
            let departmentIndex = -1;

            try {
              departmentIndex =
                processAnalytics.departmentsPendingProcess.findIndex(
                  (department) =>
                    department.department.equals(new ObjectId(process.workFlow))
                );
            } catch (error) {
              console.log("faulty entry in departmentsPendingProcesses");
            }

            if (departmentIndex !== -1) {
              let documentDetailsOfDepartment =
                processAnalytics.departmentsPendingProcess[departmentIndex]
                  .documentDetails;
              if (documentDetailsOfDepartment) {
                const workNameIndex = documentDetailsOfDepartment.findIndex(
                  (work) => work.workName === foundDocument.workName
                );
                if (workNameIndex !== -1) {
                  documentDetailsOfDepartment[workNameIndex].documentsReverted =
                    documentDetailsOfDepartment[workNameIndex]
                      .documentsReverted || [];

                  documentDetailsOfDepartment[
                    workNameIndex
                  ].documentsReverted.push(documentId);
                } else {
                  documentDetailsOfDepartment.push({
                    workName: foundDocument.workName,
                    documentsReverted: [documentId],
                  });
                }
                processAnalytics.departmentsPendingProcess[
                  departmentIndex
                ].documentDetails = documentDetailsOfDepartment;
              } else {
                processAnalytics.departmentsPendingProcess[
                  departmentIndex
                ].documentDetails = documentDetailsIfAddedForTheFirstTime;
              }
            } else {
              // If the department is not found, add it with an initial count of 1
              // processAnalytics.noOfPendingProcess += 1;
              processAnalytics.departmentsPendingProcess.push({
                department: req.body.workFlow || process.workFlow,
                documentDetails: documentDetailsIfAddedForTheFirstTime,
              });
            }

            // Save the updated document back to the database

            await processAnalytics.save();
          } else {
            let newProcessAnalytics = new ProcessAnalytics({
              date: new Date(),
              documentDetails: documentDetailsIfAddedForTheFirstTime,
              departmentsPendingProcess: [
                {
                  department: req.body.workFlow || process.workFlow,
                  documentDetails: documentDetailsIfAddedForTheFirstTime,
                },
              ],
            });

            await newProcessAnalytics.save();
          }
        } catch (error) {
          console.log("error updating process analytics", error);
        }
      }

      const logWork = await LogWork.findOne({
        user: new ObjectId(userData._id),
        process: new ObjectId(processId),
      });

      if (logWork) {
        const rejectedDocuments = logWork.rejectedDocuments || [];
        logWork.rejectedDocuments = [
          ...rejectedDocuments,
          { document: new ObjectId(documentId), reason: req.body.reason },
        ];
        await logWork.save();
      } else {
        const logWorkData = {
          process: new ObjectId(processId),
          user: new ObjectId(userData._id),
          rejectedDocuments: [
            { document: new ObjectId(documentId), reason: req.body.reason },
          ],
        };

        const logWorkDataObj = new LogWork(logWorkData);
        await logWorkDataObj.save();
      }
    } else {
      return res.status(400).json({
        message: "error getting process",
      });
    }

    const process_result = await is_process_forwardable(process, userData._id);

    return res.status(200).json({
      message: "rejected document successfully",
      isForwardable: process_result.isForwardable,
      isRevertable: process_result.isRevertable,
    });
  } catch (error) {
    console.log(error, "error rejecting document");
    return res.status(500).json({
      message: "error rejecting document",
    });
  }
};
