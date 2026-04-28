// controllers/sidebar-config-controller.js

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// All possible sidebar routes with their default labels
const DEFAULT_ROUTES = [
  { routeKey: "dashboard", label: "Dashboard" },
  { routeKey: "files", label: "File System" },
  { routeKey: "search", label: "Deep Search" },
  { routeKey: "bin", label: "Recycle Bin" },
  { routeKey: "archive", label: "Archive Files" },
  { routeKey: "bookmark", label: "Bookmarked Files" },
  { routeKey: "workflows", label: "Workflows" },
  { routeKey: "physical-document", label: "Physical Document" },
  { routeKey: "meta-data", label: "Meta Data Form" },
  { routeKey: "departments", label: "Departments" },
  { routeKey: "roles", label: "Roles" },
  { routeKey: "users", label: "Users" },
  { routeKey: "reports", label: "Reports" },
  { routeKey: "processes", label: "Processes" },
  { routeKey: "logs", label: "Logs" },
  { routeKey: "recommendations", label: "Recommendations" },
  { routeKey: "physicalDocuments", label: "Documents Tracking" },
];

// GET /sidebar-config — returns config (seeds defaults if missing)
export const getSidebarConfig = async (req, res) => {
  try {
    // Seed any missing rows with defaults (all visible)
    for (const route of DEFAULT_ROUTES) {
      await prisma.sidebarConfig.upsert({
        where: { routeKey: route.routeKey },
        update: {},
        create: {
          routeKey: route.routeKey,
          label: route.label,
          showToAdmin: true,
          showToDepartmentHead: true,
          showToRootLevel: true,
          showToNormal: true,
        },
      });
    }

    const configs = await prisma.sidebarConfig.findMany({
      orderBy: { id: "asc" },
    });

    res.status(200).json(configs);
  } catch (error) {
    console.error("Error fetching sidebar config:", error);
    res.status(500).json({ message: "Error fetching sidebar config" });
  }
};

// PUT /sidebar-config — bulk update all toggles
export const updateSidebarConfig = async (req, res) => {
  try {
    const updates = req.body; // Array of { routeKey, showToAdmin, showToDepartmentHead, showToRootLevel, showToNormal }

    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: "Expected an array of updates" });
    }

    for (const item of updates) {
      await prisma.sidebarConfig.update({
        where: { routeKey: item.routeKey },
        data: {
          showToAdmin: item.showToAdmin,
          showToDepartmentHead: item.showToDepartmentHead,
          showToRootLevel: item.showToRootLevel,
          showToNormal: item.showToNormal,
        },
      });
    }

    res.status(200).json({ message: "Sidebar config updated successfully" });
  } catch (error) {
    console.error("Error updating sidebar config:", error);
    res.status(500).json({ message: "Error updating sidebar config" });
  }
};
