import mongoose from "mongoose";
import Log from "../models/log.js";

/**
 * Fetches the maximum stepNumber for the given processId and departmentId.
 * @param {mongoose.Types.ObjectId} processId - The ID of the process.
 * @param {mongoose.Types.ObjectId} departmentId - The ID of the department.
 * @returns {Promise<number>} - The maximum stepNumber.
 */
export const get_max_step_number = async (processId, departmentId) => {
  try {
    // Fetch logs matching the processId and belongingDepartment
    const logs = await Log.find({
      processId,
      belongingDepartment: departmentId,
    });

    if (!logs || logs.length === 0) {
      throw new Error(
        "No logs found for the given processId and departmentId."
      );
    }

    // Map the step numbers from nextStep and currentStep
    const stepNumbers = logs.map((log) => {
      if (log.nextStep && log.nextStep.stepNumber) {
        return log.nextStep.stepNumber;
      } else if (log.currentStep && log.currentStep.stepNumber) {
        return log.currentStep.stepNumber;
      }
      return 0; // Default if no stepNumber is found
    });

    // Find the maximum stepNumber
    const maxStepNumber = Math.max(...stepNumbers);

    return maxStepNumber;
  } catch (error) {
    console.error("Error fetching maximum step number:", error);
    throw error;
  }
};
