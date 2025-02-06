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
