import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import { dirname, join } from "path";
import {
  getChildrenForDoc,
  getChildrenForFullAccess,
} from "../utility/accessFunction.js";
import { read } from "fs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const getRootDocumentsWithAccess = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const userId = userData.id;

    // Fetch user roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        branches: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userRoles = user.roles.map((userRole) => userRole.role);

    // Aggregate permissions from all roles
    const readableDocumentIds = new Set();
    const writableDocumentIds = new Set();
    const uploadableDocumentIds = new Set();
    const downloadableDocumentIds = new Set();

    userRoles.forEach((role) => {
      role.readable.forEach((docId) => readableDocumentIds.add(docId));
      role.writable.forEach((docId) => writableDocumentIds.add(docId));
      role.uploadable.forEach((docId) => uploadableDocumentIds.add(docId));
      role.downloadable.forEach((docId) => downloadableDocumentIds.add(docId));
    });

    // Fetch root documents (isProject: true) from Prisma
    const rootDocuments = await prisma.document.findMany({
      where: { isProject: true },
    });

    if (!rootDocuments.length) {
      return res.status(200).json({ children: [] });
    }

    // Filter documents based on user permissions
    const accessibleRootDocuments = rootDocuments.filter((doc) => {
      return (
        user.username === "admin" ||
        readableDocumentIds.has(doc.id) ||
        writableDocumentIds.has(doc.id)
      );
    });

    // Map documents to include metadata

    const mappedDocuments = await Promise.all(
      accessibleRootDocuments.map(async (doc) => {
        const fileAbsolutePath = path.join(
          __dirname,
          process.env.STORAGE_PATH,
          doc.path.substring(1)
        );

        try {
          const fileStats = await fs.stat(fileAbsolutePath);

          return {
            id: doc.id,
            name: doc.name,
            path: `..${doc.path.substring(19)}/${doc.name}`,
            type: doc.type,
            createdOn: doc.createdOn,
            createdBy: doc.createdById,
            lastUpdated: fileStats.mtime,
            lastAccessed: fileStats.atime,
            size: fileStats.size,
            isUploadable:
              user.username === "admin" || uploadableDocumentIds.has(doc.id),
            isDownloadable:
              user.username === "admin" || downloadableDocumentIds.has(doc.id),
            children: [],
          };
        } catch (err) {
          console.error(`Failed to retrieve file stats for ${doc.path}:`, err);
          return null;
        }
      })
    );

    // Filter out null values
    const result = mappedDocuments.filter((doc) => doc !== null);

    return res.status(200).json({ children: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// export const getRootDocumentsForEdit = async (req, res) => {
//   try {
//     const accessToken = req.headers["authorization"].substring(7);
//     const userData = await verifyUser(accessToken);
//     if (userData === "Unauthorized") {
//       return res.status(401).json({
//         message: "Unauthorized request",
//       });
//     }

//     const userId = userData.id;

//     // Fetch the user's roles and permissions
//     const userRoles = await prisma.userRole.findMany({
//       where: { userId },
//       include: {
//         role: true,
//       },
//     });

//     const readableArray = [];
//     const writableArray = [];
//     const uploadableArray = [];
//     const downloadableArray = [];
//     const fullAccessUploadable = [];
//     const fullAccessReadable = [];
//     const fullAccessDownloadable = [];

//     userRoles.forEach((userRole) => {
//       readableArray.push(...userRole.role.readable);
//       writableArray.push(...userRole.role.writable);
//       uploadableArray.push(...userRole.role.uploadable);
//       downloadableArray.push(...userRole.role.downloadable);
//     });

//     const fullAccess = [...readableArray, ...writableArray, ...uploadableArray];

//     // Fetch all root-level documents
//     let foundDocuments = await prisma.document.findMany({
//       where: { isProject: true, parentId: null },
//       include: { children: true },
//     });

//     const childrenData = await Promise.all(
//       foundDocuments.map(async (doc) => {
//         const fileAbsolutePath = path.join(__dirname, doc.path);
//         try {
//           await fs.stat(fileAbsolutePath);
//           let obj = {
//             id: doc.id,
//             upload: uploadableArray.includes(doc.id),
//             download: downloadableArray.includes(doc.id),
//             view: readableArray.includes(doc.id),
//           };

//           if (fullAccess.includes(doc.id)) {
//             fullAccessUploadable.push(doc.id);
//             fullAccessDownloadable.push(doc.id);
//             fullAccessReadable.push(doc.id);
//           }

//           return {
//             id: doc.id,
//             name: doc.name,
//             path: `..${doc.path.substring(19)}/${doc.name}`,
//             type: doc.type,
//             children: doc.children,
//           };
//         } catch (error) {
//           return null;
//         }
//       })
//     );

//     childrenData.filter((doc) => doc !== null);

//     res.status(200).json({
//       children: childrenData,
//       selectedUpload: uploadableArray,
//       selectedDownload: downloadableArray,
//       selectedView: readableArray,
//       fullAccess: fullAccess,
//     });
//   } catch (error) {
//     console.log("error", error);
//     res.status(500).json({
//       message: "Error accessing given document",
//     });
//   }
// };

export const getRootDocumentsForEdit = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const userId = userData.id;
    const roleId = req.body.role; // Get the specific role ID from request body
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Validate roleId
    if (!roleId) {
      return res.status(400).json({
        message: "Role ID is required",
      });
    }

    // Fetch specific role permissions instead of all user roles
    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) },
      select: {
        readable: true,
        writable: true,
        uploadable: true,
        downloadable: true,
        fullAccessReadable: true,
        fullAccessUploadable: true,
        fullAccessDownloadable: true,
      },
    });

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    // Use permissions from the specific role
    const readableArray = role.readable || [];
    const writableArray = role.writable || [];
    const uploadableArray = role.uploadable || [];
    const downloadableArray = role.downloadable || [];
    const fullAccessUploadable = role.fullAccessUploadable || [];
    const fullAccessReadable = role.fullAccessReadable || [];
    const fullAccessDownloadable = role.fullAccessDownloadable || [];

    // Fetch root project documents
    let foundDocuments = await prisma.document.findMany({
      where: {
        isProject: true,
        parentId: null,
      },
      select: {
        id: true,
        name: true,
        path: true,
        type: true,
        children: {
          select: {
            id: true,
            name: true,
            path: true,
            type: true,
          },
        },
      },
    });

    if (!foundDocuments.length) {
      return res.status(400).json({
        message: "No root documents found",
      });
    }

    // Process documents and check permissions
    const selectedUpload = [];
    const selectedDownload = [];
    const selectedView = [];
    const fullAccess = [];

    const childrenData = await Promise.all(
      foundDocuments.map(async (doc) => {
        const fileAbsolutePath = path.join(__dirname, doc.path);
        try {
          const fileStats = await fs.stat(fileAbsolutePath);

          // Permission object for this document
          const permissionObj = {
            id: doc.id,
            upload: false,
            download: false,
            view: false,
          };

          // Check full access permissions
          if (fullAccessUploadable.includes(doc.id)) {
            permissionObj.upload = true;
            fullAccess.push(permissionObj);
          }
          if (fullAccessDownloadable.includes(doc.id)) {
            permissionObj.download = true;
            fullAccess.push(permissionObj);
          }
          if (fullAccessReadable.includes(doc.id)) {
            permissionObj.view = true;
            fullAccess.push(permissionObj);
          }

          // Check regular permissions
          if (uploadableArray.includes(doc.id)) {
            selectedUpload.push(doc.id);
          }
          if (downloadableArray.includes(doc.id)) {
            selectedDownload.push(doc.id);
          }
          if (readableArray.includes(doc.id)) {
            selectedView.push(doc.id);
          }

          return {
            id: doc.id,
            name: doc.name,
            path: `..${doc.path.substring(19)}`,
            type: doc.type,
            children: doc.children.map((child) => ({
              id: child.id,
              name: child.name,
              path: `..${child.path.substring(19)}`,
              type: child.type,
              children: [],
            })),
          };
        } catch (error) {
          console.error(`Error accessing file at ${fileAbsolutePath}:`, error);
          return null;
        }
      })
    );

    // Filter out null results and prepare response
    const filteredChildren = childrenData.filter((doc) => doc !== null);

    return res.status(200).json({
      children: filteredChildren,
      selectedUpload: Array.from(new Set(selectedUpload)),
      selectedDownload: Array.from(new Set(selectedDownload)),
      selectedView: Array.from(new Set(selectedView)),
      fullAccess: Array.from(
        new Set(fullAccess.map((obj) => JSON.stringify(obj)))
      ).map((str) => JSON.parse(str)),
    });
  } catch (error) {
    console.error("Error in getRootDocumentsForEdit:", error);
    return res.status(500).json({
      message: "Error accessing documents",
    });
  }
};
