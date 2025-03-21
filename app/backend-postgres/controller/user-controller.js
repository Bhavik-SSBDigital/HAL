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
