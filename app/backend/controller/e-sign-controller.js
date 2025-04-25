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

    let branchName = await Department.findOne({
      _id: userData.branch,
    }).select("name");
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

    let documentName = await Document.findOne({
      _id: foundDocument.documentId,
    }).select("name");
    documentName = documentName.name;

    const signature =
      process.steps && process.steps.length > 0
        ? `[${userData.username}(branch-${branchName}, role-${roleName}, Timestamp: ${date}, fileName: ${documentName})]`
        : `[${userData.username}(branch-${branchName}, role-${roleName}, Timestamp: ${date}, fileName: ${documentName})]`;

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
      return res.status(404).json({ message: "Process not found" });
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

    let currentY = availableSpace - 20;

    let signatureCoordinates = {};

    let maxWidth = signatureImageWidth; // Initialize max width to the image width

    // Helper function to calculate and track text width
    const calculateMaxWidth = (text) => {
      const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
      maxWidth = Math.max(maxWidth, textWidth);
    };

    // Check if the content fits on the current page
    if (currentY < requiredHeight) {
      const newPage = pdfDoc.addPage();
      console.log("Adding new page");
      currentY = pageHeight - signatureImageHeight;

      newPage.drawImage(signatureImage, {
        x: 50,
        y: currentY,
        width: signatureImageWidth,
        height: signatureImageHeight,
      });

      currentY -= textPadding;

      newPage.drawText(`Signed By: ${username}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      calculateMaxWidth(`Signed By: ${username}`);

      currentY -= fontSize + textPadding;

      newPage.drawText(`Timestamp: ${timestamp}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      calculateMaxWidth(`Timestamp: ${timestamp}`);

      currentY -= fontSize + textPadding;

      newPage.drawText(`Remarks: ${remarks}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      calculateMaxWidth(`Remarks: ${remarks}`);

      signatureCoordinates = {
        x: 50,
        y: signatureImageHeight - 20 - textPadding,
        width: maxWidth,
        height: requiredHeight,
        newlyAdded: true,
      };
    } else {
      currentY -= signatureImageHeight;

      lastPage.drawImage(signatureImage, {
        x: 50,
        y: currentY,
        width: signatureImageWidth,
        height: signatureImageHeight,
      });

      currentY -= textPadding;

      lastPage.drawText(`Signed By: ${username}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      calculateMaxWidth(`Signed By: ${username}`);

      currentY -= fontSize + textPadding;

      lastPage.drawText(`Timestamp: ${timestamp}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      calculateMaxWidth(`Timestamp: ${timestamp}`);

      currentY -= fontSize + textPadding;

      lastPage.drawText(`Remarks: ${remarks}`, {
        x: 50,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      calculateMaxWidth(`Remarks: ${remarks}`);

      signatureCoordinates = {
        x: 50,
        y: startingY + textPadding,
        width: maxWidth,
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
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { processId, documentId, reason } = req.body;

    const process = await Process.findOne({ _id: processId });

    const workFlowToBeFollowed =
      req.body.workFlowToBeFollowed !== "null" && !req.body.workFlowToBeFollowed
        ? req.body.workFlowToBeFollowed
        : process.workFlow;

    if (!process) {
      return res.status(400).json({ message: "Error getting process" });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(400).json({ message: "Document not found" });
    }

    const documentPath = document.path;
    const absDocumentPath = path.join(__dirname, documentPath);
    const existingPdfBytes = await fs.readFile(absDocumentPath);

    const pythonScriptPath = path.join(
      __dirname,
      "../../support/getFileSpace.py"
    );
    const pythonEnvPath = path.join(__dirname, "../../support/venv/bin/python");

    let scriptOutput;
    try {
      scriptOutput = await executePythonScript(
        pythonEnvPath,
        pythonScriptPath,
        absDocumentPath
      );
    } catch (error) {
      console.error("Error calculating available space:", error);
      scriptOutput = { last_y: "not a number", height: 0 };
    }

    const lastYCoordinate = Number(scriptOutput.last_y);
    const pageHeight = Number(scriptOutput.height);
    const availableSpace = !isNaN(lastYCoordinate)
      ? Math.max(0, pageHeight - lastYCoordinate - 50)
      : 0;

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const lastPageIndex = pages.length - 1;
    const lastPage = pages[lastPageIndex];
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const currentDate = new Date().toLocaleString();
    const branch = await Department.findById(userData.branch).select("name");
    const department = await Department.findById(workFlowToBeFollowed).select(
      "name"
    );
    const role = await Role.findById(userData.role).select("role");

    const rejectionReason = reason || "No reason provided";

    const watermarkLines = [
      `Rejected By: ${userData.username}`,
      `Branch: ${branch.name}`,
      `Department: ${department.name}`,
      `Role: ${role.role}`,
      `Timestamp: ${currentDate}`,
      `Reason: ${rejectionReason}`,
    ];

    const fontSize = 12;
    const lineSpacing = 20;
    const maxLineWidth = lastPage.getWidth() - 100;

    const splitText = (text) => {
      const words = text.split(" ");
      let lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = helveticaFont.widthOfTextAtSize(
          currentLine + " " + word,
          fontSize
        );
        if (width < maxLineWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    let preparedLines = watermarkLines.flatMap(splitText);
    let totalTextHeight = preparedLines.length * lineSpacing;

    let yCoordinate = availableSpace;

    if (yCoordinate < totalTextHeight) {
      const newPage = pdfDoc.addPage();
      yCoordinate = newPage.getHeight() - 50;
      preparedLines.forEach((line, index) => {
        newPage.drawText(line, {
          x: 50,
          y: yCoordinate - index * lineSpacing,
          size: fontSize,
          font: helveticaFont,
          color: rgb(1, 0, 0),
        });
      });
    } else {
      preparedLines.forEach((line, index) => {
        lastPage.drawText(line, {
          x: 50,
          y: yCoordinate - index * lineSpacing,
          size: fontSize,
          font: helveticaFont,
          color: rgb(1, 0, 0),
        });
      });
    }

    const updatedPdfBytes = await pdfDoc.save();
    await fs.writeFile(absDocumentPath, updatedPdfBytes);

    document.isRejected = true;
    document.rejection = {
      reason: rejectionReason,
      rejectedBy: userData._id,
      timestamp: new Date(),
    };
    await document.save();

    process.documents.forEach((doc) => {
      if (doc.documentId.toString() === documentId) {
        doc.rejection = {
          reason: rejectionReason,
          step: {
            work: process.workFlow,
            stepNumber: process.currentStepNumber,
            actorUser: userData._id,
            actorRole: userData.role,
          },
        };
      }
    });
    await process.save();

    const logWork = await LogWork.findOne({
      user: userData._id,
      process: processId,
    });

    if (logWork) {
      logWork.rejectedDocuments.push({
        document: documentId,
        reason: rejectionReason,
      });
      await logWork.save();
    } else {
      const logWorkData = new LogWork({
        process: processId,
        user: userData._id,
        rejectedDocuments: [{ document: documentId, reason: rejectionReason }],
      });
      await logWorkData.save();
    }

    const processResult = await is_process_forwardable(process, userData._id);

    return res.status(200).json({
      message: "Document rejected successfully",
      isForwardable: processResult.isForwardable,
      isRevertable: processResult.isRevertable,
    });
  } catch (error) {
    console.error("Error rejecting document:", error);
    return res.status(500).json({ message: "Error rejecting document" });
  }
};

export const revoke_rejection = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const { processId, documentId } = req.body;

    const process = await Process.findOne({ _id: processId });
    if (!process) {
      return res.status(400).json({
        message: "Error getting process",
      });
    }

    const document = await Document.findById(documentId);
    if (!document || !document.isRejected) {
      return res.status(400).json({
        message: "Document is not rejected or does not exist",
      });
    }

    // Revert PDF changes
    const documentPath = document.path;
    const existingPdfBytes = await fs.readFile(
      path.join(__dirname, documentPath)
    );
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const pages = pdfDoc.getPages();
    const lastPageIndex = pages.length - 1;

    // Check if a watermark/rejection mark is present and remove it
    if (pages.length > 1) {
      // If the rejection mark was added as a new page, remove the last page
      pdfDoc.removePage(lastPageIndex);
    } else {
      // Mask the rejection area
      const lastPage = pages[lastPageIndex];
      lastPage.drawRectangle({
        x: 0,
        y: 0,
        width: lastPage.getWidth(),
        height: 50, // Adjust this height to match the rejection mark area
        color: rgb(1, 1, 1), // White color to mask the area
      });
    }

    const updatedPdfBytes = await pdfDoc.save();
    await fs.writeFile(path.join(__dirname, documentPath), updatedPdfBytes);

    // Revert the rejection in the database
    document.isRejected = false;
    document.rejection = null;
    await document.save();

    // Remove the rejection from the process documents
    process.documents = process.documents.map((doc) => {
      if (doc.documentId.toString() === documentId) {
        doc = doc.toObject(); // Ensure it's a plain object
        delete doc.rejection; // Delete the `rejection` property
      }
      return doc;
    });
    await process.save();

    // Remove the rejection entry from the log
    const logWork = await LogWork.findOne({
      user: new ObjectId(userData._id),
      process: processId,
    });

    if (logWork) {
      logWork.rejectedDocuments = logWork.rejectedDocuments.filter(
        (entry) => entry.document.toString() !== documentId.toString()
      );
      await logWork.save();
    }

    // Check process status
    const processResult = await is_process_forwardable(process, userData._id);

    return res.status(200).json({
      message: "Rejection revoked successfully",
      isForwardable: processResult.isForwardable,
      isRevertable: processResult.isRevertable,
    });
  } catch (error) {
    console.error("Error revoking rejection:", error);
    return res.status(500).json({
      message: "Error revoking rejection",
    });
  }
};
