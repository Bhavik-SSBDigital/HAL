import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Verify User Function
export const verifyUser = async (accessToken) => {
  try {
    const decodedData = jwt.verify(accessToken, process.env.SECRET_ACCESS_KEY);

    console.log("decodedData", decodedData);
    // Fetch full user details from the database
    const user = decodedData.id
      ? await prisma.user.findUnique({
          where: { id: parseInt(decodedData.id) },
        })
      : await prisma.user.findUnique({
          where: { id: parseInt(decodedData.userId) },
        });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      ...decodedData, // Include additional token properties, if needed
    };
  } catch (error) {
    console.log("Error verifying user:", error);
    return "Unauthorized";
  }
};
