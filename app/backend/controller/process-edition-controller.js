import mongoose from "mongoose";
import Process from "../models/process.js"; // Adjust to the actual path of your model
import Work from "../models/work.js"; // Adjust to the actual path of your model
import User from "../models/user.js"; // Adjust to the actual path of your model
import Role from "../models/role.js"; // Adjust to the actual path of your model
import Edition from "../models/process-edition.js"; // Adjust to the actual path of your model
import { verifyUser } from "../utility/verifyUser.js";
import Department from "../models/department.js";

export const update_process_workflow = async (req, res) => {
  try {
    const { processId, steps } = req.body;

    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const actorUserId = userData._id;

    // Validate input
    if (!processId) {
      return res.status(400).json({ message: "Process ID is required." });
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      return res
        .status(400)
        .json({ message: "Steps must be a non-empty array." });
    }
    if (!actorUserId) {
      return res.status(400).json({ message: "Actor user ID is required." });
    }

    // Fetch the process
    const process = await Process.findById(processId).select("workFlow steps");
    if (!process) {
      return res.status(404).json({ message: "Process not found." });
    }

    // Process incoming steps
    const finalSteps = [];
    for (const step of steps) {
      const { work, users } = step;
      const stepNumber = step.step;

      // Validate required fields
      if (!work || !stepNumber || !Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ message: "Invalid step format." });
      }

      // Validate or create work
      let workDoc = await Work.findOne({ name: work });
      if (!workDoc) {
        return res.status(404).json({ message: `Work ID ${work} not found.` });
      }

      // Validate users
      const validatedUsers = [];
      for (const { user, role } of users) {
        const userDoc = await User.findOne({ username: user });
        if (!userDoc) {
          return res
            .status(404)
            .json({ message: `User ID ${user} not found.` });
        }

        const roleDoc = await Role.findOne({ role: role });
        if (!roleDoc) {
          return res
            .status(404)
            .json({ message: `Role ID ${role} not found.` });
        }

        validatedUsers.push({ user: userDoc._id, role: roleDoc._id });
      }

      // Add to final steps array
      finalSteps.push({
        work: workDoc._id,
        stepNumber,
        users: validatedUsers,
      });
    }

    // Create workflow schema object
    const updatedWorkflow = { workflow: finalSteps };

    let workFlow;

    if (!(process.steps && process.steps.length > 0)) {
      const department = await Department.findOne({
        _id: process.workFlow,
      }).select("steps");
      workFlow = department.steps;
    }

    // Create edition entry
    const edition = new Edition({
      processId,
      time: new Date(),
      actorUser: actorUserId,
      workflowChanges: {
        previous: {
          workflow: process.steps || workFlow,
        },
        updated: updatedWorkflow,
      },
    });

    // Save the edition
    await edition.save();

    // Update the process with the final steps
    process.steps = finalSteps;
    process.updatedAt = new Date();

    // Save the process
    await process.save();

    return res.status(200).json({
      message: "Process steps updated successfully.",
      process,
    });
  } catch (error) {
    console.error("Error updating process steps:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while updating steps." });
  }
};
