import fs from "fs/promises";
import { createWriteStream, createReadStream, read } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, normalize } from "path";
import fsCB from "fs";
import path from "path";
import { Transform } from "stream";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { verifyUser } from "../utility/verifyUser.js";
import Document from "../models/document.js";
import User from "../models/user.js";
import Role from "../models/role.js";
import archiver from "archiver";
import { promisify } from "util";
import { pipeline } from "stream";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Department from "../models/department.js";

const pipelineAsync = promisify(pipeline);
// Now you can access the desired functions

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getContentTypeFromExtension(extension) {
  const mimeTypes = {
    txt: "text/plain",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    tar: "application/x-tar",
    // Add more mappings for other file types as needed
  };

  return mimeTypes[extension] || "application/octet-stream"; // Default to generic binary if extension not found
}

const STORAGE_PATH = process.env.STORAGE_PATH;

export const file_upload = async (req, res) => {
  try {
    const accessToken = req.headers["x-authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    // const hash = createHash('sha256');
    const fileName = decodeURIComponent(req.headers["x-file-name"]);
    const chunkNumber = parseInt(req.headers["x-current-chunk"]);
    const totalChunks = parseInt(req.headers["x-total-chunks"]);
    const chunkSize = parseInt(req.headers["x-chunk-size"]);
    let isInvolvedInProcess = req.headers["x-involved-in-process"];
    let departmentName = req.headers["x-department-name"];
    let workName = req.headers["x-work-name"];
    let cabinetNo = req.headers["x-cabinet-no"];
    let year = req.headers["x-year"];

    isInvolvedInProcess =
      isInvolvedInProcess === "undefined" || undefined
        ? false
        : isInvolvedInProcess;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const fileExtension = fileName.split(".").pop();
    let extra = req.headers["x-file-path"];
    extra = extra.substring(2);
    // const relativePath = '../../../../storage' + req.headers["x-file-path"] + `/${fileName}`
    // const saveTo = path.join(__dirname, req.headers["x-file-path"], fileName);
    let relativePath = process.env.STORAGE_PATH + extra;
    const saveTo = path.join(__dirname, relativePath, fileName);
    relativePath = relativePath + `/${fileName}`;

    const parts = req.headers.range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", chunkSize);
    res.setHeader("Content-Type", getContentTypeFromExtension(fileExtension));

    if (chunkNumber === 0) {
      try {
        await fs.access(saveTo);
        return res.status(409).json({
          message: "file already exists at given path",
        });
      } catch (error) {
        const writableStream = fsCB.createWriteStream(saveTo, {
          flags: "a+", // Append mode
          start: start,
          end: end,
        });

        req.pipe(writableStream);

        writableStream.on("finish", async () => {
          // const finalHash = hash.digest('hex');
          const newDocumentId = await storeDocumentDetailsToDatabase(
            fileName,
            "file",
            relativePath,
            userData,
            false,
            isInvolvedInProcess,
            cabinetNo,
            workName,
            year,
            departmentName
          );
          await createUserPermissions(newDocumentId, userData.username, true);
          const parts = relativePath.split("/");
          const parentPath = parts.slice(0, -1).join("/");

          await storeChildIdInParentDocument(parentPath, newDocumentId);
          if (chunkNumber === totalChunks - 1) {
            return res.status(200).json({
              message: "File upload completed.",
              documentId: newDocumentId,
            });
          } else {
            return res.status(200).json({
              message: "Chunk received successfully.",
              hash: "finalHash",
            });
          }
        });

        writableStream.on("error", (err) => {
          console.error("Error writing the file:", err);
          return res.status(500).send("Error writing the file.");
        });
      }
    } else {
      const writableStream = fsCB.createWriteStream(saveTo, {
        flags: "a+", // Append mode
        start: chunkNumber * chunkSize,
        end: end,
      });
      req.pipe(writableStream);

      writableStream.on("finish", async () => {
        // const finalHash = hash.digest('hex');
        // const newDocumentId = await storeDocumentDetailsToDatabase(
        //   fileName,
        //   "file",
        //   relativePath,
        //   userData,
        //   false
        // );
        // await createUserPermissions(newDocumentId, userData.username, true);
        // const parts = relativePath.split("/");
        // const parentPath = parts.slice(0, -1).join("/");
        // await storeChildIdInParentDocument(parentPath, newDocumentId);

        if (chunkNumber === totalChunks - 1) {
          return res.status(200).json({
            message: "File upload completed.",
            hash: "finalHash",
          });
        } else {
          return res.status(200).json({
            message: "Chunk received successfully.",
            // documentId: newDocumentId,
          });
        }
      });

      writableStream.on("error", (err) => {
        console.error("Error writing the file:", err);
        res.status(500).send("Error writing the file.");
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Error.");
  }
};

export const file_download = async (req, res) => {
  try {
    const accessToken = req.headers["x-authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    let extra = decodeURIComponent(req.headers["x-file-path"]);
    let relativePath = process.env.STORAGE_PATH + extra.substring(2);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const fileName = decodeURIComponent(req.headers["x-file-name"]);
    const filePath = join(__dirname, relativePath, `${fileName}`); // Replace with your file path

    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const fileExtension = fileName.split(".").pop();

    if (range === "bytes=0-0") {
      res.setHeader("content-type", getContentTypeFromExtension(fileExtension));
      res.setHeader("access-control-expose-headers", "Content-Range");
      return res.status(206).json({
        fileSize: fileSize,
        msg: "hello bro",
      });
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // const fileDescriptor = await fs.open(filePath, 'r')
      const fileStream = fsCB.createReadStream(filePath, { start, end });

      res.setHeader("content-type", getContentTypeFromExtension(fileExtension));
      res.setHeader("access-control-expose-headers", "Content-Range");

      let bytesWritten = 0;

      fileStream.on("data", (chunk) => {
        bytesWritten += chunk.length;
      });

      fileStream.on("end", () => {});

      fileStream.pipe(res);
    } else {
      res.setHeader("access-control-expose-headers", "Content-Range");
      res.setHeader("content-type", getContentTypeFromExtension(fileExtension));
      // const fileDescriptor = await fs.open(filePath, 'r');
      fsCB.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "error downloading file",
    });
  }
};

export const create_folder = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const isProject = req.body.isProject;
    const path_ = req.body.path;

    const statusCode = await creatFolder(isProject, path_, userData);

    if (statusCode === 409) {
      return res.status(409).json({
        message: "folder already exists",
      });
    }

    if (statusCode === 200) {
      return res.status(200).json({
        message: "folder created successfully",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "error creating a folder",
    });
  }
};

export const creatFolder = async (isProject, path_, userData) => {
  try {
    try {
      await fs.access(
        path.join(__dirname, process.env.STORAGE_PATH, path_.substring(2))
      );
      return 409;
    } catch (error) {
      // setting up the document details to store in database

      let pathOrigin = process.env.STORAGE_PATH;
      const type = "folder";
      const createdBy = userData.username;
      const createdOn = Date.now();
      for (const element of path_.split("/").slice(1)) {
        // path.split('/').slice(1).forEach(async element => {
        let pathToBeChecked;
        try {
          pathToBeChecked = pathOrigin + `/${element}`;
          const name = pathToBeChecked.split("/").pop();
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          const absolute_pathToBeChecked = path.join(
            __dirname,
            pathToBeChecked
          );
          await fs.access(absolute_pathToBeChecked);
          pathOrigin += `/${element}`;
        } catch (error) {
          if (error.code === "ENOENT") {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const absolute_pathToBeChecked = path.join(
              __dirname,
              pathToBeChecked
            );
            await fs.mkdir(absolute_pathToBeChecked);
            const newDocumentId = await storeDocumentDetailsToDatabase(
              element,
              type,
              pathToBeChecked,
              userData,
              isProject
            );
            await createUserPermissions(newDocumentId, userData.username, true);
            await storeChildIdInParentDocument(pathOrigin, newDocumentId);
            pathOrigin += `/${element}`;
          } else {
            throw error;
          }
        }
      }

      return 200;
    }
  } catch (error) {
    console.log("error creating folder", error);
    throw new Error(error);
  }
};

// export const file_copy = async (req, res) => {
//   try {
//     const accessToken = req.headers["authorization"].substring(7);
//     const userData = await verifyUser(accessToken);
//     if (userData === "Unauthorized") {
//       return res.status(401).json({
//         message: "Unauthorized request",
//       });
//     }

//     const bufferSize = 1024 * 1024; // 1 MB buffer size
//     const sourcePath =
//       process.env.STORAGE_PATH + req.body.sourcePath.substring(2);
//     const destinationPathParent =
//       process.env.STORAGE_PATH + req.body.destinationPath.substring(2);
//     const name = req.body.name;
//     const destinationPath = destinationPathParent + `/${name}`;
//     const absoluteSourcePath = path.join(__dirname, sourcePath);
//     const absoluteDestinationPath = path.join(__dirname, destinationPath);
//     const absoluteSignedPath = path.join(__dirname, "signed3.pdf");
//     const sourceStream = createReadStream(absoluteSourcePath, {
//       highWaterMark: bufferSize,
//     });
//     const destinationStream = createWriteStream(absoluteDestinationPath, {
//       highWaterMark: bufferSize,
//     });

//     sourceStream.on("error", (error) => {
//       console.log("error", error);
//       res.status(500).json({
//         message: "Error copying file",
//       });
//     });

//     destinationStream.on("error", (error) => {
//       console.log("error", error);
//       res.status(500).json({
//         message: "Error copying file",
//       });
//     });

//     destinationStream.on("finish", async () => {
//       try {
//         const existingPdfBytes = await fs.readFile(
//           path.join(__dirname, "signed2.pdf")
//         );
//         const pdfDoc = await PDFDocument.load(existingPdfBytes);
//         const pages = pdfDoc.getPages();
//         const lastPageIndex = pages.length - 1;
//         // Get the first page
//         const lastPage = pages[lastPageIndex];

//         // Add signature to the first page
//         const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

//         const bottomMargin = 50; // Adjust as needed for bottom margin
//         const allocatedHeightForSignature = 100;
//         const textWidth = helveticaFont.widthOfTextAtSize(
//           "Signature: Vinamra sir",
//           12
//         );
//         const textHeight = 12; // Adjust the font size as needed
//         // const xCoordinate = (lastPage.getWidth() - textWidth) / 2;
//         const yCoordinate = bottomMargin + textHeight * 1; // Adjust as needed
//         lastPage.drawText("Signature: Vinamra sir", {
//           x: 50,
//           y: yCoordinate,
//           size: 12,
//           font: helveticaFont,
//           color: rgb(0, 0, 0),
//         });

//         // Save the modified PDF with the added signature
//         const modifiedPdfBytes = await pdfDoc.save();
//         await fs.writeFile(
//           path.join(__dirname, "signed2.pdf"),
//           modifiedPdfBytes
//         );

//         const doc_Id = await storeDocumentDetailsToDatabase(
//           name,
//           "file",
//           destinationPath,
//           userData,
//           false
//         );
//         await createUserPermissions(doc_Id, userData.username, false);
//         await storeChildIdInParentDocument(destinationPathParent, doc_Id);

//         // const doc_Id_ = await storeDocumentDetailsToDatabase(
//         //   name,
//         //   "file",
//         //   absoluteSignedPath,
//         //   userData,
//         //   false
//         // );
//         // await createUserPermissions(doc_Id_, userData.username, false);
//         // await storeChildIdInParentDocument(destinationPathParent, doc_Id_);
//         res.status(200).json({
//           message: "File copied successfully",
//         });
//       } catch (error) {
//         console.error("Error:", error);
//         res.status(500).json({
//           message: "Error copying file",
//         });
//       }
//     });

//     sourceStream.pipe(destinationStream);
//   } catch (error) {
//     console.error("Error copying file:", error);
//     res.status(500).json({
//       message: "Error copying file",
//     });
//   }
// };

export const file_copy = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const bufferSize = 1024 * 1024; // 1 MB buffer size
    const sourcePath =
      process.env.STORAGE_PATH + req.body.sourcePath.substring(2);
    const destinationPathParent =
      process.env.STORAGE_PATH + req.body.destinationPath.substring(2);
    const name = req.body.name;
    const destinationPath = destinationPathParent + `/${name}`;
    const absoluteSourcePath = path.join(__dirname, sourcePath);
    const absoluteDestinationPath = path.join(__dirname, destinationPath);

    const sourceStream = createReadStream(absoluteSourcePath, {
      highWaterMark: bufferSize,
    });
    const destinationStream = createWriteStream(absoluteDestinationPath, {
      highWaterMark: bufferSize,
    });

    sourceStream.on("error", (error) => {
      console.log("error", error);
      res.status(500).json({
        message: "Error copying file",
      });
    });

    destinationStream.on("error", (error) => {
      console.log("error", error);
      res.status(500).json({
        message: "Error copying file",
      });
    });

    destinationStream.on("finish", async () => {
      try {
        const doc_Id = await storeDocumentDetailsToDatabase(
          name,
          "file",
          destinationPath,
          userData,
          false
        );
        await createUserPermissions(doc_Id, userData.username, false);
        await storeChildIdInParentDocument(destinationPathParent, doc_Id);

        res.status(200).json({
          message: "File copied successfully",
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
          message: "Error copying file",
        });
      }
    });

    sourceStream.pipe(destinationStream);
  } catch (error) {
    console.error("Error copying file:", error);
    res.status(500).json({
      message: "Error copying file",
    });
  }
};

export const file_cut = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const bufferSize = 1024 * 1024; // 1 MB buffer size
    const sourcePath =
      process.env.STORAGE_PATH + req.body.sourcePath.substring(2);
    const destinationPathParent =
      process.env.STORAGE_PATH + req.body.destinationPath.substring(2);
    const name = req.body.name;
    const destinationPath = destinationPathParent + `/${name}`;
    const absoluteSourcePath = path.join(__dirname, sourcePath);
    const absoluteDestinationPath = path.join(__dirname, destinationPath);

    const sourceStream = createReadStream(absoluteSourcePath, {
      highWaterMark: bufferSize,
    });
    const destinationStream = createWriteStream(absoluteDestinationPath, {
      highWaterMark: bufferSize,
    });

    sourceStream.on("error", (error) => {
      console.log("error", error);
      res.status(500).json({
        message: "Error copying file",
      });
    });

    destinationStream.on("error", (error) => {
      console.log("error", error);
      res.status(500).json({
        message: "Error copying file",
      });
    });

    destinationStream.on("finish", async () => {
      try {
        const doc_Id = await storeDocumentDetailsToDatabase(
          name,
          "file",
          destinationPath,
          userData,
          false
        );
        await createUserPermissions(doc_Id, userData.username, false);
        await storeChildIdInParentDocument(destinationPathParent, doc_Id);

        const oldDocument = await Document.findOne(
          { path: sourcePath },
          { _id: 1 }
        );

        // removing oldDocument id from children property of Document instances
        const idToRemove = oldDocument._id; // Replace with the actual ID to remove
        await documentIdCleanUpFromDocument(idToRemove);
        await documentIdCleanUpFromUser(idToRemove);
        await documentIdCleanUpFromRole(idToRemove);
        await fs.unlink(absoluteSourcePath);
        await Document.findByIdAndDelete({ _id: idToRemove });
        res.status(200).json({
          message: "File cut successfully",
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
          message: "Error cut file",
        });
      }
    });

    sourceStream.pipe(destinationStream);
  } catch (error) {
    console.error("Error cut file:", error);
    res.status(500).json({
      message: "Error cut file",
    });
  }
};

export const documentIdCleanUpFromDocument = async (idToRemove) => {
  let filter = { children: idToRemove };
  let update = { $pull: { children: idToRemove } };

  // Update all documents that contain the ID in their children array
  await Document.updateMany(filter, update);
};

export const documentIdCleanUpFromUser = async (idToRemove) => {
  let filter = {
    $or: [
      { readable: idToRemove },
      { writable: idToRemove },
      { downloadable: idToRemove },
    ],
  };

  let update = {
    $pullAll: {
      readable: [idToRemove],
      writable: [idToRemove],
      downloadable: [idToRemove],
    },
  };

  // Update all users that contain the ID in any of the arrays
  await User.updateMany(filter, update);
};

export const documentIdCleanUpFromRole = async (idToRemove) => {
  let filter = {
    $or: [
      { readable: idToRemove },
      { writable: idToRemove },
      { downloadable: idToRemove },
      { fullAccessDownloadable: idToRemove },
      { fullAccessReadable: idToRemove },
    ],
  };

  let update = {
    $pullAll: {
      readable: [idToRemove],
      writable: [idToRemove],
      downloadable: [idToRemove],
      fullAccessDownloadable: [idToRemove],
      fullAccessReadable: [idToRemove],
    },
  };

  // Update all roles that contain the ID in any of the arrays
  await Role.updateMany(filter, update);
};

// export const file_cut = async (req,res) =>{

//   const accessToken = req.headers['authorization'].substring(7);
//
//   const userData = await verifyUser(accessToken);
//
//   if(userData === "Unauthorized"){
//     return res.status(401).json({
//         message: "Unauthorized request"
//     })
//   }

//   const bufferSize = 1024 * 1024 // 1 MB buffer size
//   let sourcePath = process.env.STORAGE_PATH + req.body.sourcePath.substring(2);
//   let destinationPathParent = process.env.STORAGE_PATH + req.body.destinationPath.substring(2);
//   let name = req.body.name;
//   let destinationPath = destinationPathParent + `/${name}`;
//   let absoluteSourcePath = path.join(__dirname, sourcePath);
//   let absoluteDestinationPath = path.join(__dirname, destinationPath)
//   try {
//     const sourceStream = createReadStream(absoluteSourcePath, {
//       highWaterMark: bufferSize, // Set custom buffer size for read stream
//     });
//     const destinationStream = createWriteStream(absoluteDestinationPath, {
//       highWaterMark: bufferSize, // Set custom buffer size for write stream
//     });

//     await Promise.all([
//       new Promise((resolve, reject) => {
//         sourceStream.on("error", (error) => {
//           reject(error);
//         });
//         sourceStream.on("end", () => {
//           resolve();
//         });
//       }),

//       new Promise((resolve, reject) => {
//         destinationStream.on("error", (error) => {
//           reject(error);
//         });
//         destinationStream.on("finish", async() => {
//           try {
//             const doc_Id = await storeDocumentDetailsToDatabase(name, "file", destinationPath, userData, false)
//             await createUserPermissions(doc_Id, userData.username, false);
//             await storeChildIdInParentDocument(destinationPathParent, doc_Id);
//

//             const oldDocument = await Document.findOne({ path: sourcePath }, { _id: 1 });

//             // removing oldDocument id from children property of Document instances
//             const idToRemove = oldDocument._id; // Replace with the actual ID to remove
//             let filter = { children: idToRemove };
//             let update = { $pull: { children: idToRemove } };

//             // Update all documents that contain the ID in their children array
//             await Document.updateMany(filter, update);

//             filter = {
//               $or: [
//                 { readable: idToRemove },
//                 { writable: idToRemove },
//                 { downloadable: idToRemove },
//               ],
//             };

//             update = {
//               $pullAll: {
//                 readable: [idToRemove],
//                 writable: [idToRemove],
//                 downloadable: [idToRemove],
//               },
//             };

//             // Update all users that contain the ID in any of the arrays
//             await User.updateMany(filter, update);

//             filter = {
//               $or: [
//                 { readable: idToRemove },
//                 { writable: idToRemove },
//                 { downloadable: idToRemove },
//                 { fullAccessDownloadable: idToRemove },
//                 { fullAccessReadable: idToRemove },
//               ],
//             };

//             update = {
//               $pullAll: {
//                 readable: [idToRemove],
//                 writable: [idToRemove],
//                 downloadable: [idToRemove],
//                 fullAccessDownloadable: [idToRemove],
//                 fullAccessReadable: [idToRemove],
//               },
//             };

//             // Update all roles that contain the ID in any of the arrays
//             await Role.updateMany(filter, update);

//             await fs.unlink(sourcePath);

//           } catch (error) {
//             console.error("Error :", error);
//           }
//           resolve();
//           res.status(200).json({
//             message: "file cut successfully"
//           })
//         });
//       }),
//     ]);

//     sourceStream.pipe(destinationStream);

//   } catch (error) {
//     console.error("Error copying file:", error);
//     res.status(500).json({
//       message: "Error copying file"
//     })
//   }
// }

const storeDocumentDetailsToDatabase = async (
  name,
  type,
  path,
  userData,
  isProject,
  isInvolvedInProcess,
  cabinetNo,
  workName,
  year,
  departmentName
) => {
  try {
    // Create a new document instance
    const foundUser = await User.findOne({
      username: userData.username,
    }).exec();

    let department;

    if (departmentName) {
      department = await Department.findOne({ name: departmentName }).select(
        "_id"
      );
      department = department._id;
    }
    const newDocument = isProject
      ? new Document({
          name: name,
          createdBy: foundUser._id, // Replace with the user's ObjectId
          path: path,
          type: type,
          createdOn: Date.now(),
          isProject: isProject,
          isInvolvedInProcess:
            isInvolvedInProcess === undefined ? false : isInvolvedInProcess,
          cabinetNo: cabinetNo,
          workName: workName,
          year: year,
          department: department,
        })
      : new Document({
          name: name,
          createdBy: foundUser._id, // Replace with the user's ObjectId
          path: path,
          type: type,
          createdOn: Date.now(),
          isProject: isProject,
          isInvolvedInProcess:
            isInvolvedInProcess === undefined ? false : isInvolvedInProcess,
          cabinetNo: cabinetNo,
          workName: workName,
          year: year,
          department: department,
        });
    const savedDocument = await newDocument.save();

    return savedDocument._id;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const createUserPermissions = async (documentId, username, writable) => {
  try {
    console.log("reached create_user permission funciton");
    const updatedUser = writable
      ? await User.findOneAndUpdate(
          { username: username },
          { $push: { writable: documentId } },
          { new: true } // Return the updated user document
        ).exec()
      : await User.findOneAndUpdate(
          { username: username },
          { $push: { readable: documentId } },
          { new: true } // Return the updated user document
        ).exec();

    if (updatedUser) {
    } else {
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const storeChildIdInParentDocument = async (parentPath, childId) => {
  try {
    const updatedDocument = await Document.findOneAndUpdate(
      { path: parentPath },
      { $push: { children: childId } },
      { new: true } // Return the updated document
    ).exec(); // Optionally populate related fields

    if (updatedDocument) {
      await storeParentIdInChildDocument(childId, updatedDocument._id);
    } else {
    }
  } catch (error) {
    throw error;
    console.error("Error updating document:", error);
  }
};

const storeParentIdInChildDocument = async (childId, parentId) => {
  try {
    const updatedDocument = await Document.findOneAndUpdate(
      { _id: childId },
      { $set: { parent: parentId } },
      { new: true } // Return the updated document
    ).exec();

    if (updatedDocument) {
    } else {
    }
  } catch (error) {
    throw error;
    console.error("Error updating document:", error);
  }
};

export const folder_download = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let folderPath =
      process.env.STORAGE_PATH +
      req.body.folderPath.substring(2) +
      `/${req.body.folderName}`; // Replace with the path to your folder
    folderPath = path.join(__dirname, folderPath);
    const folderName = req.body.folderName; // Replace with the name of your folder
    const zipFileName = `${folderName}.zip`;

    // Set response headers for downloading
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipFileName}"`
    );

    // Create a zip archive and pipe it directly to the response
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Set compression level (optional)
    });

    archive.pipe(res);

    // Add the entire folder to the archive
    archive.directory(folderPath, false); // 'false' to include all files and subfolders

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: "Error downloading folder",
    });
  }
};

export const file_delete = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let documentPath = process.env.STORAGE_PATH + req.body.path.substring(2);

    let absolutePath = path.join(
      __dirname,
      process.env.STORAGE_PATH + req.body.path.substring(2)
    );

    await fs.access(absolutePath);

    const document = await Document.findOne({ path: documentPath });

    const idToRemove = document._id;

    await documentIdCleanUpFromDocument(idToRemove);
    await documentIdCleanUpFromUser(idToRemove);
    await documentIdCleanUpFromRole(idToRemove);
    await fs.unlink(absolutePath);
    await Document.findByIdAndDelete({ _id: idToRemove });

    res.status(200).json({
      message: "File delete successfully",
    });
  } catch (error) {
    console.error("Error delete file:", error);
    res.status(500).json({
      message: "Error delete file",
    });
  }
};

export const file_though_url = async (req, res) => {
  try {
    const STORAGE_PATH = process.env.STORAGE_PATH;
    console.log("Route reached");

    // Decode the incoming filePath parameter
    const rawFilePath = req.params.filePath;
    if (!rawFilePath) {
      return res.status(400).json({ message: "File path is missing" });
    }

    const filePath = decodeURIComponent(rawFilePath);
    console.log("Decoded filePath:", filePath);

    // Prevent directory traversal attacks
    const sanitizedFilePath = normalize(filePath).replace(
      /^(\.\.(\/|\\|$))+/,
      ""
    );

    console.log("sanitized path", sanitizedFilePath);

    // Construct the relative path using STORAGE_PATH
    console.log("STORAGE_PATH:", STORAGE_PATH);

    console.log("Sanitized file path:", sanitizedFilePath);
    const relativePath = path.join(STORAGE_PATH, String(sanitizedFilePath));
    console.log("Relative path:", relativePath);

    // Get the current directory of the script
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    console.log("__dirname:", __dirname);

    // Construct the absolute path

    const absolutePath = path.join(__dirname, relativePath);
    console.log("Absolute path:", absolutePath);

    console.log("Attempting to serve file:", absolutePath);

    // Check if the file exists
    try {
      await fs.access(absolutePath);
    } catch {
      return res.status(404).json({ message: "File not found" });
    }

    // Serve the file
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error("Error serving file:", error);
    return res.status(500).json({ message: "Error serving file" });
  }
};
