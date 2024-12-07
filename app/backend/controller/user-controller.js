import user from "../models/user.js";
import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Token from "../models/token.js";
import {
  uploadAccess,
  downloadAccess,
  viewAccess,
  fullAccess,
} from "../utility/accessFunction.js";
import Branch from "../models/branch.js";
import nodemailer from "nodemailer";
import { verifyUser } from "../utility/verifyUser.js";
import Role from "../models/role.js";
import Department from "../models/department.js";
import { ObjectId } from "mongodb";

import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { userSockets } from "../socketHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

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

// Function to send an email with username and password
async function sendEmail(username, password, recipientEmail, emailMessage) {
  // Create a transporter using SMTP transport
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.APP_PASS,
    },
  });

  // Email content
  const mailOptions = {
    from: process.env.EMAIL,
    to: recipientEmail,
    subject: "Your Account Information",
    html: emailMessage
      ? emailMessage
      : `
    <p>Hello,</p>
    <p>Welcome to Our Website!</p>
    <p>Your account has been created successfully.</p>
    <p>Your username is: ${username}</p>
    <p>Your password is: ${password}</p>
    <p>Please keep this information safe and do not share it with anyone.</p>
    <p>Thank you for choosing our service!</p>
  `,
  };

  // Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
}

export const signup_POST = async (req, res) => {
  try {
    const existingUser = await User.findOne({
      username: req.body.username,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username is already taken",
      });
    }
    const passwordLength = 12; // You can adjust the length as needed
    const randomPassword = generateRandomPassword(passwordLength);
    const encrytedPassword = await bcrypt.hash(randomPassword, 10);
    const userRef = req.body;
    const branch = await Branch.findOne({ name: userRef.branch });
    if (!branch) {
      return res.status(400).json({
        message: "please select the valid branch name",
      });
    }
    userRef.branch = branch._id;
    const role = await Role.findOne({ role: userRef.role, branch: branch._id });
    if (!role) {
      return res.status(400).json({
        message: "please select the valid role",
      });
    }
    userRef.role = role._id;
    userRef.password = encrytedPassword;
    //
    // let uploads = await uploadAccess(req.body.selectedUpload, true);
    // let downloads = await downloadAccess(req.body.selectedDownload, true);
    // let view = await viewAccess(req.body.selectedView, true);
    // let fullAccess_ = await fullAccess(req.body.fullAccess);
    //
    // uploads = [...new Set([...fullAccess_.upload, ...uploads])]
    // downloads = [...new Set([...fullAccess_.download, ...downloads])]
    // view = [...new Set([...fullAccess_.view, ...view])]
    // userRef.uploadable = uploads;
    // userRef.downloadable = downloads;
    // userRef.readable = view;
    // userRef.username = userRef.name
    userRef.createdAt = Date.now();
    // delete userRef.fullAccess
    // delete userRef.name
    const user = new User(userRef);
    await user.save();
    await sendEmail(req.body.username, randomPassword, req.body.email);
    return res.status(200).json({
      message: "Signup was successful",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "error while signup the user",
    });
  }
};

export const login_POST = async (req, res) => {
  try {
    if (userSockets.has(req.body.username)) {
      return res.status(400).json({
        message: "User is already logged in via socket connection.",
      });
    }
    // Find a user with the provided username
    let user = await User.findOne({ username: req.body.username }).select(
      "username email branch role password specialUser _id isKeeperOfPhysicalDocs _id"
    );

    // If no user is found with the provided username
    if (!user) {
      return res.status(400).json({
        message: "Username does not match",
      });
    }

    // Compare the provided password with the hashed password stored in the user document
    const match = await bcrypt.compare(req.body.password, user.password);

    // If the passwords match
    if (match) {
      // Check if the user already has a refresh token in the database
      let refreshToken = "";
      const existingToken = await Token.findOne({ userId: user._id });

      if (existingToken) {
        refreshToken = existingToken.token;
      } else {
        // Generate a refresh token for the first login
        refreshToken = jwt.sign(user.toJSON(), process.env.REFRESH_SECRET_KEY);

        // Save the refresh token in the database
        const newToken = new Token({ userId: user._id, token: refreshToken });
        await newToken.save();
      }

      // Generate an access token
      const accessToken = jwt.sign(
        user.toJSON(),
        process.env.SECRET_ACCESS_KEY,
        { expiresIn: "365d" }
      );

      const count = await Department.countDocuments({
        steps: {
          $elemMatch: {
            stepNumber: 1,
            "users.user": user._id,
          },
        },
      });

      // Respond with the access and refresh tokens along with some user details
      return res.status(200).json({
        accessToken: accessToken,
        refreshToken: refreshToken,
        email: user.email,
        userName: user.username,
        specialUser: user.specialUser,
        isInitiator: count > 0 ? true : false,
        isKeeperOfPhysicalDocs: user.isKeeperOfPhysicalDocs,
        userId: user._id,
      });
    } else {
      // If the passwords don't match
      return res.status(400).json({
        message: "Password does not match",
      });
    }
  } catch (error) {
    // If an error occurs
    console.log(error);
    return res.status(500).json({
      message: error,
    });
  }
};

export const forgotPassword_POST = async (req, res) => {
  try {
    const { username, email } = req.body;

    // Check if the user exists
    const user = await User.findOne({ username }).select(
      "username email password"
    );

    if (!user) {
      return res.status(404).json({
        message: "User with given username not found",
      });
    }

    // Check if the provided email matches the user's email
    if (user.email !== email) {
      return res.status(400).json({
        message: "User with given email doesn't exist",
      });
    }

    // Generate a random password
    const passwordLength = 12; // You can adjust the length as needed
    const randomPassword = generateRandomPassword(passwordLength);
    const encryptedPassword = await bcrypt.hash(randomPassword, 10);

    // Update the user's password
    user.password = encryptedPassword;
    await user.save();

    // Send the email with the new password
    const emailMessage = `Hello ${username}, here is your updated password for DMS application: ${randomPassword}`;
    await sendEmail(username, randomPassword, email, emailMessage);

    return res.status(200).json({
      message:
        "Password reset successful. Please check your email for the new password.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error while resetting the password",
    });
  }
};

export const get_users = async (req, res) => {
  try {
    let users = await User.find(
      {},
      "username email branch createdAt status role"
    );

    users = await Promise.all(
      users.map(async (user) => {
        const branch = await Branch.findOne({ _id: user.branch });
        let name = branch === null ? "N/A" : branch.name;
        let user_ = { ...user.toObject() };
        user_.branch = name;
        const role = await Role.findOne({ _id: user.role });
        name = role === null ? "N/A" : role.role;
        user_.role = name;
        return user_;
      })
    );

    res.status(200).json({
      users: users.filter((user) => user.username !== "admin"),
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const get_usernames = async (req, res) => {
  try {
    let users = await User.find({}, "username role branch"); // Fetch all users and only return the 'username' field

    users = await Promise.all(
      users.map(async (user) => {
        let role = user.role;

        role = await Role.findOne({ _id: role }).select("role");

        if (user.username === "admin") {
          role = "admin";
        } else {
          role = role.role;
        }

        let branch = user.branch;
        branch = await Branch.findOne({ _id: branch }).select("name");

        if (user.username === "admin") {
          branch = "headOffice";
        } else {
          branch = branch.name;
        }

        return {
          role: role,
          branch: branch,
          username: user.username,
        };
      })
    ); // Extract usernames from the user objects

    res.status(200).json({ users: users });
  } catch (error) {
    console.error("Error fetching usernames:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const create_admin = async (req, res) => {
  try {
    const encrytedPassword = await bcrypt.hash("check", 10);
    const adminData = {
      username: "admin", // Set the desired username
      password: encrytedPassword, // Set the desired password
      email: "bhavik.bhatt@ssbi.in",
      createdAt: Date.now(),
      status: "Active",
    };

    // Create the admin user, only providing the username and password
    const admin = await User.create(adminData);

    res.status(200).json({
      message: admin,
    });
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
};

export const edit_user = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    if (userData.username === "admin") {
      const userId = req.params.userId; // Assuming you pass the branch ID in the URL.
      let updatedData = req.body; // The client can send any fields they want to update.

      const branch = await Branch.findOne({ name: updatedData.branch });
      const role = await Role.findOne({ role: updatedData.role });

      updatedData.branch = branch._id;
      updatedData.role = role._id;

      // Construct an object with the fields to update.
      const updateFields = {};
      for (const key in updatedData) {
        if (updatedData.hasOwnProperty(key)) {
          updateFields[key] = updatedData[key];
        }
      }

      updateFields.updatedAt = Date.now();

      // Find the branch by ID and update the specified fields.
      const result = await User.findByIdAndUpdate(userId, updateFields, {
        new: true,
      });

      if (!result) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.status(200).json({
        message: "User updated successfully",
        updatedUser: result,
      });
    } else {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error updating branch",
    });
  }
};

const updateUserPassword = async (userId, newPassword) => {
  try {
    // Update the user's password in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: newPassword },
      { new: true } // This option returns the updated user document
    );

    if (!updatedUser) {
      throw new Error("User not found or password update failed");
    }

    return updatedUser; // You can return the updated user for further processing if needed
  } catch (error) {
    throw error; // You can handle the error in the calling function
  }
};

export const change_password = async (req, res) => {
  try {
    // Get user information from the request (e.g., current password, new password)
    const { username, currentPassword, newPassword } = req.body;

    // Retrieve the user's current hashed password from your database
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify the current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    await updateUserPassword(user._id, hashedPassword);

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const delete_user = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    if (userData.username === "admin") {
      const userId = req.params.userId; // Assuming you pass the user ID in the URL.

      // Find the user by ID and delete it.
      const result = await User.findByIdAndRemove(userId);

      if (!result) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.status(200).json({
        message: "User deleted successfully",
      });
    } else {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error deleting user",
    });
  }
};

export const get_users_by_role_of_branch = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    const branchId = req.body.branchId;
    const roleId = req.body.roleId;
    const branch = await Branch.findOne({ _id: branchId });

    if (!branch) {
      return res.status(400).json({
        message: "branch does not exist",
      });
    }

    const role = await Role.findOne({ _id: roleId });

    if (!role) {
      return res.status(400).json({
        message: "role does not exist",
      });
    }

    const users = await User.find({
      branch: branchId,
      role: roleId,
    }).select("branch role username _id email");

    res.status(200).json({
      users: users,
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "error getting users with given branch and role details",
    });
  }
};

export const get_user_profile_data = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    let userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let branch = await Branch.findOne({ _id: userData.branch }).select("name");

    if (branch) {
      userData.branch = branch.name;
    } else {
      userData.branch = "N/A";
    }

    const role = await Role.findOne({ _id: userData.role }).select("role");

    const allDepartments = await Department.find({}).select(
      "name steps branch"
    );

    let userIdObject = new ObjectId(userData._id);

    const departmentsInvolvedIn = [];

    for (let i = 0; i < allDepartments.length; i++) {
      const department = allDepartments[i];

      const branchOfDepartment = await Branch.findOne({
        _id: department.branch,
      }).select("name");
      let steps = department.steps;
      let ans = false;
      for (let j = 0; j < steps.length; j++) {
        const step = steps[j];

        const tempUsers = step.users.map((item) => item.user);

        for (let k = 0; k < tempUsers.length; k++) {
          if (tempUsers[k].equals(userIdObject)) {
            ans = true;
            break;
          }
        }

        if (ans) {
          departmentsInvolvedIn.push({
            departmentName: department.name,
            branchName: branchOfDepartment.name,
          });
          break;
        }
      }
    }

    if (role) {
      userData.role = role.role;
    } else {
      userData.role = "N/A";
    }

    userData.departmentsInvolvedIn = departmentsInvolvedIn;

    delete userData.password;
    delete userData.iat;
    delete userData.exp;

    return res.status(200).json({
      userdata: userData,
    });
  } catch (error) {
    console.log("error getting user profile data", error);
    return res.status(500).json({
      message: "error getting user profile data",
    });
  }
};

export const get_user_signature = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    let userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let signaturePicFileName = await User.findOne({
      _id: userData._id,
    }).select("signaturePicFileName");

    if (!signaturePicFileName.signaturePicFileName) {
      return res.status(400).json({
        message: "please upload signature pic first",
      });
    }

    const imagePath = path.join(
      __dirname,
      process.env.SIGNATURE_FOLDER_PATH,
      signaturePicFileName.signaturePicFileName
    ); // Replace 'path_to_your_image_directory' with your actual image directory path

    // Send the image file as a response
    res.sendFile(imagePath);
  } catch (error) {
    console.log(error, "error getting user signature");
    return res.status(500).json({
      message: "error getting user signature",
    });
  }
};

export const get_user_profile_pic = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    let userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let profilePicFileName = await User.findOne({ _id: userData._id }).select(
      "profilePicFileName"
    );

    if (!profilePicFileName.profilePicFileName) {
      return res.status(400).json({
        message: "please upload profile pic first",
      });
    }

    const imagePath = path.join(
      __dirname,
      process.env.PROFILE_PIC_FOLDER_PATH,
      profilePicFileName.profilePicFileName
    ); // Replace 'path_to_your_image_directory' with your actual image directory path

    // Send the image file as a response
    res.sendFile(imagePath);
  } catch (error) {
    console.log(error, "error getting user signature");
    return res.status(500).json({
      message: "error getting user signature",
    });
  }
};

export const get_user = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    let userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const userId = new ObjectId(req.params.userId);

    const user = await User.findOne({ _id: userId });

    if (user) {
      let branch = await Branch.findOne({ _id: user.branch }).select("name");
      branch = branch.name;
      let role = await Role.findOne({ _id: user.role }).select("role");
      role = role.role;
      return res.status(200).json({
        _id: userId,
        username: user.username,
        branch: branch,
        role: role,
        status: user.status,
        email: user.email,
        createdAt: user.createdAt,
        name: user.name,
      });
    } else {
      return res.status(404).json({
        message: "error getting user details",
      });
    }
  } catch (error) {
    console.log("error getting user details", error);
    return res.status(500).json({
      message: "error getting user details",
    });
  }
};
