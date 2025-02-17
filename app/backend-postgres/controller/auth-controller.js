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
      department,
      roles,
      writable,
      readable,
      downloadable,
      uploadable,
    } = req.body;

    // Generate a random password
    let password = generateRandomPassword(8);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with given email or username already exists",
      });
    }

    // Check if the department exists and is active
    const departmentExists = await prisma.department.findUnique({
      where: { id: department },
    });

    if (!departmentExists || !departmentExists.isActive) {
      return res.status(400).json({
        message: departmentExists
          ? "The department is inactive"
          : "Invalid department ID provided",
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

    // Create the user in the database
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        branches: { connect: { id: department } },
        roles: { connect: roles.map((roleId) => ({ id: roleId })) },
        writable,
        readable,
        downloadable,
        uploadable,
      },
    });

    // Attempt to send the email
    const emailSent = await send_mail_for_sign_up(username, email, password);

    if (!emailSent) {
      // If email sending fails, delete the user
      await prisma.user.delete({ where: { id: user.id } });
      return res.status(500).json({
        message: "Error sending email. User creation rolled back.",
      });
    }

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
        writable: user.writable,
        readable: user.readable,
        downloadable: user.downloadable,
        uploadable: user.uploadable,
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
      isSuperAdmin: true,
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
