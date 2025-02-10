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
    } = req.body;

    // Check if a branch is required and exists
    let departmentObj = null;
    if (!isRootLevel) {
      departmentObj = await prisma.department.findUnique({
        where: { id: department }, // Use department ID
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
        parentRoleId: parentRoleId || null,
        writable: uploads,
        readable: view,
        downloadable: downloads,
        fullAccessWritable: fullAccessUploadable,
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

export const getRolesHierarchyInDepartment = async (req, res) => {
  const { departmentId } = req.params; // Get departmentId from request params

  try {
    // Fetch all roles for the department and their relationships
    const roles = await prisma.role.findMany({
      where: { departmentId: Number(departmentId) },
      include: {
        parentRole: true, // Include parent role for reference
        childRoles: true, // Include child roles to build hierarchy
      },
    });

    // Find all potential "top roles"
    const topRoles = roles.filter(
      (role) =>
        !role.parentRoleId || // No parent role
        (role.parentRole &&
          role.parentRole.departmentId !== Number(departmentId)) // Parent role from another department
    );

    // Determine the definitive top role (based on your chosen criteria)
    const definitiveTopRole = topRoles.sort(
      (a, b) => a.createdAt - b.createdAt
    )[0]; // Example: Pick the oldest

    if (!definitiveTopRole) {
      return res
        .status(404)
        .json({ message: "No top role found for this department." });
    }

    // Recursive function to build hierarchy within the department
    const buildHierarchy = (roles, parentRoleId) =>
      roles
        .filter((role) => role.parentRoleId === parentRoleId) // Filter roles by parentRoleId
        .map((role) => ({
          name: role.role,
          children: buildHierarchy(roles, role.id), // Recursive call for children
        }));

    // Build the hierarchy starting from the definitive top role
    const hierarchy = buildHierarchy(roles, definitiveTopRole.id);

    // Include the external parent role (if exists)
    let responseHierarchy = {
      name: definitiveTopRole.role,
      children: hierarchy,
    };

    if (
      definitiveTopRole.parentRole &&
      definitiveTopRole.parentRole.departmentId !== Number(departmentId)
    ) {
      responseHierarchy = {
        name: definitiveTopRole.parentRole.role,
        children: [responseHierarchy],
        external: true, // Mark it as an external parent role
      };
    }

    // Wrap the response in an array
    res.json({ data: [responseHierarchy] });
  } catch (error) {
    console.error("Error fetching department roles:", error);
    res.status(500).json({ error: "An error occurred while fetching roles." });
  }
};
