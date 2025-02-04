const { PrismaClient } = require("@prisma/client");
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
    // Extract data from the request body
    const {
      role,
      departmentName,
      selectedUpload,
      selectedDownload,
      selectedView,
      fullAccess,
      parentRoleId,
      isRootLevel,
    } = req.body;

    // Check if a branch is required and exists
    let department = null;
    if (!isRootLevel) {
      department = await prisma.department.findUnique({
        where: { name: departmentName },
      });
      if (!department) {
        return res
          .status(400)
          .json({ message: "Branch selected for role doesn't exist." });
      }
    }

    // Check if the role already exists
    const existingRole = await prisma.role.findFirst({
      where: { role, departmentId: department?.id || null },
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

    // Combine all document IDs
    let allDocIds = [
      ...uploads,
      ...downloads,
      ...view,
      ...fullAccessUploadable,
      ...fullAccessDownloadable,
      ...fullAccessReadable,
    ];

    // Fetch parent document IDs (simulating a getParents function)
    const parentDocs = await prisma.document.findMany({
      where: { id: { in: allDocIds } },
      select: { parentId: true },
    });

    const parentIds = removeDuplicates(
      parentDocs.map((doc) => doc.parentId).filter(Boolean)
    );

    // Finalize readable, writable, and downloadable document arrays
    uploads = removeDuplicates([...uploads]);
    downloads = removeDuplicates([...downloads]);
    view = removeDuplicates([...view, ...parentIds]);

    // Create the new role
    const newRole = await prisma.role.create({
      data: {
        role,
        status: "Active",
        departmentId: department?.id || null,
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
