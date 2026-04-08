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

    // Fetch user with roles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch departments the user is part of
    const userDepartments = await prisma.department.findMany({
      where: { users: { some: { id: userId } } },
      select: { id: true },
    });

    const roleIds = user.roles.map((userRole) => userRole.roleId);
    const deptIds = userDepartments.map((d) => d.id);

    let rootDocuments = await prisma.document.findMany({
      where: { isProject: true },
    });

    if (!rootDocuments.length) {
      return res.status(200).json({ children: [] });
    }

    // Fetch all active workflows to build the virtual map
    const activeWorkflows = await prisma.workflow.findMany({
      where: { isActive: true },
      select: { id: true, name: true, parentWorkflowId: true },
    });

    const hideLiteralWorkflowNames = new Set(
      activeWorkflows
        .filter((w) => w.parentWorkflowId !== null)
        .map((w) => w.name),
    );

    rootDocuments = rootDocuments.filter((doc) => {
      if (doc.type === "folder" && hideLiteralWorkflowNames.has(doc.name)) {
        return false;
      }
      return true;
    });

    // ✅ FIX 1: Fetch ALL document accesses including department matches
    const allUserAccesses = await prisma.documentAccess.findMany({
      where: {
        OR: [
          { userId: userId },
          { roleId: { in: roleIds } },
          { departmentId: { in: deptIds } },
        ],
      },
      select: { documentId: true, accessType: true, accessLevel: true },
    });

    // Organize explicit access by document
    const documentAccessMap = new Map();
    allUserAccesses.forEach((access) => {
      if (!documentAccessMap.has(access.documentId)) {
        documentAccessMap.set(access.documentId, {
          readable: false,
          writable: false,
          uploadable: false,
          downloadable: false,
          isFullAccess: access.accessLevel === "FULL",
        });
      }
      const docAccess = documentAccessMap.get(access.documentId);
      if (access.accessLevel === "FULL") {
        docAccess.readable =
          docAccess.writable =
          docAccess.uploadable =
          docAccess.downloadable =
          docAccess.isFullAccess =
            true;
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

    // ✅ FIX 2: Prepare explicit paths & workflow resolution helper
    const accessibleDocIds = allUserAccesses.map((a) => a.documentId);
    const accessibleDocs = await prisma.document.findMany({
      where: { id: { in: accessibleDocIds } },
      select: { path: true },
    });
    const accessiblePaths = accessibleDocs.map((d) => d.path);

    const getFolderPrefixes = (docName, docPath) => {
      const prefixes = [docPath + "/"];
      const workflow = activeWorkflows.find((w) => w.name === docName);
      if (workflow) {
        const descendants = new Set();
        let currentLevelIds = [workflow.id];
        while (currentLevelIds.length > 0) {
          const children = activeWorkflows.filter((w) =>
            currentLevelIds.includes(w.parentWorkflowId),
          );
          children.forEach((c) => descendants.add(c.name));
          currentLevelIds = children.map((c) => c.id);
        }
        descendants.forEach((name) => {
          const prefix = `/${name}/`;
          if (!prefixes.includes(prefix)) prefixes.push(prefix);
        });
      }
      return prefixes;
    };

    // Filter documents based on direct OR deeply nested permissions
    const accessibleRootDocuments = rootDocuments.filter((doc) => {
      if (user.username === "admin" || user.isAdmin || user.specialUser)
        return true;

      // Check direct access
      const access = documentAccessMap.get(doc.id);
      if (access && (access.readable || access.writable)) return true;

      // Check logical nested access
      if (doc.type === "folder") {
        const allowedPrefixes = getFolderPrefixes(doc.name, doc.path);
        return accessiblePaths.some((p) =>
          allowedPrefixes.some(
            (prefix) => p.startsWith(prefix) || p === prefix.slice(0, -1),
          ),
        );
      }
      return false;
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const mappedDocuments = await Promise.all(
      accessibleRootDocuments.map(async (doc) => {
        const fileAbsolutePath = path.join(
          __dirname,
          process.env.STORAGE_PATH,
          doc.path.substring(1),
        );
        try {
          const fileStats = await fs.stat(fileAbsolutePath);
          const access = documentAccessMap.get(doc.id) || {};
          return {
            id: doc.id,
            name: doc.name,
            path: `..`,
            type: doc.type,
            createdOn: doc.createdOn,
            createdBy: doc.createdById,
            lastUpdated: fileStats.mtime,
            lastAccessed: fileStats.atime,
            size: fileStats.size,
            isUploadable:
              user.username === "admin" ||
              user.isAdmin ||
              user.specialUser ||
              access.uploadable,
            isDownloadable:
              user.username === "admin" ||
              user.isAdmin ||
              user.specialUser ||
              access.downloadable,
            children: [],
          };
        } catch (err) {
          return null;
        }
      }),
    );

    return res
      .status(200)
      .json({ children: mappedDocuments.filter((doc) => doc !== null) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getRootDocumentsForEdit = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized")
      return res.status(401).json({ message: "Unauthorized request" });

    const roleId = Number(req.body.role);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    if (!roleId)
      return res.status(400).json({ message: "Role ID is required" });

    const roleAccesses = await prisma.documentAccess.findMany({
      where: {
        roleId: roleId,
        OR: [
          { docAccessThrough: "ADMINISTRATION" },
          { docAccessThrough: "SELF" },
        ],
      },
      include: { document: { select: { id: true, parentId: true } } },
    });

    const selectedUpload = [];
    const selectedDownload = [];
    const selectedView = [];
    const fullAccess = [];

    roleAccesses.forEach((access) => {
      if (access.accessLevel === "FULL") {
        fullAccess.push({
          id: access.documentId,
          upload: true,
          download: true,
          view: true,
        });
      } else {
        if (access.accessType.includes("EDIT"))
          selectedUpload.push(access.documentId);
        if (access.accessType.includes("DOWNLOAD"))
          selectedDownload.push(access.documentId);
        if (access.accessType.includes("READ"))
          selectedView.push(access.documentId);
      }
    });

    let rootDocuments = await prisma.document.findMany({
      where: { isProject: true, parentId: null },
      include: {
        children: { select: { id: true, name: true, path: true, type: true } },
      },
    });

    if (!rootDocuments.length)
      return res.status(400).json({ message: "No root documents found" });

    const activeWorkflows = await prisma.workflow.findMany({
      where: { isActive: true },
      select: { id: true, name: true, parentWorkflowId: true },
    });

    const hideLiteralWorkflowNames = new Set(
      activeWorkflows
        .filter((w) => w.parentWorkflowId !== null)
        .map((w) => w.name),
    );

    const accessibleDocIds = roleAccesses.map((a) => a.documentId);
    const accessibleDocs = await prisma.document.findMany({
      where: { id: { in: accessibleDocIds } },
      select: { path: true },
    });
    const accessiblePaths = accessibleDocs.map((d) => d.path);

    const getFolderPrefixes = (docName, docPath) => {
      const prefixes = [docPath + "/"];
      const workflow = activeWorkflows.find((w) => w.name === docName);
      if (workflow) {
        const descendants = new Set();
        let currentLevelIds = [workflow.id];
        while (currentLevelIds.length > 0) {
          const childrenWfs = activeWorkflows.filter((w) =>
            currentLevelIds.includes(w.parentWorkflowId),
          );
          childrenWfs.forEach((c) => descendants.add(c.name));
          currentLevelIds = childrenWfs.map((c) => c.id);
        }
        descendants.forEach((name) => {
          const prefix = `/${name}/`;
          if (!prefixes.includes(prefix)) prefixes.push(prefix);
        });
      }
      return prefixes;
    };

    rootDocuments = rootDocuments.filter((doc) => {
      if (doc.type === "folder" && hideLiteralWorkflowNames.has(doc.name))
        return false;

      const hasDirectAccess = roleAccesses.some(
        (access) => access.documentId === doc.id,
      );
      if (hasDirectAccess) return true;

      if (doc.type === "folder") {
        const allowedPrefixes = getFolderPrefixes(doc.name, doc.path);
        return accessiblePaths.some((p) =>
          allowedPrefixes.some(
            (prefix) => p.startsWith(prefix) || p === prefix.slice(0, -1),
          ),
        );
      }
      return false;
    });

    const childrenData = await Promise.all(
      rootDocuments.map(async (doc) => {
        const fileAbsolutePath = path.join(
          __dirname,
          process.env.STORAGE_PATH,
          doc.path,
        );
        try {
          const fileStats = await fs.stat(fileAbsolutePath);
          const hasFullAccess = roleAccesses.some(
            (access) =>
              access.documentId === doc.id && access.accessLevel === "FULL",
          );

          if (hasFullAccess) {
            doc.children.forEach((child) => {
              if (child.type === "folder") {
                fullAccess.push({
                  id: child.id,
                  upload: true,
                  download: true,
                  view: true,
                });
              } else {
                selectedUpload.push(child.id);
                selectedDownload.push(child.id);
                selectedView.push(child.id);
              }
            });
          }

          return {
            id: doc.id,
            name: doc.name,
            path: `../${doc.name}`,
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
          return null;
        }
      }),
    );

    const filteredChildren = childrenData.filter((doc) => doc !== null);

    return res.status(200).json({
      children: filteredChildren,
      selectedUpload: Array.from(new Set(selectedUpload)),
      selectedDownload: Array.from(new Set(selectedDownload)),
      selectedView: Array.from(new Set(selectedView)),
      fullAccess: Array.from(
        new Set(fullAccess.map((obj) => JSON.stringify(obj))),
      ).map((str) => JSON.parse(str)),
    });
  } catch (error) {
    console.error("Error in getRootDocumentsForEdit:", error);
    return res.status(500).json({ message: "Error accessing documents" });
  }
};
