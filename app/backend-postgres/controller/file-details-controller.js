import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import { dirname, join } from "path";
import { access, read } from "fs";
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
      return res.status(404).json({ message: "User not found" });
    }

    // Get all document accesses for the user
    const userDocumentAccesses = await prisma.documentAccess.findMany({
      where: {
        OR: [
          { userId: user.id },
          { roleId: { in: user.roles.map((r) => r.roleId) } },
        ],
      },
    });

    // Check if user is admin
    const isAdmin = user.username === "admin" || user.isAdmin;

    let docPath = req.body.path;
    docPath = docPath.substring(2);

    // Find the document with its children
    const foundDocument = await prisma.document.findUnique({
      where: { path: docPath },
      include: {
        children: true,
      },
    });

    if (!foundDocument) {
      return res.status(400).json({
        message: "Document doesn't exist",
      });
    }

    // Get parent documents for full access checks
    const parents = await getParents([foundDocument.id]);

    // Create access map
    const accessMap = new Map();
    userDocumentAccesses.forEach((access) => {
      if (!accessMap.has(access.documentId)) {
        accessMap.set(access.documentId, {
          readable: false,
          writable: false,
          uploadable: false,
          downloadable: false,
          isFullAccess: access.accessLevel === "FULL",
        });
      }

      const docAccess = accessMap.get(access.documentId);

      if (access.accessLevel === "FULL") {
        docAccess.readable = true;
        docAccess.writable = true;
        docAccess.uploadable = true;
        docAccess.downloadable = true;
        docAccess.isFullAccess = true;
      } else {
        access.accessType.forEach((type) => {
          if (type === "READ") docAccess.readable = true;
          if (type === "EDIT") {
            docAccess.writable = true;
            docAccess.uploadable = true;
          }
          if (type === "DOWNLOAD") docAccess.downloadable = true;
        });
      }
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    let children;

    if (isAdmin || user.specialUser) {
      // Admin or special user gets all children with full permissions
      children = await Promise.all(
        foundDocument.children.map(async (child) => {
          const fileAbsolutePath = path.join(
            __dirname,
            STORAGE_PATH,
            child.path
          );
          const createdBy = await prisma.user.findUnique({
            where: { id: child.createdById },
            select: { username: true },
          });

          try {
            const fileStats = !child.onlyMetaData
              ? await fs.stat(fileAbsolutePath)
              : null;

            return {
              id: child.id,
              path: `${child.path.slice(0, -child.name.length - 1)}`,
              name: child.name,
              type: child.type,
              isArchived: child.isArchived ?? false,
              inBin: child.inBin ?? false,
              createdOn: child.createdOn,
              isInvolvedInProcess: child.isInvolvedInProcess ?? false,
              createdBy: createdBy?.username,
              lastUpdated: fileStats ? fileStats.mtime : null,
              lastAccessed: fileStats ? fileStats.atime : null,
              size: fileStats ? fileStats.size : null,
              isUploadable: true,
              isDownloadable: true,
              isRejected: child.isRejected ?? false,
              children: [],
              onlyMetaData: child.onlyMetaData,
            };
          } catch (error) {
            return null;
          }
        })
      );

      console.log(foundDocument.children.map((item) => item.id));
    } else {
      // Regular user - filter based on permissions
      children = await Promise.all(
        foundDocument.children
          .filter((child) => {
            // Check if user has any access to this child
            const hasAccess = userDocumentAccesses.some(
              (userAccess) =>
                (userAccess.documentId === child.id ||
                  (userAccess.accessLevel === "FULL" &&
                    parents.includes(userAccess.documentId))) &&
                (userAccess.accessType.includes("READ") ||
                  userAccess.accessType.includes("DOWNLOAD") ||
                  userAccess.accessType.includes("EDIT"))
            );
            return hasAccess;
          })
          .map(async (child) => {
            const fileAbsolutePath = path.join(
              __dirname,
              process.env.STORAGE_PATH,
              child.path
            );

            const createdBy = await prisma.user.findUnique({
              where: { id: child.createdById },
              select: { username: true },
            });

            try {
              const fileStats = !child.onlyMetaData
                ? await fs.stat(fileAbsolutePath)
                : null;

              // Check specific permissions for this document
              const documentAccess = userDocumentAccesses.find(
                (access) => access.documentId === child.id
              );

              // Check for inherited full access
              const hasFullAccess = userDocumentAccesses.some(
                (access) =>
                  access.accessLevel === "FULL" &&
                  parents.includes(access.documentId)
              );

              return {
                id: child.id,
                path: `${child.path.slice(0, -child.name.length - 1)}`,
                name: child.name,
                isArchived: child.isArchived ?? false,
                inBin: child.inBin ?? false,
                type: child.type,
                createdOn: child.createdOn,
                isInvolvedInProcess: child.isInvolvedInProcess ?? false,
                createdBy: createdBy?.username,
                lastUpdated: fileStats ? fileStats.mtime : null,
                lastAccessed: fileStats ? fileStats.atime : null,
                size: fileStats ? fileStats.size : null,
                isRejected: child.isRejected ?? false,
                isDownloadable:
                  user.id === child.createdById ||
                  (documentAccess?.accessType.includes("DOWNLOAD") ?? false) ||
                  (hasFullAccess && child.type !== "folder"),
                children: [],
                onlyMetaData: child.onlyMetaData,
              };
            } catch (error) {
              return null;
            }
          })
      );
    }

    let result = await Promise.all(children);
    result = result.filter((item) => item !== null);

    ///1. isArchived, 2. inBin 3. isArchived & inBin
    console.log("section type", req.body.sectionType);
    if (req.body.sectionType) {
      result = result.filter(
        (item) => item[`${req.body.sectionType}`] === true
      );
    } else {
      result = result.filter(
        (item) =>
          (item.inBin === false && item.isArchived === false) ||
          (!item.inBin && !item.isArchived)
      );
    }
    // Check if user can upload to this directory
    const canUpload = isAdmin
      ? true
      : foundDocument.createdById === user.id
      ? true
      : userDocumentAccesses.some(
          (access) =>
            (access.documentId === foundDocument.id ||
              (access.accessLevel === "FULL" &&
                parents.includes(access.documentId))) &&
            access.accessType.includes("EDIT")
        );

    res.status(200).json({
      children: result,
      isUploadable: canUpload,
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "Error accessing given document",
    });
  }
};

export const getDocumentDetailsOnTheBasisOfPathForEdit = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    // Get role document accesses
    const roleDocumentAccesses = await prisma.documentAccess.findMany({
      where: { roleId: parseInt(req.body.role) },
    });

    let documentPath = req.body.path;
    documentPath = documentPath.substring(2);

    // Find the document with its children
    const foundDocument = await prisma.document.findUnique({
      where: { path: documentPath },
      include: {
        children: true,
      },
    });

    if (!foundDocument) {
      return res.status(400).json({
        message: "Document doesn't exist",
      });
    }

    // Get parent documents for full access checks
    const parents = await getParents([foundDocument.id]);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    let selectedUpload = [];
    let selectedDownload = [];
    let selectedView = [];
    let fullAccess = [];

    if (foundDocument) {
      const children = await Promise.all(
        foundDocument.children.map(async (child) => {
          const fileAbsolutePath = path.join(__dirname, child.path);
          try {
            await fs.stat(fileAbsolutePath);

            let obj = {
              id: child.id,
              upload: false,
              download: false,
              view: false,
            };

            const childParents = await getParents([child.id]);

            // Check for full access permissions (direct or inherited)
            const hasFullAccess = roleDocumentAccesses.some(
              (access) =>
                access.accessLevel === "FULL" &&
                (access.documentId === child.id ||
                  childParents.includes(access.documentId))
            );

            if (hasFullAccess) {
              if (child.type === "folder") {
                obj.upload = true;
                obj.download = true;
                obj.view = true;
                fullAccess.push(obj);
              } else {
                selectedUpload.push(child.id);
                selectedDownload.push(child.id);
                selectedView.push(child.id);
              }
            } else {
              // Check standard permissions
              const documentAccess = roleDocumentAccesses.find(
                (access) => access.documentId === child.id
              );

              if (documentAccess) {
                if (documentAccess.accessType.includes("EDIT")) {
                  if (child.type === "folder") {
                    obj.upload = true;
                  } else {
                    selectedUpload.push(child.id);
                  }
                }
                if (documentAccess.accessType.includes("DOWNLOAD")) {
                  if (child.type === "folder") {
                    obj.download = true;
                  } else {
                    selectedDownload.push(child.id);
                  }
                }
                if (documentAccess.accessType.includes("READ")) {
                  if (child.type === "folder") {
                    obj.view = true;
                  } else {
                    selectedView.push(child.id);
                  }
                }
              }
            }

            return {
              id: child.id,
              name: child.name,
              path: `..${child.path.substring(19)}`,
              type: child.type,
              children: [],
            };
          } catch (error) {
            return null;
          }
        })
      );

      let result = await Promise.all(children);
      result = result.filter((item) => item !== null);

      res.status(200).json({
        children: result,
        selectedUpload: Array.from(new Set(selectedUpload)),
        selectedDownload: Array.from(new Set(selectedDownload)),
        selectedView: Array.from(new Set(selectedView)),
        fullAccess: Array.from(
          new Set(fullAccess.map((obj) => JSON.stringify(obj)))
        ).map((str) => JSON.parse(str)),
      });
    } else {
      res.status(400).json({
        message: "Document doesn't exist",
      });
    }
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "Error accessing given document",
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
              false,
              "STANDARD"
            );
          }
        }
      }

      // Assign read permissions
      for (let j = 0; j < obj.read.length; j++) {
        await createUserPermissions(
          document.id,
          obj.read[j],
          false,
          "STANDARD"
        );
      }

      // Assign write permissions
      for (let k = 0; k < obj.write.length; k++) {
        await createUserPermissions(
          document.id,
          obj.write[k],
          true,
          "STANDARD"
        );
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

const createUserPermissions = async (
  documentId,
  userId,
  isWritable,
  accessLevel
) => {
  try {
    const existingPermission = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingPermission) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const accessTypes = isWritable ? ["READ", "EDIT"] : ["READ"];

    // Check if permission already exists
    const existingAccess = await prisma.documentAccess.findFirst({
      where: {
        documentId,
        userId,
        accessType: {
          hasSome: accessTypes,
        },
      },
    });

    if (!existingAccess) {
      // Create new permission
      await prisma.documentAccess.create({
        data: {
          documentId,
          userId,
          accessType: accessTypes,
          accessLevel,
          docAccessThrough: "ADMINISTRATION",
          grantedById: userId, // Assuming self-granted for now
        },
      });
    } else {
      // Update existing permission
      await prisma.documentAccess.update({
        where: { id: existingAccess.id },
        data: {
          accessType: {
            set: [...new Set([...existingAccess.accessType, ...accessTypes])],
          },
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
        department: true,
        history: true,
        highlights: true,
        children: true,
        parent: true,
        isArchived: true,
        isInBin: true,
        documentAccesses: {
          include: {
            user: true,
            role: true,
            department: true,
          },
        },
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

export const search_documents = async (req, res) => {
  try {
    const {
      name,
      tags,
      partNumber,
      isArchived,
      inBin,
      createdByUsername,
      processName,
      processId,
      description,
      preApproved,
      superseding,
      page = "1",
      pageSize = "10",
    } = req.query;

    // Convert string parameters to appropriate types
    const parsedPartNumber = partNumber ? parseInt(partNumber, 10) : undefined;
    const parsedPage = parseInt(page, 10);
    const parsedPageSize = parseInt(pageSize, 10);

    // Validate inputs
    if (partNumber && isNaN(parsedPartNumber)) {
      return res.status(400).json({ error: "Invalid partNumber format" });
    }
    if (isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({ error: "Invalid page number" });
    }
    if (isNaN(parsedPageSize) || parsedPageSize < 1) {
      return res.status(400).json({ error: "Invalid page size" });
    }

    // Parse tags
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
        if (!Array.isArray(parsedTags)) {
          parsedTags = tags.split(",").map((tag) => tag.trim());
        }
      } catch (e) {
        parsedTags = tags.split(",").map((tag) => tag.trim());
      }
    }

    // Build the where clause
    const where = {
      AND: [
        name ? { name: { contains: name, mode: "insensitive" } } : {},
        parsedTags.length > 0 ? { tags: { hasSome: parsedTags } } : {},
        isArchived !== undefined ? { isArchived: isArchived === "true" } : {},
        inBin !== undefined ? { inBin: inBin === "true" } : {},
        createdByUsername
          ? {
              createdBy: {
                username: { contains: createdByUsername, mode: "insensitive" },
              },
            }
          : {},
      ],
    };

    // Add ProcessDocument-related conditions
    if (
      parsedPartNumber ||
      processId ||
      processName ||
      description ||
      preApproved !== undefined ||
      superseding !== undefined
    ) {
      where.processDocuments = {
        some: {
          AND: [
            parsedPartNumber ? { partNumber: parsedPartNumber } : {},
            processId ? { processId } : {},
            processName
              ? {
                  process: {
                    name: { contains: processName, mode: "insensitive" },
                  },
                }
              : {},
            description
              ? { description: { contains: description, mode: "insensitive" } }
              : {},
            preApproved !== undefined
              ? { preApproved: preApproved === "true" }
              : {},
            superseding !== undefined
              ? { superseding: superseding === "true" }
              : {},
          ],
        },
      };
    }

    // Log the where clause for debugging
    console.log("Where clause:", JSON.stringify(where, null, 2));

    // Execute the query
    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        path: true,
        tags: true,
        name: true,
        isArchived: true,
        inBin: true,
        createdBy: {
          select: {
            username: true,
          },
        },
        processDocuments: {
          select: {
            partNumber: true,
            processId: true,
            description: true,
            preApproved: true,
            superseding: true,
            process: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      skip: (parsedPage - 1) * parsedPageSize,
      take: parsedPageSize,
      orderBy: { createdOn: "desc" },
    });

    // Transform the response
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      path: doc.path,
      tags: doc.tags,
      name: doc.name,
      isArchived: doc.isArchived,
      inBin: doc.inBin,
      createdByUsername: doc.createdBy?.username || null, // Fixed typo: cr -> createdBy
      partNumber: doc.processDocuments[0]?.partNumber || null,
      processId: doc.processDocuments[0]?.processId || null,
      processName: doc.processDocuments[0]?.process?.name || null,
      description: doc.processDocuments[0]?.description || null,
      preApproved: doc.processDocuments[0]?.preApproved || null,
      superseding: doc.processDocuments[0]?.superseding || null,
    }));

    // Get total count for pagination
    const totalCount = await prisma.document.count({ where });

    res.status(200).json({
      data: formattedDocuments,
      pagination: {
        page: parsedPage,
        pageSize: parsedPageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / parsedPageSize),
      },
    });
  } catch (error) {
    console.error("Error searching documents:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};
