import Role from "../models/role.js"; // Adjust the path to your Role model
import {
  uploadAccess,
  downloadAccess,
  viewAccess,
  fullAccess,
  getParents,
} from "../utility/accessFunction.js";

import { ObjectId } from "mongodb";

import { verifyUser } from "../utility/verifyUser.js";
import Department from "../models/department.js";
function removeDuplicates(array) {
  return Array.from(new Set(array));
}

export const add_role = async (req, res, next) => {
  try {
    // Extract data from the request body
    const { branch, role } = req.body;

    // Check if a role with the same branch and role already exists
    let branchId = await Department.findOne({ name: branch });
    const existingRole = await Role.findOne({ branchId, role });

    if (!branchId) {
      return res.status(400).json({
        message: "branch selected for role doesn't exist",
      });
    }

    if (existingRole) {
      return res.status(400).json({
        message: "Role with the same branch and role already exists",
      });
    }

    const roleRef = req.body;
    // let uploads = await uploadAccess(req.body.selectedUpload, true);
    // let downloads = await downloadAccess(req.body.selectedDownload, true);
    // let view = await viewAccess(req.body.selectedView, true);
    let uploads = req.body.selectedUpload;
    let downloads = req.body.selectedDownload;
    let view = req.body.selectedView;
    // let fullAccess_ = await fullAccess(req.body.fullAccess);

    let ids = req.body.fullAccess.map((doc) => doc.id);
    ids = [...uploads, ...downloads, ...view];

    //
    let fullAccessUploadable = req.body.fullAccess
      .filter((doc) => doc.upload)
      .map((doc) => doc.id);
    let fullAccessDownloadable = req.body.fullAccess
      .filter((doc) => doc.download)
      .map((doc) => doc.id);
    let fullAccessReadable = req.body.fullAccess
      .filter((doc) => doc.view)
      .map((doc) => doc.id);
    ids = [
      ...ids,
      ...fullAccessUploadable,
      ...fullAccessDownloadable,
      ...fullAccessReadable,
    ];

    let parents = await getParents(ids);

    parents = parents.map((ele) => ele.toString());

    parents = removeDuplicates(parents);

    uploads = [...new Set([...uploads])];
    downloads = [...new Set([...downloads])];

    view = [...new Set([...view, ...parents])];
    roleRef.uploadable = uploads;
    roleRef.downloadable = downloads;
    roleRef.readable = view;
    roleRef.fullAccessUploadable = fullAccessUploadable;
    roleRef.fullAccessDownloadable = fullAccessDownloadable;
    roleRef.fullAccessReadable = fullAccessReadable;

    roleRef.status = "Active";
    roleRef.createdAt = Date.now();
    roleRef.branch = branchId._id;

    delete roleRef.fullAccess;

    // Create a new Role document
    const newRole = new Role(roleRef);

    // Save the new role to the database
    await newRole.save();

    res.status(200).json({
      message: "Role created successfully",
      role: newRole,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error adding role",
    });
  }
};

export const edit_role = async (req, res, next) => {
  try {
    const roleId = req.params.roleId;

    const updatedData = req.body;

    const branchId = await Department.findOne({ name: updatedData.branch });

    // Update access rights, fullAccess, and other properties
    const uploads = await uploadAccess(updatedData.selectedUpload, true);
    const downloads = await downloadAccess(updatedData.selectedDownload, true);
    const view = await viewAccess(updatedData.selectedView, true);

    let ids = updatedData.fullAccess.map((doc) => doc.id);
    const fullAccessUploadable = updatedData.fullAccess
      .filter((doc) => doc.upload)
      .map((doc) => doc.id);
    const fullAccessDownloadable = updatedData.fullAccess
      .filter((doc) => doc.download)
      .map((doc) => doc.id);
    const fullAccessReadable = updatedData.fullAccess
      .filter((doc) => doc.view)
      .map((doc) => doc.id);

    ids = [
      ...ids,
      ...fullAccessDownloadable,
      ...fullAccessUploadable,
      ...fullAccessReadable,
    ];

    ids = [
      ...new Set([
        ...ids,
        ...fullAccessDownloadable,
        ...fullAccessUploadable,
        ...fullAccessReadable,
      ]),
    ];

    const parents = await getParents(ids);

    // Update the fields in updatedData after using access functions
    updatedData.uploadable = [
      ...new Set([...uploads, ...fullAccessUploadable]),
    ];
    updatedData.downloadable = [
      ...new Set([...downloads, ...fullAccessDownloadable]),
    ];
    updatedData.readable = [
      ...new Set([...view, ...parents, ...fullAccessReadable]),
    ];
    updatedData.fullAccessUploadable = fullAccessUploadable;
    updatedData.fullAccessDownloadable = fullAccessDownloadable;
    updatedData.fullAccessReadable = fullAccessReadable;
    updatedData.status = "Active";
    updatedData.updatedAt = Date.now();
    updatedData.branch = branchId;
    delete updatedData.fullAccess;

    // Use findOneAndUpdate to update the role in the database
    const updatedRole = await Role.findOneAndUpdate(
      { _id: roleId },
      updatedData,
      {
        new: true, // Return the updated document
      }
    );

    if (!updatedRole) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    res.status(200).json({
      message: "Role updated successfully",
      role: updatedRole,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error editing role",
    });
  }
};

export const delete_role = async (req, res, next) => {
  try {
    // Extract data from the request body
    // const { branch, role } = req.body;

    // Find and delete the role by branch and role
    const deletedRole = await Role.findOneAndDelete({ _id: req.params.roleId });

    if (!deletedRole) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    res.status(200).json({
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error deleting role",
    });
  }
};

export const get_roles_in_branch = async (req, res, next) => {
  try {
    // Extract the branch ID from the request parameters
    const { branchId } = req.params;

    // Use Mongoose's find method to retrieve roles for the specified branch
    const roles = await Role.find({ branch: branchId });

    res.status(200).json({
      message: "Retrieved roles for the branch successfully",
      roles: roles,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error retrieving roles for the branch",
    });
  }
};

export const get_roles = async (req, res) => {
  try {
    let roles = await Role.find({}, "status branch role createdAt updatedAt");

    roles = await Promise.all(
      roles.map(async (role) => {
        const branch = await Department.findOne({ _id: role.branch });
        let name;
        if (branch) {
          name = branch.name;
        } else {
          name = "N/A";
        }
        let role_ = { ...role.toObject() };
        delete role_.branch;
        role_.branch = name;
        return role_;
      })
    );

    res.status(200).json({
      roles: roles,
    });
  } catch (error) {
    res.status(500).json({
      message: "error getting roles",
    });
  }
};

export const get_role_names = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const roles = await Role.distinct("role");

    return res.status(200).json({
      roles: roles,
    });
  } catch (error) {
    console.log("error getting role names", error);
    return res.status(500).json({
      message: "error getting role names",
    });
  }
};

export const get_role = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const roleId = new ObjectId(req.params.roleId);

    const role = await Role.findOne({ _id: roleId });

    if (role) {
      const branchName = await Department.findOne({ _id: role.branch }).select(
        "name"
      );
      if (!branchName) {
        return res.status(404).json({
          message: "Branch where role is supposed to be present doesn't exist",
        });
      }
      return res.status(200).json({
        _id: roleId,
        status: role.status,
        role: role.role,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        branch: branchName.name,
      });
    } else {
      return res.status(404).json({
        message: "role details you requested doesn't exist",
      });
    }
  } catch (error) {
    console.log("error getting role details", error);
    return res.status(500).json({
      message: "error getting role details",
    });
  }
};
