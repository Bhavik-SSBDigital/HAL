import Document from "../models/document.js";
import { verifyUser } from "../utility/verifyUser.js";
import User from "../models/user.js";
import { PDFDocument, rgb, StandardFonts, PDFParser } from "pdf-lib";
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
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let eSignFileName = await User.findOne({ _id: userData._id }).select(
      "signaturePicFileName"
    );
    eSignFileName = eSignFileName.signaturePicFileName;

    if (!eSignFileName) {
      return res.status(400).json({
        message: "please upload pic of your signature first",
      });
    }

    const imagePath = path.join(
      __dirname,
      envVariables.SIGNATURE_FOLDER_PATH,
      eSignFileName
    );

    try {
      await fs.access(imagePath);
    } catch (error) {
      console.log("error finding document", error);
      return res.status(400).json({
        message: "couldn't find your signature image",
      });
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

    let foundDocument;
    if (process) {
      const connectorIndex = process.connectors.findIndex((connector) =>
        connector.department.equals(new ObjectId(req.body.workFlowToBeFollowed))
      );
      if (process.isInterBranchProcess) {
        if (
          process.workFlow.equals(new ObjectId(req.body.workFlowToBeFollowed))
        ) {
          foundDocument = process.documents.find(
            (doc) => doc.documentId.toString() === documentId
          );

          const ids = process.documents.map((item) =>
            item.documentId.toString()
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

      if (foundDocument) {
        foundDocument.signedBy.push(userData._id); // Push the new user ID to the signedBy array
        noOfSigns = foundDocument.signedBy.length;
        // Save the updated process document
      } else {
        return res.status(400).json({
          message: "error signing document as document doesn't exist",
        });
      }
    } else {
      return res.status(400).json({
        message:
          "error signing document as process containing document doesn't exist",
      });
    }

    noOfSigns -= 1;

    if (noOfSigns == -1) {
      return res.status(500).json({
        message: "error signing document",
      });
    }

    const documentPath = document.path;
    const existingPdfBytes = await fs.readFile(
      path.join(__dirname, documentPath)
    );
    let date = Date.now();
    date = formatDate(date);

    let departmentName = await Department.findOne({
      _id: new ObjectId(req.body.workFlowToBeFollowed),
    }).select("name");
    departmentName = departmentName.name;

    let documentName = await Document.findOne({
      _id: foundDocument.documentId,
    }).select("name");
    documentName = documentName.name;
    const signature = `[${userData.username}(branch-${branchName}, department-${departmentName}, role-${roleName}, Timestamp: ${date}, fileName: ${documentName} )]`;
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const lastPageIndex = pages.length - 1;
    const lastPage = pages[lastPageIndex];
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pythonScriptPath = path.join(
      __dirname,
      "../../",
      "support",
      "getFileSpace.py"
    );
    const absDocumentPath = path.join(__dirname, documentPath);

    const pythonEnvPath = path.join(
      __dirname,
      "../../",
      "support",
      "newenv",
      "bin",
      "python"
    );

    const command = `${pythonEnvPath} ${pythonScriptPath} "${absDocumentPath}"`;

    let scriptOutput;

    try {
      scriptOutput = await executePythonScript(
        pythonEnvPath,
        pythonScriptPath,
        absDocumentPath
      );
    } catch (error) {
      scriptOutput = "not a number";
    }

    let num = Number(scriptOutput.last_y);

    let page_height = Number(scriptOutput.height);

    page_height =
      typeof num === "number" && !isNaN(num)
        ? page_height
        : lastPage.getHeight();

    // num = (lastPage.getHeight() * num) / 100;

    const bottomMargin =
      // typeof Number(scriptOutput) === "number"
      typeof num === "number" && !isNaN(num)
        ? num > page_height
          ? 0
          : page_height - num - 70
        : 0;

    const availableSpace = bottomMargin;

    const signatureImagePath = jpegImagePath;
    const signatureImageBytes = await fs.readFile(signatureImagePath);
    const signedByTitle = "Signed By :";
    const signedByTitleFontSize = 12;
    const signedByTitleWidth = helveticaFont.widthOfTextAtSize(
      signedByTitle,
      signedByTitleFontSize
    );
    const signatureImageWidth = 200;
    const distanceFromSignedByTitle = 10; // Reduced the gap
    const signatureImage = await pdfDoc.embedJpg(signatureImageBytes);

    const splitText = (text, font, fontSize, maxWidth) => {
      const words = text.split(" ");
      let lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = font.widthOfTextAtSize(
          currentLine + " " + word,
          fontSize
        );
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    const textLines = splitText(
      signature,
      helveticaFont,
      12,
      lastPage.getWidth() - 100
    );

    const drawTextWithUnderline = (page, text, x, y, font, fontSize) => {
      page.drawText(text, {
        x: x,
        y: y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      page.drawLine({
        start: { x: x, y: y - 5 },
        end: { x: x + font.widthOfTextAtSize(text, fontSize), y: y - 5 },
        color: rgb(0, 0, 0),
        thickness: 1,
      });
    };

    let yCoordinate = availableSpace;

    if (yCoordinate < 70) {
      const newPage = pdfDoc.addPage();
      yCoordinate = newPage.getHeight() - 70;
      newPage.drawText(signedByTitle, {
        x: 50,
        y: yCoordinate - 15,
        size: signedByTitleFontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      newPage.drawImage(signatureImage, {
        x: distanceFromSignedByTitle + signedByTitleWidth,
        y: yCoordinate,
        width: signatureImageWidth,
        height: 50,
      });

      textLines.forEach((line, index) => {
        drawTextWithUnderline(
          newPage,
          line,
          50, // Adjusted the x-coordinate to start from the left margin
          yCoordinate - 15 - (index + 1) * 20,
          helveticaFont,
          12
        );
      });
    } else {
      lastPage.drawText(signedByTitle, {
        x: 50,
        y: yCoordinate - 15,
        size: signedByTitleFontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      lastPage.drawImage(signatureImage, {
        x: distanceFromSignedByTitle + signedByTitleWidth,
        y: yCoordinate,
        width: signatureImageWidth,
        height: 50,
      });

      textLines.forEach((line, index) => {
        drawTextWithUnderline(
          lastPage,
          line,
          50, // Adjusted the x-coordinate to start from the left margin
          yCoordinate - 15 - (index + 1) * 20,
          helveticaFont,
          12
        );
      });
    }

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(absDocumentPath, pdfBytes);

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

    return res.status(200).json({
      message: "document signed successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

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
      const workFlow = await Department.findOne({
        _id: req.body.workFlowToBeFollowed
          ? req.body.workFlowToBeFollowed
          : process.workFlow,
      });

      const steps = workFlow.steps;

      let foundDocument;
      const connectorIndex = process.connectors.findIndex((connector) =>
        connector.department.equals(new ObjectId(req.body.workFlowToBeFollowed))
      );
      if (process.isInterBranchProcess) {
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
          noOfRejectedDocuments: 1,
        });

        try {
          if (processAnalytics) {
            if (processAnalytics.documentDetails) {
              const workNameIndex = processAnalytics.documentDetails.findIndex(
                (work) => work.workName === foundDocument.workName
              );
              if (workNameIndex !== -1) {
                if (
                  processAnalytics.documentDetails[workNameIndex]
                    .noOfRejectedDocuments
                ) {
                  processAnalytics.documentDetails[
                    workNameIndex
                  ].noOfRejectedDocuments += 1;
                } else {
                  processAnalytics.documentDetails[
                    workNameIndex
                  ].noOfRejectedDocuments = 1;
                }
              } else {
                processAnalytics.documentDetails.push({
                  workName: foundDocument.workName,
                  noOfRejectedDocuments: 1,
                });
              }
              // processAnalytics.documentDetails = processAnalytics.documentDetails;
            } else {
              processAnalytics.documentDetails =
                documentDetailsIfAddedForTheFirstTime;
            }

            // Document found, update the counts
            const departmentIndex =
              processAnalytics.departmentsPendingProcess.findIndex(
                (department) =>
                  department.department.equals(new ObjectId(process.workFlow))
              );

            if (departmentIndex !== -1) {
              let documentDetailsOfDepartment =
                processAnalytics.departmentsPendingProcess[departmentIndex]
                  .documentDetails;
              if (documentDetailsOfDepartment) {
                const workNameIndex = documentDetailsOfDepartment.findIndex(
                  (work) => work.workName === foundDocument.workName
                );
                if (workNameIndex !== -1) {
                  if (
                    documentDetailsOfDepartment[workNameIndex]
                      .noOfRejectedDocuments
                  ) {
                    documentDetailsOfDepartment[
                      workNameIndex
                    ].noOfRejectedDocuments += 1;
                  } else {
                    documentDetailsOfDepartment[
                      workNameIndex
                    ].noOfRejectedDocuments = 1;
                  }
                } else {
                  documentDetailsOfDepartment.push({
                    workName: foundDocument.workName,
                    noOfRejectedDocuments: 1,
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
                department: req.body.workFlow,
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
                  department: req.body.workFlow,
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

    return res.status(200).json({
      message: "rejected document successfully",
    });
  } catch (error) {
    console.log(error, "error rejecting document");
    return res.status(500).json({
      message: "error rejecting document",
    });
  }
};
