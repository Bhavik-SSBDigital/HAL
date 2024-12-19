import { verifyUser } from "../utility/verifyUser.js";
import Branch from "../models/branch.js";
import Department from "../models/department.js";
import { ObjectId } from "mongodb";
import User from "../models/user.js";

export const create_branch = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    if (userData.username === "admin") {
      const newBranch = new Branch({
        code: parseInt(req.body.code),
        name: req.body.name,
        status: req.body.status,
        createdAt: Date.now(),
        isHeadOffice: req.body.isHeadOffice,
        totalCreditSourcingOfficer: parseInt(
          req.body.totalCreditSourcingOfficer
        ),
        totalCreditProcessingOfficer: parseInt(
          req.body.totalCreditProcessingOfficer
        ),
        totalCreditUnderWritingOfficer: parseInt(
          req.body.totalCreditUnderWritingOfficer
        ),
        totalCreditDeviationOfficer: parseInt(
          req.body.totalCreditDeviationOfficer
        ),
      });
      await newBranch.save();
      res.status(200).json({
        message: "created branch successfully",
      });
    } else {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "error creating branch",
    });
  }
};

export const edit_branch = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    if (userData.username === "admin") {
      const branchId = req.params.branchId; // Assuming you pass the branch ID in the URL.
      const updatedData = req.body; // The client can send any fields they want to update.

      // Construct an object with the fields to update.
      const updateFields = {};
      for (const key in updatedData) {
        if (updatedData.hasOwnProperty(key)) {
          updateFields[key] = updatedData[key];
        }
      }

      updateFields.updatedAt = Date.now();

      // Find the branch by ID and update the specified fields.
      const result = await Branch.findByIdAndUpdate(branchId, updateFields, {
        new: true,
      });

      if (!result) {
        return res.status(404).json({
          message: "Branch not found",
        });
      }

      res.status(200).json({
        message: "Branch updated successfully",
        updatedBranch: result,
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

export const delete_branch = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    if (userData.username === "admin") {
      const branchId = req.params.branchId; // Assuming you pass the branch ID in the URL.

      // Use Mongoose's `findByIdAndRemove` to find and remove the branch by ID.
      const result = await Branch.findByIdAndRemove(branchId);

      if (!result) {
        return res.status(404).json({
          message: "Branch not found",
        });
      }

      res.status(200).json({
        message: "Branch deleted successfully",
      });
    } else {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error deleting branch",
    });
  }
};

export const get_all_branches = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    // Use Mongoose's find method to retrieve all branches
    const branches = await Branch.find();

    res.status(200).json({
      message: "Retrieved all branches successfully",
      branches: branches,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error retrieving branches",
    });
  }
};

export const get_all_branches_with_departments = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let userDepartments = await User.findOne({ _id: userData._id }).select(
      "departments"
    );

    userDepartments = userDepartments.departments;

    // Use Mongoose's find method to retrieve all branches
    let branches = await Branch.find().select("name");

    let specialUser = await User.findOne({ _id: userData._id }).select(
      "specialUser"
    );

    specialUser = specialUser.specialUser;

    branches = await Promise.all(
      branches.map(async (item) => {
        let branch = item.toObject(); // Convert to plain JavaScript object
        let departments = await Department.find({ branch: branch._id }).select(
          "_id name steps"
        );

        branch.departments = specialUser
          ? departments
          : departments.filter((item) => {
              const steps = item.steps;
              let foundAnswer = false;
              for (let l = 0; l < steps.length; l++) {
                const users = steps[l].users;
                const userExistence = users.some((actor) =>
                  actor.user.equals(userData._id)
                );
                if (userExistence) {
                  foundAnswer = true;
                  break;
                }
              }
              return foundAnswer;
            });

        branch.departments = branch.departments.map((dept) => ({
          _id: dept._id,
          name: dept.name,
          // Any other fields you want to keep can be added here
        }));

        return branch;
      })
    );

    branches = branches.filter((item) => item.departments.length > 0);
    return res.status(200).json({
      branches: branches,
    });
  } catch (error) {
    console.log("error getting branches with departments", error);
    return res.status(500).json({
      message: "Error getting branches with departments",
    });
  }
};

export const get_branch_details = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const branchId = new ObjectId(req.params.branchId);

    const branch = await Branch.findOne({ _id: branchId });

    if (branch) {
      return res.status(200).json({
        _id: branchId,
        code: branch.code,
        name: branch.name,
        status: branch.status,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt,
      });
    } else {
      return res.status(404).json({
        message: "Branch details you requested for doesn't exist",
      });
    }
  } catch (error) {
    console.log("error getting branch details", error);
    return res.status(500).json({
      message: "error getting branch details",
    });
  }
};

export const get_head_office_name = async (req, res, next) => {
  try {
    const branch = Branch.findOne({ isHeadOffice: true }).select("name");

    let branchName = branch ? branch.name : "";
    return res.status(200).json({
      branchName: branchName,
    });
  } catch (error) {
    console.log("error getting headoffice name", error);
    return res.status(500).json({
      message: "error getting headoffice name",
    });
  }
};
