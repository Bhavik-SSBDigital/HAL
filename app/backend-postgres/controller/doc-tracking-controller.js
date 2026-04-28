import fs from "fs/promises";
import { createWriteStream, createReadStream, read } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, normalize, extname, basename } from "path";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fsCB from "fs";
import sharp from "sharp";
import path from "path";
import axios from "axios";
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
import { execSync } from "child_process";

const prisma = new PrismaClient();

dotnev.config();

export const checkIfUserIsAdmin = async (userData) => {
  try {
    // Get user with their authorizer status
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userData.id) },
      select: {
        isAdmin: true,
        isKeeperOfPhysicalDocs: true,
      },
    });

    // Get user roles
    const roles = await prisma.role.findMany({
      where: { id: { in: userData.roles } },
      select: { isAdmin: true, departmentId: true },
    });

    // User is considered admin if they have admin role, or user.isAdmin, or user.isKeeperOfPhysicalDocs
    const isAdmin =
      roles.some((role) => role.isAdmin) ||
      user.isAdmin ||
      user.isKeeperOfPhysicalDocs;
    return isAdmin;
  } catch (error) {
    console.error("Error checking if user is admin:", error);
    return false;
  }
};

export const checkIfUserIsAdminOrAuthorized = async (userData) => {
  try {
    // Get user with their authorizer status
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userData.id) },
      select: {
        isAdmin: true,
        isKeeperOfPhysicalDocs: true,
      },
    });

    // Get user roles
    const roles = await prisma.role.findMany({
      where: { id: { in: userData.roles } },
      select: { isAdmin: true, departmentId: true },
    });

    // User can act as admin if they have admin role, or user.isAdmin, or user.isKeeperOfPhysicalDocs
    const canActAsAdmin =
      roles.some((role) => role.isAdmin) ||
      user.isAdmin ||
      user.isKeeperOfPhysicalDocs;
    return canActAsAdmin;
  } catch (error) {
    console.error("Error checking if user is admin or authorized:", error);
    return false;
  }
};

// POST /physical-requests
export const create_physical_request = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    let { documentId, departmentId, reason } = req.body;

    departmentId = parseInt(departmentId);
    documentId = parseInt(documentId);
    if (!documentId || !departmentId || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId: userData.id },
    });

    const roles = await prisma.role.findMany({
      where: { id: { in: userRoles.map((userRole) => userRole.roleId) } },
      select: { departmentId: true },
    });

    const branches = roles.map((role) => role.departmentId);

    // Verify user has access to the department
    if (!branches.includes(departmentId)) {
      return res.status(403).json({ message: "No access to this department" });
    }

    const request = await prisma.physicalDocumentRequest.create({
      data: {
        documentId,
        departmentId,
        requestingUserId: userData.id,
        reason,
        status: "PENDING_ADMIN_APPROVAL",
      },
      include: {
        document: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        requestingUser: { select: { id: true, name: true } },
        messages: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    return res.status(201).json(request);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /physical-requests

export const get_physical_requests = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    let roles = await prisma.userRole.findMany({
      where: { userId: userData.id },
      include: { role: true },
    });

    roles = roles.map((r) => r.role);

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userData.id) },
      select: {
        isAdmin: true,
        isKeeperOfPhysicalDocs: true,
      },
    });

    // Check if user can act as admin (admin or authorized user)
    const canActAsAdmin =
      roles.some((role) => role.isAdmin) ||
      user.isAdmin ||
      user.isKeeperOfPhysicalDocs;
    const isDepartmentHead = roles.some((role) => role.isDepartmentHead);

    const role =
      req.query.role ||
      (canActAsAdmin ? "admin" : isDepartmentHead ? "hod" : "user");

    console.log("role", role);

    // Base where condition
    let whereCondition = {};

    if (role === "user") {
      whereCondition.requestingUserId = parseInt(userData.id);
    } else if (role === "hod") {
      console.log("roles", roles);
      const hodDepartments = roles
        .filter((r) => r.isDepartmentHead)
        .map((r) => r.departmentId);
      whereCondition.departmentId = { in: hodDepartments };
    }
    // For admin, no where condition needed - both admin and authorized users see all requests

    // Common include configuration
    const includeConfig = {
      document: { select: { id: true, name: true, path: true } },
      department: { select: { id: true, name: true } },
      requestingUser: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  role: true,
                  isAdmin: true,
                  isDepartmentHead: true,
                  departmentId: true,
                  branch: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
          branches: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    };

    const requests = await prisma.physicalDocumentRequest.findMany({
      where: whereCondition,
      include: includeConfig,
    });

    // Format the response to include user details in a structured way
    const formattedRequests = requests.map((request) => ({
      ...request,
      requestingUser: {
        id: request.requestingUser.id,
        username: request.requestingUser.username,
        name: request.requestingUser.name,
        email: request.requestingUser.email,
        roles: request.requestingUser.roles.map((userRole) => ({
          id: userRole.role.id,
          role: userRole.role.role,
          isAdmin: userRole.role.isAdmin,
          isDepartmentHead: userRole.role.isDepartmentHead,
          departmentId: userRole.role.departmentId,
          department: userRole.role.branch,
        })),
        departments: request.requestingUser.branches,
      },
    }));

    return res.status(200).json(formattedRequests);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const get_physical_request_messages = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }
    const { id } = req.params;

    // 1. UPDATED: Include requestingUser data so we can build the initial message
    const request = await prisma.physicalDocumentRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: true,
        requestingUser: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    role: true,
                    isAdmin: true,
                    isDepartmentHead: true,
                    departmentId: true,
                    branch: { select: { id: true, name: true, code: true } },
                  },
                },
              },
            },
            branches: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Get user info to check admin/authorized status
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userData.id) },
      select: { isAdmin: true, isKeeperOfPhysicalDocs: true },
    });

    // Get user roles to check admin roles
    const roles = await prisma.role.findMany({
      where: { id: { in: userData.roles } },
      select: { isAdmin: true, departmentId: true },
    });

    const canActAsAdmin =
      roles.some((role) => role.isAdmin) ||
      user.isAdmin ||
      user.isKeeperOfPhysicalDocs;
    const isHod = await checkHodRole(userData, request.departmentId);
    const isRequestingUser = parseInt(userData.id) === request.requestingUserId;

    if (!canActAsAdmin && !isHod && !isRequestingUser) {
      return res.status(403).json({ message: "No access to this request" });
    }

    // Get messages with original structure
    const messages = await prisma.physicalRequestMessage.findMany({
      where: { requestId: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    role: true,
                    isAdmin: true,
                    isDepartmentHead: true,
                    departmentId: true,
                    branch: { select: { id: true, name: true, code: true } },
                  },
                },
              },
            },
            branches: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Format messages
    const formattedMessages = messages.map((message) => ({
      id: message.id,
      requestId: message.requestId,
      userId: message.userId,
      message: message.message,
      createdAt: message.createdAt,
      previousStatus: message.previousStatus,
      newStatus: message.newStatus,
      changerRole: message.changerRole,
      user: {
        id: message.user.id,
        name: message.user.name,
        username: message.user.username,
        email: message.user.email,
        roles: message.user.roles.map((userRole) => ({
          id: userRole.role.id,
          role: userRole.role.role,
          isAdmin: userRole.role.isAdmin,
          isDepartmentHead: userRole.role.isDepartmentHead,
          departmentId: userRole.role.departmentId,
          department: userRole.role.branch,
        })),
        departments: message.user.branches,
      },
    }));

    // 2. NEW: Construct the initial request message from the parent record
    const initialMessage = {
      id: `req-${request.id}`, // Fake ID so React keys don't clash
      requestId: request.id,
      userId: request.requestingUserId,
      message: request.reason, // Pulling the initial reason here!
      createdAt: request.createdAt,
      previousStatus: null,
      newStatus: "PENDING_ADMIN_APPROVAL", // The state it started in
      changerRole: "REQUESTER",
      user: {
        id: request.requestingUser.id,
        name: request.requestingUser.name,
        username: request.requestingUser.username,
        email: request.requestingUser.email,
        roles: request.requestingUser.roles.map((userRole) => ({
          id: userRole.role.id,
          role: userRole.role.role,
          isAdmin: userRole.role.isAdmin,
          isDepartmentHead: userRole.role.isDepartmentHead,
          departmentId: userRole.role.departmentId,
          department: userRole.role.branch,
        })),
        departments: request.requestingUser.branches,
      },
    };

    // 3. Prepend the initial request to the beginning of the log
    formattedMessages.unshift(initialMessage);

    return res.status(200).json(formattedMessages);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /physical-requests/:id
export const update_physical_request = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { id } = req.params;
    const { action, message } = req.body;
    if (!action) {
      return res.status(400).json({ message: "Missing action" });
    }

    const request = await prisma.physicalDocumentRequest.findUnique({
      where: { id: parseInt(id) },
      include: { department: true },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const canActAsAdmin = await checkIfUserIsAdminOrAuthorized(userData);
    const isHod = await checkHodRole(userData, request.departmentId);
    const isRequestingUser = userData.id === request.requestingUserId;

    console.log("can act as admin", canActAsAdmin);
    console.log("is hod", isHod);
    console.log("is requesting user", isRequestingUser);

    // Validate action permissions
    let newStatus;
    let changerRole = null;

    if (canActAsAdmin) {
      changerRole = "ADMIN";
      if (
        request.status === "PENDING_ADMIN_APPROVAL" ||
        request.status === "HOD_APPROVED"
      ) {
        if (action === "approve") newStatus = "ADMIN_APPROVED";
        else if (action === "reject") newStatus = "ADMIN_REJECTED";
        else if (action === "sendToHod") newStatus = "PENDING_HOD_APPROVAL";
        else if (action === "queryUser") newStatus = "PENDING_USER_RESPONSE";
      } else if (["ADMIN_APPROVED", "HOD_APPROVED"].includes(request.status)) {
        if (action === "returnDoc") newStatus = "DOC_RETURNED";
        else if (action === "scrapDoc") newStatus = "DOC_SCRAPPED";
        else if (action === "queryUser") newStatus = "PENDING_USER_RESPONSE";
      }
    } else if (isHod && request.status === "PENDING_HOD_APPROVAL") {
      changerRole = "HOD";
      if (action === "approve") newStatus = "HOD_APPROVED";
      else if (action === "reject") newStatus = "HOD_REJECTED";
      else if (action === "queryUser") newStatus = "PENDING_USER_RESPONSE";
      else if (action === "sendToAdmin") newStatus = "PENDING_ADMIN_APPROVAL";
    } else if (
      isRequestingUser &&
      (request.status === "PENDING_USER_RESPONSE" ||
        request.status === "ADMIN_APPROVED" ||
        request.status === "DOC_RETURNED" ||
        request.status === "DOC_SCRAPPED")
    ) {
      changerRole = "USER";
      if (action === "respond") newStatus = "PENDING_ADMIN_APPROVAL";
      else if (action === "returnDoc") newStatus = "DOC_RETURNED";
      else if (action === "scrapDoc") newStatus = "DOC_SCRAPPED";
    }

    if (!newStatus) {
      return res
        .status(403)
        .json({ message: "Action not allowed for this role or status" });
    }

    // Update request and add message if provided
    const updatedRequest = await prisma.$transaction([
      prisma.physicalDocumentRequest.update({
        where: { id: parseInt(id) },
        data: { status: newStatus, updatedAt: new Date() },
        include: {
          document: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          messages: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      ...(message
        ? [
            prisma.physicalRequestMessage.create({
              data: {
                requestId: parseInt(id),
                userId: userData.id,
                message,
                previousStatus: request.status,
                newStatus: newStatus,
                changerRole: changerRole,
              },
            }),
          ]
        : []),
    ]);

    return res.json(updatedRequest[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /physical-requests/:id/messages
export const add_request_message = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const { id } = req.params;
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Missing message" });
    }

    const request = await prisma.physicalDocumentRequest.findUnique({
      where: { id: parseInt(id) },
      include: { department: true },
    });
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const canActAsAdmin = await checkIfUserIsAdminOrAuthorized(userData);
    const isHod = await checkHodRole(userData, request.departmentId);
    const isRequestingUser = userData.id === request.requestingUserId;

    if (!canActAsAdmin && !isHod && !isRequestingUser) {
      return res.status(403).json({ message: "No access to this request" });
    }

    // If user is responding to a query, update status
    let update;
    let previousStatus;
    let newStatusForMsg;
    let changerRoleForMsg;
    if (isRequestingUser && request.status === "PENDING_USER_RESPONSE") {
      previousStatus = request.status;
      newStatusForMsg = "PENDING_ADMIN_APPROVAL";
      changerRoleForMsg = "USER";
      update = await prisma.physicalDocumentRequest.update({
        where: { id: parseInt(id) },
        data: { status: newStatusForMsg, updatedAt: new Date() },
      });
    }

    const newMessage = await prisma.physicalRequestMessage.create({
      data: {
        requestId: parseInt(id),
        userId: userData.id,
        message,
        ...(update
          ? {
              previousStatus: previousStatus,
              newStatus: newStatusForMsg,
              changerRole: changerRoleForMsg,
            }
          : {}),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to check if user is HOD for a department
export const checkHodRole = async (userData, departmentId) => {
  try {
    const roles = await prisma.role.findMany({
      where: { id: { in: userData.roles } },
      select: { isDepartmentHead: true, departmentId: true },
    });

    const headDepartments = roles
      .filter((role) => role.isDepartmentHead)
      .map((r) => r.departmentId);

    const isHod = headDepartments.some((dept) => dept === departmentId);
    return isHod;
  } catch (error) {
    console.error("Error checking if user is HOD:", error);
    return false;
  }
};
