import Department from "../models/branch.js";

export const is_branch_head_office = async (name) => {
  try {
    const branch = await Department.findOne({ name: name }).select(
      "isHeadOffice"
    );

    return branch.isHeadOffice;
  } catch (error) {
    console.log("Error checking if branch is head office or not");
    throw new Error(error);
  }
};
