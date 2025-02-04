import { PrismaClient } from "@prisma/client";
import { verifyUser } from "../utility/verifyUser.js";

const prisma = new PrismaClient();

/**
 * Registers a new department.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
// Add Department Function
export const add_department = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    console.log("User data", userData); // Full user details logged here
    const { code, type, parentDepartmentId, adminId } = req.body;

    const name = req.body.department;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required." });
    }

    // Create department in the database
    const newDepartment = await prisma.department.create({
      data: {
        name,
        code,
        type,
        parentDepartmentId,
        adminId,
        status: "Active",
        createdById: userData.id,
      },
    });

    res.status(201).json({
      message: "Department registered successfully.",
      department: newDepartment,
    });
  } catch (error) {
    console.error("Error registering department:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "A department with this code or name already exists." });
    }
    res
      .status(500)
      .json({ error: "An error occurred while registering the department." });
  }
};

export const get_department = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Department ID is required." });
    }

    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found." });
    }

    res.status(200).json({ department });
  } catch (error) {
    console.error("Error fetching department:", error);
    res.status(500).json({
      error: "An error occurred while retrieving the department.",
    });
  }
};

export const get_departments = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const { status, type, adminId } = req.query;

    // Build filters dynamically
    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (adminId) filters.adminId = parseInt(adminId);

    const departments = await prisma.department.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ departments });
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({
      error: "An error occurred while retrieving the departments.",
    });
  }
};
