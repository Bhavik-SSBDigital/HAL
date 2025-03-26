import { verifyUser } from "../utility/verifyUser.js";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
/**
 * Get users based on the `isRootUser` parameter.
 * - If `isRootUser` is true, return only root-level users.
 * - Otherwise, return all users with basic details.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const get_users = async (req, res) => {
  try {
    const { isRootLevel } = req.query; // Extract isRootUser from query params

    // Convert `isRootUser` to boolean (optional if using a strict frontend)
    // const isRoot = isRootUser === "true";

    // Fetch users from the database
    const users = await prisma.user.findMany({
      where: isRootLevel ? { isRootLevel: true } : {}, // Filter only root users if `isRootUser` is true
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    // Send response
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching users.",
    });
  }
};

export const get_users_with_details = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        branches: {
          select: {
            name: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                role: true,
              },
            },
          },
        },
      },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      departments: user.branches.map((branch) => branch.name),
      roles: user.roles.map((role) => role.role.role),
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const get_user_profile_data = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        username: true,
        branches: {
          select: {
            name: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                role: true,
              },
            },
          },
        },
      },
    });

    const formattedUser = {
      id: user.id,
      username: user.username,
      departments: user.branches.map((branch) => branch.name),
      roles: user.roles.map((role) => role.role.role),
    };

    res
      .status(200)
      .json({
        message: "User profile data retrieved",
        userdata: formattedUser,
      });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const get_user = async (req, res) => {
  try {
    const { userId } = req.params; // Assuming userId is passed as a URL parameter

    // Fetch the user with related data
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                role: true,
                departmentId: true,
                isActive: true,
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
        headOfDepartments: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        adminOfDepartments: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Format the response
    const formattedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      specialUser: user.specialUser,
      isRootLevel: user.isRootLevel,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions: {
        writable: user.writable,
        readable: user.readable,
        downloadable: user.downloadable,
        uploadable: user.uploadable,
      },
      roles: user.roles.map((userRole) => ({
        id: userRole.role.id,
        name: userRole.role.role,
        departmentId: userRole.role.departmentId,
        isActive: userRole.role.isActive,
      })),
      departments: {
        member: user.branches.map((dept) => ({
          id: dept.id,
          name: dept.name,
          code: dept.code,
        })),
        head: user.headOfDepartments.map((dept) => ({
          id: dept.id,
          name: dept.name,
          code: dept.code,
        })),
        admin: user.adminOfDepartments.map((dept) => ({
          id: dept.id,
          name: dept.name,
          code: dept.code,
        })),
      },
    };

    res
      .status(200)
      .json({ message: "User retrieved successfully", data: formattedUser });
  } catch (error) {
    console.error("Error retrieving user", error);
    return res.status(500).json({ message: "Error retrieving user" });
  }
};

export const edit_user = async (req, res) => {
  try {
    const { userId } = req.params; // Assuming userId is passed as a URL parameter
    const {
      username,
      email,
      name,
      specialUser,
      isRootLevel,
      isAdmin,
      roles,
      permissions,
    } = req.body;

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for username/email uniqueness if provided
    if (username && username !== existingUser.username) {
      const usernameExists = await prisma.user.findFirst({
        where: { username },
      });
      if (usernameExists) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { email },
      });
      if (emailExists) {
        return res.status(400).json({ message: "Email already taken" });
      }
    }

    // Validate roles if provided
    if (roles) {
      const validRoles = await prisma.role.findMany({
        where: {
          id: { in: roles },
          isActive: true,
        },
      });

      if (validRoles.length !== roles.length) {
        return res.status(400).json({
          message: "One or more roles are invalid or inactive",
        });
      }
    }

    // Prepare update data
    const updateData = {
      ...(username && { username }),
      ...(email && { email }),
      ...(name && { name }),
      ...(typeof specialUser === "boolean" && { specialUser }),
      ...(typeof isRootLevel === "boolean" && { isRootLevel }),
      ...(typeof isAdmin === "boolean" && { isAdmin }),
      ...(permissions?.writable && { writable: permissions.writable }),
      ...(permissions?.readable && { readable: permissions.readable }),
      ...(permissions?.downloadable && {
        downloadable: permissions.downloadable,
      }),
      ...(permissions?.uploadable && { uploadable: permissions.uploadable }),
    };

    // Start a transaction to update user and roles
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user details
      const user = await tx.user.update({
        where: { id: parseInt(userId) },
        data: updateData,
      });

      // Update roles if provided
      if (roles) {
        // Delete existing UserRole entries
        await tx.userRole.deleteMany({
          where: { userId: parseInt(userId) },
        });

        // Create new UserRole entries
        await tx.userRole.createMany({
          data: roles.map((roleId) => ({
            userId: user.id,
            roleId,
          })),
        });
      }

      return user;
    });

    res
      .status(200)
      .json({ message: "User updated successfully", data: updatedUser });
  } catch (error) {
    console.error("Error updating user", error);
    return res.status(500).json({ message: "Error updating user" });
  }
};

export const get_user_signature = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    // Prisma query with select
    const user = await prisma.user.findUnique({
      where: { id: userData.id },
      select: { signaturePicFileName: true },
    });

    if (!user?.signaturePicFileName) {
      return res.status(400).json({ message: "Please upload signature first" });
    }

    const imagePath = path.join(
      process.env.SIGNATURE_FOLDER_PATH, // Use absolute path in env
      user.signaturePicFileName
    );

    // Add file existence check
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ message: "Signature file not found" });
    }

    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error getting signature:", error);
    res.status(500).json({ message: "Error retrieving signature" });
  }
};

export const get_user_profile_pic = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userData.id },
      select: { profilePicFileName: true },
    });

    if (!user?.profilePicFileName) {
      return res.status(400).json({ message: "Please upload profile picture" });
    }

    const imagePath = path.join(
      process.env.PROFILE_PIC_FOLDER_PATH, // Use absolute path in env
      user.profilePicFileName
    );

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ message: "Profile picture not found" });
    }

    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error getting profile pic:", error);
    res.status(500).json({ message: "Error retrieving profile picture" });
  }
};
