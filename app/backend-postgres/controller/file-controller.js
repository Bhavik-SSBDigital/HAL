import fs from "fs/promises";
import { createWriteStream, createReadStream, read } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, normalize, extname } from "path";
import fsCB from "fs";
import path from "path";
import { Transform } from "stream";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { verifyUser } from "../utility/verifyUser.js";
import archiver from "archiver";
import { promisify } from "util";
import { pipeline } from "stream";
// import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import dotnev from "dotenv";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

dotnev.config();

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

    const fileName = decodeURIComponent(req.headers["x-file-name"]);
    const chunkNumber = parseInt(req.headers["x-current-chunk"]);
    const totalChunks = parseInt(req.headers["x-total-chunks"]);
    const chunkSize = parseInt(req.headers["x-chunk-size"]);
    let isInvolvedInProcess = Boolean(req.headers["x-involved-in-process"]);
    let tags = req.headers["x-tags"];
    tags = tags ? tags.split(",") : [];
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
    let relativePath = process.env.STORAGE_PATH + extra;
    const saveTo = path.join(__dirname, relativePath, fileName);
    relativePath = relativePath + `/${fileName}`;

    try {
      if (chunkNumber === 0) {
        await fs.promises.access(saveTo);
        return res.status(409).json({
          message: "File already exists at the given path",
        });
      }
    } catch (err) {
      // File does not exist; continue with upload
    }

    const writableStream = fsCB.createWriteStream(saveTo, {
      flags: "a+", // Append mode
      start: chunkNumber * chunkSize,
    });

    req.pipe(writableStream);

    writableStream.on("finish", async () => {
      if (chunkNumber === totalChunks - 1) {
        try {
          const newDocument = await prisma.document.create({
            data: {
              name: fileName,
              type: fileExtension,
              path: extra + "/" + fileName,
              createdById: userData.id,
              isInvolvedInProcess: isInvolvedInProcess || false,
              tags: tags,
              isRecord: isInvolvedInProcess ? false : true,
              department: departmentName
                ? {
                    connect: { name: departmentName },
                  }
                : undefined,
              // highlights: { create: [] },
            },
          });

          await createUserPermissions(newDocument.id, userData.username, true);

          await storeChildIdInParentDocument(extra, newDocument.id);

          return res.status(200).json({
            message: "File upload completed.",
            documentId: newDocument.id,
          });
        } catch (err) {
          console.error("Error storing document details:", err);
          return res
            .status(500)
            .json({ message: "Error storing document details." });
        }
      } else {
        return res.status(200).json({
          message: "Chunk received successfully.",
        });
      }
    });

    writableStream.on("error", (err) => {
      console.error("Error writing the file:", err);
      res.status(500).send("Error writing the file.");
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Error.");
  }
};

export const create_folder = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { isProject, path: path_ } = req.body;
    const statusCode = await createFolder(isProject, path_, userData);

    if (statusCode === 409) {
      return res.status(409).json({ message: "Folder already exists" });
    }

    if (statusCode === 200) {
      return res.status(200).json({ message: "Folder created successfully" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating folder" });
  }
};

function getParentPath(path) {
  // Remove "../" by splitting on "../" and joining back the parts
  const cleanPath = path.split("../").join("");

  // Split the cleaned path into parts using '/' and remove the last part
  const pathParts = cleanPath.split("/");
  pathParts.pop(); // Remove the last part (file or folder name)

  // Join the remaining parts back into a string and add a leading '/'
  return "/" + pathParts.join("/");
}

export const createFolder = async (isProject, path_, userData) => {
  try {
    const storagePath = process.env.STORAGE_PATH;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const absolutePath = path.join(__dirname, storagePath, path_.substring(2));

    console.log("absolute path", absolutePath);
    try {
      await fs.access(absolutePath);
      return 409; // Folder already exists
    } catch (error) {
      let pathOrigin = storagePath;
      const type = "folder";
      const createdBy = userData.username;
      const createdOn = new Date();

      for (const element of path_.split("/").slice(1)) {
        const pathToBeChecked = path.join(pathOrigin, element);
        const absolutePathToBeChecked = path.join(__dirname, pathToBeChecked);

        try {
          await fs.access(absolutePathToBeChecked);
          pathOrigin = path.join(pathOrigin, element);
        } catch (error) {
          if (error.code === "ENOENT") {
            // Create the folder in the filesystem
            await fs.mkdir(absolutePathToBeChecked);

            console.log("path", path_);
            // Store document details in the database
            console.log("is project", isProject);
            const newDocument = await prisma.document.create({
              data: {
                name: element,
                type,
                path: path_.substring(2),
                createdById: userData.id,
                createdOn,
                isProject: isProject || false,
              },
            });

            console.log("updated document", newDocument);

            await createUserPermissions(
              newDocument.id,
              userData.username,
              true
            );

            const parentPath = getParentPath(path_);

            await storeChildIdInParentDocument(parentPath, newDocument.id);
            // Create user permissions
            // await prisma.userRole.create({
            //   data: {
            //     userId: userData.id,
            //     roleId: newDocument.id,
            //   },
            // });

            // Update parent document with child ID
            const parentDocument = await prisma.document.findFirst({
              where: { path: pathOrigin },
            });

            if (parentDocument) {
              await prisma.document.update({
                where: { id: parentDocument.id },
                data: {
                  children: {
                    connect: { id: newDocument.id },
                  },
                },
              });
            }

            pathOrigin = pathToBeChecked;
          } else {
            throw error;
          }
        }
      }

      return 200;
    }
  } catch (error) {
    console.error("Error creating folder:", error);
    throw new Error(error);
  }
};

// export const createUserPermissions = async (documentId, username, writable) => {
//   try {
//     const updateData = writable
//       ? { writable: { push: documentId } } // Add to writable array
//       : { readable: { push: documentId } }; // Add to readable array

//     const updatedUser = await prisma.user.update({
//       where: { username }, // Find the user by username
//       data: updateData, // Update either writable or readable
//     });

//     if (updatedUser) {
//       console.log("User permissions updated successfully", updatedUser);
//     } else {
//       throw new Error("User not found or no changes made");
//     }
//   } catch (error) {
//     console.error("Error updating user permissions:", error);
//     throw new Error("Error updating user permissions");
//   }
// };

export const createUserPermissions = async (documentId, username, writable) => {
  try {
    // First, get the user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Create the document access record
    const accessTypes = writable ? ["READ", "EDIT"] : ["READ"];

    const documentAccess = await prisma.documentAccess.create({
      data: {
        document: { connect: { id: documentId } },
        user: { connect: { id: user.id } },
        accessType: accessTypes,
        accessLevel: "STANDARD",
        docAccessThrough: "SELF",
        grantedAt: new Date(),
        grantedBy: { connect: { id: user.id } }, // Assuming the system admin is granting this
      },
    });

    console.log("doc access", documentAccess);

    return documentAccess;
  } catch (error) {
    console.error("Error creating document access:", error);
    throw new Error("Error creating document access");
  }
};
export const file_copy = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const bufferSize = 1024 * 1024; // 1 MB buffer size

    const sourcePath = req.body.sourcePath.substring(2);

    const destinationPathParent = req.body.destinationPath.substring(2);

    const name = req.body.name;
    const destinationPath = destinationPathParent + `/${name}`;

    const absoluteSourcePath = path.join(__dirname, STORAGE_PATH, sourcePath);

    const absoluteDestinationPath = path.join(
      __dirname,
      STORAGE_PATH,
      destinationPath
    );

    const sourceStream = createReadStream(absoluteSourcePath, {
      highWaterMark: bufferSize,
    });
    const destinationStream = createWriteStream(absoluteDestinationPath, {
      highWaterMark: bufferSize,
    });

    sourceStream.on("error", (error) => {
      console.error("Source Stream Error:", error);
      return res.status(500).json({ message: "Error reading source file" });
    });

    destinationStream.on("error", (error) => {
      console.error("Destination Stream Error:", error);
      return res
        .status(500)
        .json({ message: "Error writing destination file" });
    });

    destinationStream.on("finish", async () => {
      try {
        // Store document details in the database
        const newDocument = await prisma.document.create({
          data: {
            name: name,
            type: name.split(".").pop(),
            path: destinationPath,
            createdById: userData.id,
            isInvolvedInProcess: false,
            isRejected: false,
          },
        });

        const accessTypes = ["READ", "EDIT"];
        const documentAccess = await prisma.documentAccess.create({
          data: {
            document: { connect: { id: newDocument.id } },
            user: { connect: { id: userData.id } },
            accessType: accessTypes,
            accessLevel: "STANDARD",
            docAccessThrough: "SELF",
            grantedAt: new Date(),
            grantedBy: { connect: { id: userData.id } }, // Assuming the system admin is granting this
          },
        });

        // Update parent document (if it's nested under another document)
        if (req.body.destinationPath) {
          const parentDocument = await prisma.document.findUnique({
            where: { path: destinationPathParent },
          });

          if (parentDocument) {
            await prisma.document.update({
              where: { id: parentDocument.id },
              data: {
                children: { connect: { id: newDocument.id } },
              },
            });
          }
        }

        res.status(200).json({ message: "File copied successfully" });
      } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ message: "Error storing document details" });
      }
    });

    sourceStream.pipe(destinationStream);
  } catch (error) {
    console.error("Error copying file:", error);
    res.status(500).json({ message: "Error copying file" });
  }
};

export const file_cut = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const bufferSize = 1024 * 1024; // 1 MB buffer size

    const sourcePath = req.body.sourcePath.substring(2);
    const destinationPathParent = req.body.destinationPath.substring(2);
    const name = req.body.name;
    const destinationPath = destinationPathParent + `/${name}`;

    const absoluteSourcePath = path.join(__dirname, STORAGE_PATH, sourcePath);
    const absoluteDestinationPath = path.join(
      __dirname,
      STORAGE_PATH,
      destinationPath
    );

    const sourceStream = createReadStream(absoluteSourcePath, {
      highWaterMark: bufferSize,
    });
    const destinationStream = createWriteStream(absoluteDestinationPath, {
      highWaterMark: bufferSize,
    });

    sourceStream.on("error", (error) => {
      console.error("Source Stream Error:", error);
      return res.status(500).json({ message: "Error reading source file" });
    });

    destinationStream.on("error", (error) => {
      console.error("Destination Stream Error:", error);
      return res
        .status(500)
        .json({ message: "Error writing destination file" });
    });

    destinationStream.on("finish", async () => {
      try {
        // Create new document record
        const newDocument = await prisma.document.create({
          data: {
            name: name,
            type: name.split(".").pop(),
            path: destinationPath,
            createdById: userData.id,
            isInvolvedInProcess: false,
            isRejected: false,
          },
        });

        // Create document access for the user
        const accessTypes = ["READ", "EDIT"];
        await prisma.documentAccess.create({
          data: {
            document: { connect: { id: newDocument.id } },
            user: { connect: { id: userData.id } },
            accessType: accessTypes,
            accessLevel: "STANDARD",
            docAccessThrough: "SELF",
            grantedAt: new Date(),
            grantedBy: { connect: { id: userData.id } },
          },
        });

        // Connect to parent document if exists
        if (req.body.destinationPath) {
          const parentDocument = await prisma.document.findUnique({
            where: { path: destinationPathParent },
          });

          if (parentDocument) {
            await prisma.document.update({
              where: { id: parentDocument.id },
              data: {
                children: { connect: { id: newDocument.id } },
              },
            });
          }
        }

        // Find and clean up the old document
        const oldDocument = await prisma.document.findUnique({
          where: { path: sourcePath },
        });

        if (!oldDocument) {
          return res.status(404).json({ message: "Source document not found" });
        }

        // Disconnect from all parent documents
        await prisma.document.updateMany({
          where: { children: { some: { id: oldDocument.id } } },
          data: {
            children: { disconnect: { id: oldDocument.id } },
          },
        });

        await cleanUpDocumentDetails(oldDocument.id);

        // Delete the source file
        await fs.unlink(absoluteSourcePath);

        // Delete the old document record
        await prisma.document.delete({ where: { id: oldDocument.id } });

        res.status(200).json({ message: "File cut successfully" });
      } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ message: "Error during file cut operation" });
      }
    });

    sourceStream.pipe(destinationStream);
  } catch (error) {
    console.error("Error cutting file:", error);
    res.status(500).json({ message: "Error cutting file" });
  }
};

export const documentIdCleanUpFromDocument = async (idToRemove) => {
  // Find all documents that have the target ID as a child
  const documentsWithChildren = await prisma.document.findMany({
    where: {
      children: {
        some: {
          id: idToRemove,
        },
      },
    },
    include: {
      children: true, // Include children to modify the relationship
    },
  });

  // Iterate and update each document to remove the target child
  for (const doc of documentsWithChildren) {
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        children: {
          disconnect: { id: idToRemove },
        },
      },
    });
  }

  console.log(
    `Removed document with ID ${idToRemove} from parent relationships.`
  );
};

// export const documentIdCleanUpFromUser = async (idToRemove) => {
//   // Update all users to remove the given document ID from readable, writable, and downloadable arrays
//   await prisma.user.updateMany({
//     where: {
//       OR: [
//         { readable: { has: idToRemove } },
//         { writable: { has: idToRemove } },
//         { downloadable: { has: idToRemove } },
//       ],
//     },
//     data: {
//       readable: {
//         set: (
//           await prisma.user.findMany({
//             where: { readable: { has: idToRemove } },
//             select: { readable: true },
//           })
//         ).flatMap((user) => user.readable.filter((id) => id !== idToRemove)),
//       },
//       writable: {
//         set: (
//           await prisma.user.findMany({
//             where: { writable: { has: idToRemove } },
//             select: { writable: true },
//           })
//         ).flatMap((user) => user.writable.filter((id) => id !== idToRemove)),
//       },
//       downloadable: {
//         set: (
//           await prisma.user.findMany({
//             where: { downloadable: { has: idToRemove } },
//             select: { downloadable: true },
//           })
//         ).flatMap((user) =>
//           user.downloadable.filter((id) => id !== idToRemove)
//         ),
//       },
//     },
//   });
// };

export const cleanUpDocumentDetail = async (idToRemove) => {
  // Delete all DocumentAccess records for this document
  await prisma.documentAccess.deleteMany({
    where: {
      documentId: idToRemove,
    },
  });

  // Clean up any process documents referencing this document
  await prisma.processDocument.deleteMany({
    where: {
      documentId: idToRemove,
    },
  });

  // Clean up any document signatures for this document
  await prisma.documentSignature.deleteMany({
    where: {
      processDocument: {
        documentId: idToRemove,
      },
    },
  });

  // Clean up any sign coordinates for this document
  await prisma.signCoordinate.deleteMany({
    where: {
      processDocument: {
        documentId: idToRemove,
      },
    },
  });
};

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
    // Fetch the user using Prisma Client
    const foundUser = await prisma.user.findUnique({
      where: {
        username: userData.username,
      },
    });

    if (!foundUser) {
      throw new Error("User not found");
    }

    let departmentId = null;

    if (departmentName) {
      // Find the department by name
      const department = await prisma.department.findUnique({
        where: {
          name: departmentName,
        },
        select: {
          id: true,
        },
      });

      if (!department) {
        throw new Error("Department not found");
      }

      departmentId = department.id;
    }

    // Create a new document
    const newDocument = await prisma.document.create({
      data: {
        name: name,
        type: type,
        path: path,
        createdById: foundUser.id, // Reference the user's ID
        isProject: isProject,
        isInvolvedInProcess: isInvolvedInProcess ?? false,
        departmentId: departmentId,
        // Optional fields can be set here if required
        // highlights: undefined, // Add as needed
        minimumSignsOnFirstPage: undefined, // Add as needed
      },
    });

    return newDocument.id;
  } catch (error) {
    console.error("Error storing document details: ", error);
    throw error;
  }
};

export const storeChildIdInParentDocument = async (parentPath, childId) => {
  try {
    // Find the parent document based on path
    const parentDocument = await prisma.document.findUnique({
      where: { path: parentPath },
    });

    if (parentDocument) {
      // Update the parent document by adding the childId to the `children` relation
      await prisma.document.update({
        where: { id: parentDocument.id },
        data: {
          children: {
            connect: { id: childId }, // Create a relation between parent and child
          },
        },
      });

      // Now update the child document to set its `parentId`
      await storeParentIdInChildDocument(childId, parentDocument.id);
    }
  } catch (error) {
    console.error("Error updating document:", error);
    throw error;
  }
};

const storeParentIdInChildDocument = async (childId, parentId) => {
  try {
    // Update the child document to set the `parentId`
    await prisma.document.update({
      where: { id: childId },
      data: { parentId: parentId },
    });
  } catch (error) {
    console.error("Error updating child document:", error);
    throw error;
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

    // Get department or process related to the folder if applicable
    const departmentId = req.body.departmentId; // Assuming you're passing a departmentId
    const folderName = req.body.folderName; // Name of the folder you want to zip

    // Retrieve the department to get the associated documents
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        documents: true, // Fetch documents associated with the department
      },
    });

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    // Construct the folder path
    let folderPath =
      process.env.STORAGE_PATH +
      `/departments/${department.code}/${folderName}`; // Modify as needed based on your structure
    folderPath = path.join(__dirname, folderPath);

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

    // Add documents related to the department to the zip if needed
    department.documents.forEach((doc) => {
      const documentPath = path.join(__dirname, doc.path); // Path to the document file
      archive.file(documentPath, { name: doc.name });
    });

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

    // Check if file exists in the filesystem
    await fs.access(absolutePath);

    // Find the document in the database by its path
    const document = await prisma.document.findUnique({
      where: { path: documentPath },
      include: { history: true, highlights: true }, // Include related data if needed
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    const idToRemove = document.id;

    // Cleanup from related models
    await documentIdCleanUpFromDocument(idToRemove);
    await cleanUpDocumentDetail(idToRemove);

    // Delete file from storage
    await fs.unlink(absolutePath);

    // Delete the document from the database
    await prisma.document.delete({
      where: { id: idToRemove },
    });

    res.status(200).json({
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      message: "Error deleting file",
    });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
};

export const file_though_url = async (req, res) => {
  try {
    let filePath = "/" + req.params.filePath;

    if (!filePath) {
      return res.status(400).json({ message: "File path is missing" });
    }

    // Fetch the document from the database using the filePath (assuming filePath matches the Document's path)
    const document = await prisma.document.findUnique({
      where: { path: filePath },
    });

    if (!document) {
      return res.status(404).json({ message: "File not found in database" });
    }

    // Resolve relative path to absolute path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const absoluteFilePath = path.join(
      __dirname,
      process.env.STORAGE_PATH,
      document.path
    );

    // Check if the file exists
    try {
      await fs.access(absoluteFilePath);
    } catch {
      return res.status(404).json({ message: "File not found in storage" });
    }

    // Serve the file
    return res.sendFile(absoluteFilePath);
  } catch (error) {
    console.error("Error serving file:", error);
    return res.status(500).json({ message: "Error serving file" });
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

    // let relativePath = process.env.STORAGE_PATH + extra.substring(2);
    let relativePath = extra.substring(1);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const fileName = decodeURIComponent(req.headers["x-file-name"]);
    const filePath = join(relativePath, fileName); // Replace with your file path

    const fileExt = extname(fileName).slice(1).toLowerCase();
    const fileURL = process.env.FILE_URL;
    return res.status(200).json({
      data: `${fileURL}${filePath}`,
      fileType: fileExt,
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "error downloading file",
    });
  }
};

// export const file_download = async (req, res) => {
//   try {
//     const accessToken = req.headers["x-authorization"].substring(7);
//     const userData = await verifyUser(accessToken);

//     if (userData === "Unauthorized") {
//       return res.status(401).json({
//         message: "Unauthorized request",
//       });
//     }

//     const documentId = req.params.documentId; // Assuming document ID is passed as part of the route
//     const document = await prisma.document.findUnique({
//       where: {
//         id: documentId,
//       },
//       select: {
//         path: true, // Only fetch the path field
//         name: true,
//         type: true,
//       },
//     });

//     if (!document) {
//       return res.status(404).json({
//         message: "Document not found",
//       });
//     }

//     // If the user is allowed to download the document based on your business logic
//     // (You may need to add additional checks here to ensure the user has access)
//     const fileExt = extname(document.name).slice(1).toLowerCase();
//     const fileURL = process.env.FILE_URL;

//     const relativePath = document.path; // Assuming the file path is stored in `path`
//     const filePath = join(relativePath, document.name); // Replace with your actual file path

//     return res.status(200).json({
//       data: `${fileURL}${filePath}`,
//       fileType: fileExt,
//     });
//   } catch (error) {
//     console.log("error", error);
//     res.status(500).json({
//       message: "error downloading file",
//     });
//   }
// };

export const get_file_data = async (req, res) => {
  try {
    const accessToken = req.headers["x-authorization"]?.substring(7);

    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const extra = decodeURIComponent(req.headers["x-file-path"]);
    const relativePath = process.env.STORAGE_PATH + "/" + extra.substring(1);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const fileName = decodeURIComponent(req.headers["x-file-name"]);

    const filePath = join(__dirname, relativePath, fileName);

    // Fetch document metadata from PostgreSQL using Prisma
    const document = await prisma.document.findUnique({
      where: { path: extra },
      include: { department: true },
    });

    if (!document) {
      return res
        .status(404)
        .json({ message: "File not found in the database." });
    }

    // Check user permissions for the requested document
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: userData.id,
        role: {
          departmentId: document.departmentId,
        },
      },
    });

    // Get file stats
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const fileExtension = fileName.split(".").pop();

    if (range === "bytes=0-0") {
      res.setHeader("content-type", getContentTypeFromExtension(fileExtension));
      res.setHeader("access-control-expose-headers", "Content-Range");
      return res.status(206).json({
        fileSize,
        message: "Partial file details fetched successfully.",
      });
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const fileStream = fsCB.createReadStream(filePath, { start, end });
      res.setHeader("content-type", getContentTypeFromExtension(fileExtension));
      res.setHeader("access-control-expose-headers", "Content-Range");

      fileStream.pipe(res);
    } else {
      res.setHeader("content-type", getContentTypeFromExtension(fileExtension));
      fsCB.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.log("Error while processing file data:", error);
    res.status(500).json({
      message: "Error downloading file",
    });
  }
};

export const archive_file = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const documentId = req.body.documentId; // Assuming document ID is passed in the request body
    const document = await prisma.document.findUnique({
      where: { id: documentId }, // Include related data if needed
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    let absolutePath = path.join(
      __dirname,
      process.env.STORAGE_PATH + document.path
    );

    // Check if file exists in the filesystem
    try {
      await fs.access(absolutePath);
    } catch (error) {
      console.error("File not found:", error);
      return res.status(404).json({
        message: "File not found",
      });
    }

    // Find the document in the database by its path

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { isArchived: true },
    });

    res.status(200).json({
      message: "File archived successfully",
    });
  } catch (error) {
    console.error("Error archiving file:", error);
    res.status(500).json({
      message: "Error archiving file",
    });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
};

export const delete_file = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const documentId = req.body.documentId; // Assuming document ID is passed in the request body
    const document = await prisma.document.findUnique({
      where: { id: documentId }, // Include related data if needed
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    let absolutePath = path.join(
      __dirname,
      process.env.STORAGE_PATH + document.path
    );

    // Check if file exists in the filesystem
    try {
      await fs.access(absolutePath);
    } catch (error) {
      console.error("File not found:", error);
      return res.status(404).json({
        message: "File not found",
      });
    }

    // Find the document in the database by its path

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { inBin: true },
    });

    res.status(200).json({
      message: "File moved to recycle bin successfully",
    });
  } catch (error) {
    console.error("Error moving file to recycle bin:", error);
    res.status(500).json({
      message: "Error moving file to recycle bin",
    });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
};

export const unarchive_file = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const documentId = req.body.documentId; // Assuming document ID is passed in the request body
    const document = await prisma.document.findUnique({
      where: { id: documentId }, // Include related data if needed
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    let absolutePath = path.join(
      __dirname,
      process.env.STORAGE_PATH + document.path
    );

    // Check if file exists in the filesystem
    try {
      await fs.access(absolutePath);
    } catch (error) {
      console.error("File not found:", error);
      return res.status(404).json({
        message: "File not found",
      });
    }

    // Find the document in the database by its path

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { isArchived: false },
    });

    res.status(200).json({
      message: "File unarchived successfully",
    });
  } catch (error) {
    console.error("Error unarchiving file:", error);
    res.status(500).json({
      message: "Error unarchiving file",
    });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
};

export const recover_from_recycle_bin = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const documentId = req.body.documentId; // Assuming document ID is passed in the request body
    const document = await prisma.document.findUnique({
      where: { id: documentId }, // Include related data if needed
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    let absolutePath = path.join(
      __dirname,
      process.env.STORAGE_PATH + document.path
    );

    // Check if file exists in the filesystem
    try {
      await fs.access(absolutePath);
    } catch (error) {
      console.error("File not found:", error);
      return res.status(404).json({
        message: "File not found",
      });
    }

    // Find the document in the database by its path

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { inBin: false },
    });

    res.status(200).json({
      message: "File recovered successfully",
    });
  } catch (error) {
    console.error("Error recovering file:", error);
    res.status(500).json({
      message: "Error recovering file",
    });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
};
