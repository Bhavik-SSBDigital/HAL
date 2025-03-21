import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Utility function to remove duplicates
const removeDuplicates = (arr) => [...new Set(arr)];

/*
{
  "role": "Project Manager",
  "department": "IT Department", // Only required if the role is not root-level
  "selectedUpload": [101, 102], // Document IDs with upload access
  "selectedDownload": [103, 104], // Document IDs with download access
  "selectedView": [105, 106], // Document IDs with view access
  "fullAccess": [
    { "id": 201, "upload": true, "download": true, "view": true }, // Full access document
    { "id": 202, "upload": false, "download": true, "view": true } // Partial full access
  ],
  "isRootLevel": false, // Set to true if creating a root-level role
  "parentRoleId": 3 // Parent role ID (optional, for hierarchy)
}

*/
export const add_role = async (req, res) => {
  try {
    const {
      role,
      department, // Changed to match payload
      selectedUpload,
      selectedDownload,
      selectedView,
      fullAccess,
      parentRoleId,
      isRootLevel,
      isAdmin,
    } = req.body;

    // Check if a branch is required and exists
    let departmentObj = null;
    if (!isRootLevel) {
      departmentObj = await prisma.department.findUnique({
        where: { id: parseInt(department) }, // Use department ID
      });
      if (!departmentObj) {
        return res
          .status(400)
          .json({ message: "Branch selected for role doesn't exist." });
      }
    }

    // Check if the role already exists
    const existingRole = await prisma.role.findFirst({
      where: { role, departmentId: departmentObj?.id || null },
    });
    if (existingRole) {
      return res.status(400).json({
        message: "Role with the same department and role already exists.",
      });
    }

    // Document access logic
    let uploads = selectedUpload || [];
    let downloads = selectedDownload || [];
    let view = selectedView || [];
    let fullAccessUploadable = fullAccess
      .filter((doc) => doc.upload)
      .map((doc) => doc.id);
    let fullAccessDownloadable = fullAccess
      .filter((doc) => doc.download)
      .map((doc) => doc.id);
    let fullAccessReadable = fullAccess
      .filter((doc) => doc.view)
      .map((doc) => doc.id);

    let allDocIds = [
      ...uploads,
      ...downloads,
      ...view,
      ...fullAccessUploadable,
      ...fullAccessDownloadable,
      ...fullAccessReadable,
    ];

    const parentDocs = await prisma.document.findMany({
      where: { id: { in: allDocIds } },
      select: { parentId: true },
    });

    const parentIds = removeDuplicates(
      parentDocs.map((doc) => doc.parentId).filter(Boolean)
    );

    uploads = removeDuplicates([...uploads]);
    downloads = removeDuplicates([...downloads]);
    view = removeDuplicates([...view, ...parentIds]);

    const newRole = await prisma.role.create({
      data: {
        role,
        status: "Active",
        departmentId: departmentObj?.id || null,
        isRootLevel: isRootLevel || false,
        isAdmin: isAdmin || false,
        parentRoleId: parseInt(parentRoleId) || null,
        uploadable: uploads,
        readable: view,
        downloadable: downloads,
        fullAccessUploadable: fullAccessUploadable,
        fullAccessReadable: fullAccessReadable,
        fullAccessDownloadable: fullAccessDownloadable,
      },
    });

    res.status(201).json({
      message: "Role created successfully.",
      role: newRole,
    });
  } catch (error) {
    console.error("Error adding role:", error);
    res.status(500).json({
      message: "Error adding role.",
      error: error.message,
    });
  }
};

/*
  isRootLevel: true, 
  departmentName: "IT Department"
*/
export const get_roles = async (req, res) => {
  try {
    const { isRootLevel, departmentName } = req.query;

    // Define query filters
    const filters = {};

    // If isRootLevel is specified, filter roles by it
    if (typeof isRootLevel !== "undefined") {
      filters.isRootLevel = isRootLevel === "true";
    }

    // If departmentName is specified, find the department ID and filter roles
    if (departmentName) {
      const department = await prisma.department.findUnique({
        where: { name: departmentName },
        select: { id: true },
      });

      if (!department) {
        return res
          .status(400)
          .json({ message: "The specified department does not exist." });
      }

      filters.departmentId = department.id;
    }

    // Fetch roles based on filters
    const roles = await prisma.role.findMany({
      where: filters,
      select: {
        id: true,
        role: true,
        departmentId: true,
        isRootLevel: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            name: true, // Fetch department name
          },
        },
      },
    });

    // Format the response to include department name directly
    const formattedRoles = roles.map((role) => ({
      id: role.id,
      role: role.role,
      isRootLevel: role.isRootLevel,
      departmentId: role.departmentId,
      departmentName: role.branch?.name || null,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    res.status(200).json({
      message: "Roles fetched successfully.",
      roles: formattedRoles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      message: "Error fetching roles.",
      error: error.message,
    });
  }
};

export const get_role = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        branch: {
          select: { name: true },
        },
        parentRole: {
          select: { id: true, role: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ message: "Role not found." });
    }

    // Get unique IDs from all fullAccess arrays
    const allIds = [
      ...new Set([
        ...(role.fullAccessUploadable || []),
        ...(role.fullAccessReadable || []),
        ...(role.fullAccessDownloadable || []),
      ]),
    ];

    // Transform fullAccess into the desired array structure
    const fullAccess = allIds.map((id) => ({
      id,
      view: (role.fullAccessReadable || []).includes(id),
      upload: (role.fullAccessUploadable || []).includes(id),
      download: (role.fullAccessDownloadable || []).includes(id),
    }));

    // Format the role data
    const formattedRole = {
      id: role.id,
      role: role.role,
      status: role.status,
      department: role.branch?.name || null,
      isRootLevel: role.isRootLevel,
      isAdmin: role.isAdmin,
      parentRoleId: role.parentRoleId,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      selectedUpload: role.uploadable,
      selectedView: role.readable,
      selectedDownload: role.downloadable,
      fullAccess: fullAccess,
    };

    res.status(200).json({
      message: "Role fetched successfully.",
      role: formattedRole,
    });
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({
      message: "Error fetching role.",
      error: error.message,
    });
  }
};

export const edit_role = async (req, res) => {
  try {
    const { id } = req.params; // Role ID to edit
    const {
      role,
      department, // Department ID
      selectedUpload,
      selectedDownload,
      selectedView,
      fullAccess,
      parentRoleId,
      isRootLevel,
      isAdmin,
    } = req.body;

    // Check if the role exists
    const existingRole = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingRole) {
      return res.status(404).json({ message: "Role not found." });
    }

    // Check if a branch is required and exists
    let departmentObj = null;
    if (!isRootLevel) {
      departmentObj = await prisma.department.findUnique({
        where: { id: department },
      });
      if (!departmentObj) {
        return res
          .status(400)
          .json({ message: "Branch selected for role doesn't exist." });
      }
    }

    // Check for duplicate role (excluding the current role being edited)
    const duplicateRole = await prisma.role.findFirst({
      where: {
        role,
        departmentId: departmentObj?.id || null,
        id: { not: parseInt(id) }, // Exclude the current role
      },
    });
    if (duplicateRole) {
      return res.status(400).json({
        message:
          "Another role with the same name and department already exists.",
      });
    }

    // Document access logic (same as add_role)
    let uploads = selectedUpload || [];
    let downloads = selectedDownload || [];
    let view = selectedView || [];
    let fullAccessUploadable = fullAccess
      .filter((doc) => doc.upload)
      .map((doc) => doc.id);
    let fullAccessDownloadable = fullAccess
      .filter((doc) => doc.download)
      .map((doc) => doc.id);
    let fullAccessReadable = fullAccess
      .filter((doc) => doc.view)
      .map((doc) => doc.id);

    let allDocIds = [
      ...uploads,
      ...downloads,
      ...view,
      ...fullAccessUploadable,
      ...fullAccessDownloadable,
      ...fullAccessReadable,
    ];

    const parentDocs = await prisma.document.findMany({
      where: { id: { in: allDocIds } },
      select: { parentId: true },
    });

    const parentIds = removeDuplicates(
      parentDocs.map((doc) => doc.parentId).filter(Boolean)
    );

    uploads = removeDuplicates([...uploads]);
    downloads = removeDuplicates([...downloads]);
    view = removeDuplicates([...view, ...parentIds]);

    // Update the role
    const updatedRole = await prisma.role.update({
      where: { id: parseInt(id) },
      data: {
        role,
        departmentId: departmentObj?.id || null,
        isRootLevel: isRootLevel || false,
        isAdmin: isAdmin || false,
        parentRoleId: parentRoleId || null,
        writable: uploads,
        readable: view,
        downloadable: downloads,
        fullAccessWritable: fullAccessUploadable,
        fullAccessReadable: fullAccessReadable,
        fullAccessDownloadable: fullAccessDownloadable,
        updatedAt: new Date(), // Explicitly set updatedAt
      },
    });

    res.status(200).json({
      message: "Role updated successfully.",
      role: updatedRole,
    });
  } catch (error) {
    console.error("Error editing role:", error);
    res.status(500).json({
      message: "Error editing role.",
      error: error.message,
    });
  }
};

// export const getRolesHierarchyInDepartment = async (req, res) => {
//   const { departmentId } = req.params; // Get departmentId from request params

//   try {
//     // Fetch the department to get its name
//     const department = await prisma.department.findUnique({
//       where: { id: Number(departmentId) },
//     });

//     if (!department) {
//       return res.status(404).json({ message: "Department not found." });
//     }

//     // Fetch all roles for the department and their relationships
//     const roles = await prisma.role.findMany({
//       where: { departmentId: Number(departmentId) },
//       include: {
//         parentRole: true, // Include parent role for reference
//         childRoles: true, // Include child roles to build hierarchy
//       },
//     });

//     // Check if there are roles in the department
//     if (!roles || roles.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No roles found for this department." });
//     }

//     // Identify top-level roles (roles with no parent in the same department)
//     const topRoles = roles.filter(
//       (role) =>
//         !role.parentRoleId || // No parent role
//         (role.parentRole &&
//           role.parentRole.departmentId !== Number(departmentId)) // Parent role is external
//     );

//     // Recursive function to build hierarchy
//     const buildHierarchy = (roles, parentRoleId) =>
//       roles
//         .filter((role) => role.parentRoleId === parentRoleId) // Filter roles by parentRoleId
//         .map((role) => ({
//           name: role.role,
//           children: buildHierarchy(roles, role.id), // Recursive call for children
//         }));

//     // Build hierarchies for all top-level roles
//     const hierarchies = topRoles.map((topRole) => ({
//       name: topRole.role,
//       children: buildHierarchy(roles, topRole.id),
//     }));

//     // Final response with department name as root
//     const responseHierarchy = {
//       name: department.name, // Use the actual department name
//       children: hierarchies,
//     };

//     res.json({ data: [responseHierarchy] });
//   } catch (error) {
//     console.error("Error fetching department roles:", error);
//     res.status(500).json({ error: "An error occurred while fetching roles." });
//   }
// };

export const getRolesHierarchyInDepartment = async (req, res) => {
  const { departmentId } = req.params;

  try {
    const department = await prisma.department.findUnique({
      where: { id: Number(departmentId) },
    });

    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const roles = await prisma.role.findMany({
      where: { departmentId: Number(departmentId) },
      include: {
        parentRole: true,
        childRoles: true,
      },
    });

    if (!roles || roles.length === 0) {
      return res
        .status(404)
        .json({ message: "No roles found for this department." });
    }

    const topRoles = roles.filter(
      (role) =>
        !role.parentRoleId ||
        (role.parentRole &&
          role.parentRole.departmentId !== Number(departmentId))
    );

    // Modified buildHierarchy to include IDs
    const buildHierarchy = (roles, parentRoleId) =>
      roles
        .filter((role) => role.parentRoleId === parentRoleId)
        .map((role) => ({
          id: role.id, // Add role ID
          name: role.role,
          children: buildHierarchy(roles, role.id),
        }));

    // Include IDs in top roles
    const hierarchies = topRoles.map((topRole) => ({
      id: topRole.id, // Add top role ID
      name: topRole.role,
      children: buildHierarchy(roles, topRole.id),
    }));

    const responseHierarchy = {
      id: department.id, // Optional: include department ID in root
      name: department.name,
      children: hierarchies,
    };

    res.json({ data: [responseHierarchy] });
  } catch (error) {
    console.error("Error fetching department roles:", error);
    res.status(500).json({ error: "An error occurred while fetching roles." });
  }
};
