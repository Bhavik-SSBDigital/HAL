// Import required modules and dependencies
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "./models/user.js";
import db from "./db.js";
import dotenv from "dotenv";

dotenv.config();
// Connect to MongoDB

// Function to create admin user
const createAdmin = async () => {
  try {
    db();
    // Hash the password using bcrypt
    const encryptedPassword = await bcrypt.hash("check", 10);

    // Admin data
    const adminData = {
      username: "admin", // Set the desired username
      password: encryptedPassword, // Set the desired password
      email: "edpmis.ho@kdccbank.in",
      createdAt: Date.now(),
      status: "Active",
    };

    // Create the admin user
    const admin = await User.create(adminData);

    console.log("Admin created:", admin);
    mongoose.connection.close(); // Close MongoDB connection after user creation
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
};

// Call the function to create admin user
createAdmin();
