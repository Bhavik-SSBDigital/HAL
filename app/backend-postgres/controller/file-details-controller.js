import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import { dirname, join } from "path";
import { read } from "fs";
import {
  getChildrenForFullAccess,
  getParents,
} from "../utility/accessFunction.js";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function removeDuplicates(array) {
  return Array.from(new Set(array));
}

import dotenv from "dotenv";

dotenv.config();

const STORAGE_PATH = process.env.STORAGE_PATH;

export const getDocumentChildren = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const parentPath = process.env.STORAGE_PATH + req.body.path.substring(2);

    // Find the parent document using the unique path
    const parentDocument = await prisma.document.findUnique({
      where: {
        path: parentPath,
      },
    });

    if (!parentDocument) {
      return res.status(404).json({
        message: "Parent document not found",
      });
    }

    // Fetch children documents related to the parent
    const childDocuments = await prisma.document.findMany({
      where: {
        parentId: parentDocument.id,
        type: "folder", // Assuming type "folder" is used to filter folders
      },
      select: {
        path: true,
      },
    });

    // Map and format the paths of the children documents
    const formattedDocuments = childDocuments.map((doc) => {
      let relativePath = `..${doc.path.substring(
        process.env.STORAGE_PATH.length
      )}`;
      return relativePath;
    });

    return res.status(200).json({
      children: formattedDocuments,
    });
  } catch (error) {
    console.error("Error fetching children documents:", error);
    return res.status(500).json({
      message: "Error fetching children for document residing at given path",
    });
  }
};

export const getDocumentDetailsOnTheBasisOfPath = async (req, res) => {
  try {
    console.log("callllled");
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const user = await prisma.user.findUnique({
      where: { username: userData.username },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const readableArray = user.readable;
    const writableArray = user.writable;
    const downloadableArray = user.downloadable;
    const uploadableArray = user.uploadable;

    let readableArray_ = [];
    let writableArray_ = [];
    let uploadableArray_ = [];
    let downloadableArray_ = [];
    let fullAccessUploadable = [];
    let fullAccessReadable = [];
    let fullAccessDownloadable = [];

    if (userData.username !== "admin") {
      const userRoles = user.roles.map((userRole) => userRole.role);
      userRoles.forEach((role) => {
        readableArray_ = [...readableArray_, ...role.readable];
        writableArray_ = [...writableArray_, ...role.writable];
        uploadableArray_ = [...uploadableArray_, ...role.uploadable];
        downloadableArray_ = [...downloadableArray_, ...role.downloadable];
      });
    }

    const allReadable = [
      ...readableArray,
      ...readableArray_,
      ...fullAccessReadable,
    ];
    const allWritable = [...writableArray, ...writableArray_];
    const allUploadable = [
      ...uploadableArray,
      ...uploadableArray_,
      ...fullAccessUploadable,
    ];
    const allDownloadable = [
      ...downloadableArray,
      ...downloadableArray_,
      ...fullAccessDownloadable,
    ];

    const documentPath = req.body.path.substring(2);

    const foundDocument = await prisma.document.findUnique({
      where: { path: documentPath },
      include: {
        children: true,
      },
    });

    if (!foundDocument) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    const children = await Promise.all(
      foundDocument.children.map(async (child) => {
        console.log("child", child);
        const fileAbsolutePath = path.join(
          __dirname,
          STORAGE_PATH,
          child.path.substring(1)
        );
        const createdBy = await prisma.user.findUnique({
          where: { id: child.createdById },
        });

        const fileStats = await fs.stat(fileAbsolutePath);
        return {
          id: child.id,
          path: `${child.path}`,
          name: child.name,
          type: child.type,
          createdOn: child.createdOn,
          lastUpdated: fileStats.mtime,
          lastAccessed: fileStats.atime,
          size: fileStats.size,
          isRejected: child.isRejected || false,
        };
      })
    );

    res.status(200).json({
      children,
      isUploadable:
        userData.username === "admin"
          ? true
          : allUploadable.includes(foundDocument.id),
    });
  } catch (error) {
    console.error("Error accessing document:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const create_permissions = async (req, res) => {
  try {
    for (let i = 0; i < req.body.permissions.length; i++) {
      const obj = req.body.permissions[i];

      // Find the document by its path
      const document = await prisma.document.findUnique({
        where: { path: obj.filePath },
      });

      if (!document) {
        res
          .status(404)
          .json({ message: `Document with path ${obj.filePath} not found` });
        return;
      }

      const pathSegments = obj.filePath
        .split("/")
        .filter((segment) => segment !== "");
      const permissionedUsers = [...obj.read, ...obj.write];

      // Loop through path segments to manage parent documents
      for (let m = 0; m < permissionedUsers.length; m++) {
        let path = "";
        for (let p = 0; p < pathSegments.length - 1; p++) {
          path += `/${pathSegments[p]}`;

          // Find the parent document by its path
          const parentDocument = await prisma.document.findUnique({
            where: { path },
          });

          if (parentDocument) {
            // Create user permissions for the parent document
            await createUserPermissions(
              parentDocument.id,
              permissionedUsers[m],
              false
            );
          }
        }
      }

      // Assign read permissions
      for (let j = 0; j < obj.read.length; j++) {
        await createUserPermissions(document.id, obj.read[j], false);
      }

      // Assign write permissions
      for (let k = 0; k < obj.write.length; k++) {
        await createUserPermissions(document.id, obj.write[k], true);
      }
    }

    res.status(200).json({
      message: "Permissions created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating permissions",
    });
  }
};

const createUserPermissions = async (documentId, userId, isWritable) => {
  try {
    const existingPermission = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingPermission) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (isWritable) {
      // Add document ID to the writable list
      await prisma.user.update({
        where: { id: userId },
        data: {
          writable: { push: documentId },
        },
      });
    } else {
      // Add document ID to the readable list
      await prisma.user.update({
        where: { id: userId },
        data: {
          readable: { push: documentId },
        },
      });
    }
  } catch (error) {
    console.error(`Error creating user permissions: ${error.message}`);
    throw error;
  }
};

export const getDocumentDetailsForAdmin = async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      include: {
        department: true, // Includes associated department details
        history: true, // Includes document history
        highlights: true, // Includes document highlights
        children: true, // Includes child documents
        parent: true, // Includes parent document
      },
    });

    res.status(200).json({
      documents,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error in returning document details",
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const getDocumentDetailsOnTheBasisOfPathForEdit = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const roleId = req.body.role;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Validate roleId
    if (!roleId) {
      return res.status(400).json({ message: "Role ID is required" });
    }

    // Fetch specific role permissions
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
      return res.status(404).json({ message: "Role not found" });
    }

    // Use permissions from the specific role
    const readableArray = role.readable || [];
    const writableArray = role.writable || [];
    const uploadableArray = role.uploadable || [];
    const downloadableArray = role.downloadable || [];
    const fullAccessUploadable = role.fullAccessUploadable || [];
    const fullAccessReadable = role.fullAccessReadable || [];
    const fullAccessDownloadable = role.fullAccessDownloadable || [];

    // Get document path
    let documentPath = req.body.path.substring(2);

    // Find document

    const foundDocument = await prisma.document.findUnique({
      where: { path: documentPath },
    });

    if (!foundDocument) {
      return res.status(400).json({ message: "Document doesn't exist" });
    }

    // Get parent documents recursively
    const getParentIds = async (docId, parentIds = []) => {
      const parent = await prisma.document.findUnique({
        where: { id: docId },
        select: { parentId: true },
      });
      if (parent?.parentId) {
        parentIds.push(parent.parentId.toString());
        await getParentIds(parent.parentId, parentIds);
      }
      return parentIds;
    };
    const parents = await getParentIds(foundDocument.id);

    // Get children documents
    const children = await prisma.document.findMany({
      where: { parentId: foundDocument.id },
    });

    let selectedUpload = [],
      selectedDownload = [],
      selectedView = [],
      fullAccess = [];

    const processChild = async (child) => {
      const fileAbsolutePath = path.join(
        __dirname,
        "../../../../storage",
        child.path
      );
      try {
        await fs.stat(fileAbsolutePath);
        const childId = child.id.toString();
        const childParents = await getParentIds(child.id);

        const obj = {
          id: childId,
          upload: false,
          download: false,
          view: false,
        };

        // Check full access permissions
        const hasFullAccessUpload = fullAccessUploadable.some(
          (id) =>
            childParents.includes(id.toString()) || id.toString() === childId
        );
        const hasFullAccessDownload = fullAccessDownloadable.some(
          (id) =>
            childParents.includes(id.toString()) || id.toString() === childId
        );
        const hasFullAccessRead = fullAccessReadable.some(
          (id) =>
            childParents.includes(id.toString()) || id.toString() === childId
        );

        if (hasFullAccessUpload || hasFullAccessDownload || hasFullAccessRead) {
          obj.upload = hasFullAccessUpload || uploadableArray.includes(childId);
          obj.download =
            hasFullAccessDownload || downloadableArray.includes(childId);
          obj.view = hasFullAccessRead || readableArray.includes(childId);
          fullAccess.push(obj);
        }

        if (uploadableArray.includes(childId)) selectedUpload.push(childId);
        if (downloadableArray.includes(childId)) selectedDownload.push(childId);
        if (readableArray.includes(childId)) selectedView.push(childId);

        return {
          id: childId,
          name: child.name,
          path: `..${child.path.substring(19)}/${child.name}`,
          type: child.type,
          children: [],
        };
      } catch (error) {
        return null;
      }
    };

    const processedChildren = await Promise.all(children.map(processChild));
    const result = processedChildren.filter((child) => child !== null);

    res.status(200).json({
      children: result,
      selectedUpload: Array.from(new Set(selectedUpload)),
      selectedDownload: Array.from(new Set(selectedDownload)),
      selectedView: Array.from(new Set(selectedView)),
      fullAccess: Array.from(
        new Set(fullAccess.map((obj) => JSON.stringify(obj)))
      ).map((str) => JSON.parse(str)),
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error accessing document" });
  }
};
