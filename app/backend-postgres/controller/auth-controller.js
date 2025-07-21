import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { send_mail_for_sign_up } from "./email-handler.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generateRandomPassword(length) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

/*
{
  "username": "john_doe",
  "email": "john@example.com",
  "department": 1,
  "roles": [1, 2],
  "writable": [101, 102],
  "readable": [101, 103],
  "downloadable": [101],
  "uploadable": [104]
}
*/
export const sign_up = async (req, res) => {
  try {
    const {
      username,
      email,
      roles,
      writable,
      readable,
      downloadable,
      uploadable,
    } = req.body;

    // Generate a random password
    let password = req.body.password;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        username: username,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with given email or username already exists",
      });
    }

    // Check if the provided roles exist
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

    // Create the user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        writable,
        readable,
        downloadable,
        uploadable,
      },
    });

    // Manually create UserRole entries
    await prisma.userRole.createMany({
      data: roles.map((roleId) => ({
        userId: user.id,
        roleId,
      })),
    });

    // Attempt to send the email
    // const emailSent = await send_mail_for_sign_up(username, email, password);

    // if (!emailSent) {
    //   // If email sending fails, rollback the user creation
    //   await prisma.user.delete({ where: { id: user.id } });
    //   return res.status(500).json({
    //     message: "Error sending email. User creation rolled back.",
    //   });
    // }

    res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user", error);
    return res.status(500).json({ message: "Error creating user" });
  }
};

/*
{
  "username": "john_doe",
  "password": "password123"
}
*/
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        tokens: true,
        roles: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Password does not match" });
    }

    // Check if the user already has a refresh token
    let refreshToken = user.tokens?.[0]?.token || "";

    if (!refreshToken) {
      refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_SECRET_KEY);

      await prisma.token.create({
        data: {
          token: refreshToken,
          userId: user.id,
        },
      });
    }

    // Generate an access token with all required user properties
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles.map((role) => role.id),
      },
      process.env.SECRET_ACCESS_KEY,
      {
        expiresIn: "365d",
      }
    );

    res.status(200).json({
      accessToken,
      refreshToken,
      email: user.email,
      userName: user.username,
      userId: user.id,
      roles: user.roles.map((role) => role.name),
    });
  } catch (error) {
    console.error("Error during login", error);
    return res.status(500).json({ message: "Error during login" });
  }
};

export const create_admin = async (req, res) => {
  try {
    const encryptedPassword = await bcrypt.hash("check", 10);

    const adminData = {
      username: "admin",
      email: "bhavik.bhatt@ssbi.in",
      password: encryptedPassword,
      isRootLevel: true,
      isAdmin: true,
    };

    const admin = await prisma.user.create({
      data: adminData,
    });

    res.status(200).json({
      message: "Admin created successfully",
      admin,
    });
  } catch (error) {
    console.error("Error creating admin user:", error);
    res.status(500).json({
      message: "Failed to create admin user",
      error: error.message,
    });
  }
};

export const change_password = async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Check if new password is different
    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
