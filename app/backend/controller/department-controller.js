import Work from "../models/work.js";
import { verifyUser } from "../utility/verifyUser.js";
import Branch from "../models/branch.js";
import User from "../models/user.js";
import Role from "../models/role.js";
import Department from "../models/department.js";
import Process from "../models/process.js";
import { creatFolder } from "./file-controller.js";
import { ObjectId } from "mongodb";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from "fs/promises";
import { is_branch_head_office } from "../utility/branch-handlers.js";
export const getWorks = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    const works = await Work.find({});
    res.status(200).json({
      works: works,
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "error accessing works' list",
    });
  }
};

export const addWork = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let newWork = new Work(req.body.work);

    // Save the newWork instance to the database
    newWork = await newWork.save();
    res.status(200).json({
      message: "added work successfully",
      newWork: newWork,
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "error adding work in work's list",
    });
  }
};

export const add_department = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let details = req.body;

    const isHeadOffice = await is_branch_head_office(details.branch);

    details.steps = details.workFlow;

    let branchId = await Branch.findOne({ name: req.body.branch });

    if (!branchId) {
      return res.status(400).json({
        message: "branch for which you are adding workflow doesn't exist",
      });
    }

    branchId = branchId._id;

    if (isHeadOffice) {
      let departments = await Department.find({ branch: branchId });
      if (departments.length > 0) {
        return res.status(400).json({
          message:
            "department can't be created as current branch has one department already",
        });
      }
    }

    details.name = `${details.branch}_${details.department}`;

    let folderExists = false;
    if (isHeadOffice) {
      folderExists = await creatFolder(
        true,
        `../${details.department}`,
        userData
      );
    } else {
      folderExists = await creatFolder(true, `../${details.branch}`, userData);
    }

    let path_ = isHeadOffice
      ? `../${details.department}`
      : `../${details.branch}`;

    let folderPath = path.join(
      __dirname,
      process.env.STORAGE_PATH,
      path_.substring(2)
    );
    if (folderExists === 409) {
      await fs.rm(folderPath, { recursive: true });
      if (isHeadOffice) {
        folderExists = await creatFolder(
          true,
          `../${details.department}`,
          userData
        );
      } else {
        folderExists = await creatFolder(
          true,
          `../${details.branch}`,
          userData
        );
      }
    }
    delete details.department;

    details.branch = branchId;

    const steps = details.workFlow;

    let updatedSteps = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let users = [];

      for (let j = 0; j < step.users.length; j++) {
        const currentUser = step.users[j].user;
        const currentRole = step.users[j].role;
        let user = await User.findOne({ username: currentUser }).select("id");
        if (!user) {
          return res.status(400).json({
            message:
              "one of the users mentioned in steps as an actor doesn't exist",
          });
        }
        user = user._id;

        let role = await Role.findOne({ role: currentRole }).select("id");

        if (!role) {
          return res.status(400).json({
            message:
              "one of the roles mentioned in steps as an role doesn't exist",
          });
        }

        role = role._id;

        users.push({
          user: user,
          role: role,
        });
      }

      let work = await Work.findOne({ name: step.work });

      if (!work) {
        const newWork = new Work({
          name: step.work,
        });

        work = await newWork.save();
      }

      work = work._id;

      updatedSteps.push({
        users: users,
        work: work,
        stepNumber: step.step,
      });
    }

    details.steps = updatedSteps;

    delete details.workFlow;

    details.createdAt = Date.now();

    let head = req.body.head;

    head = await User.findOne({ username: head }).select("_id");

    head = head._id;

    details.head = head;

    const newDepartment = new Department(details);

    await newDepartment.save();

    return res.status(200).json({
      message: "added department successfully",
    });
  } catch (error) {
    console.log("error adding department", error);
    return res.status(500).json({
      message: "error adding department",
    });
  }
};

export const format_workflow_step = async (step, forLog) => {
  try {
    let finalStep = {};
    const work = await Work.findOne({ _id: step.work }).select("name");
    finalStep.work = "N/A";
    if (work) {
      finalStep.work = work.name;
    }

    if (!forLog) {
      let users = [];
      for (let i = 0; i < step.users.length; i++) {
        const currentUser = step.users[i].user;
        const currentRole = step.users[i].role;

        const user = await User.findOne({ _id: currentUser }).select(
          "username"
        );

        const role = await Role.findOne({ _id: currentRole }).select("role");

        users.push({
          user: user ? user.username : "N/A",
          role: role ? role.role : "N/A",
        });
      }
      finalStep.users = users;
    } else {
      const user = await User.findOne({ _id: step.actorUser }).select(
        "username"
      );
      const role = await Role.findOne({ _id: step.actorRole }).select("role");

      finalStep.user = user ? user.username : "N/A";
      finalStep.role = role ? role.role : "N/A";
    }

    delete step._id;

    finalStep.step = step.stepNumber;

    delete step.stepNumber;

    return finalStep;
  } catch (error) {
    console.log("error", error);
    return null;
  }
};

export const format_department_data = async (departments) => {
  let departments_ = [];
  for (let i = 0; i < departments.length; i++) {
    let department = JSON.parse(JSON.stringify(departments[i]));

    const branch = await Branch.findOne({
      _id: department.branch,
    }).select("name");

    if (branch) {
      department.branch = branch.name;
    } else {
      department.branch = "N/A";
    }

    let steps_ = [];
    const steps = department.steps;
    for (let i = 0; i < steps.length; i++) {
      let formattedStep = await format_workflow_step(steps[i]);
      steps_.push(formattedStep);
    }

    delete department.steps;

    delete department.__v;

    department.workFlow = steps_;

    department.department = department.name;

    delete department.name;

    const head = await User.findOne({ _id: department.head }).select(
      "username"
    );

    if (head) {
      department.head = head.username;
    }

    departments_.push(department);
  }
  return departments_;
};

export const get_departments = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    const departments = await Department.find({});
    let departments_ = await format_department_data(departments);

    for (let i = 0; i < departments_.length; i++) {
      const processes = await Process.find({
        workFlow: departments_[i]._id,
        completed: false,
      }).select("id");

      if (processes.length > 0) {
        departments_[i].editable = false;
      } else {
        departments_[i].editable = true;
      }
    }

    return res.status(200).json({
      departments: departments_,
    });
  } catch (error) {
    console.log("error getting all the departments", error);
    return res.status(500).json({
      message: "error getting all the departments",
    });
  }
};

export const edit_department = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const departmentId = req.params.id;

    // const processes = await Process.find({
    //   workFlow: departmentId,
    //   completed: false,
    // }).select("id");

    // if (processes && processes.length > 0) {
    //   return res.status(400).json({
    //     message:
    //       "Can't edit the department right now as there are pending processes following current department workflow",
    //     processes: processes,
    //   });
    // }

    const department = Department.findOne({ _id: departmentId }).select("_id");

    if (!department) {
      return res.status(400).json({
        message: "department you are trying to edit doesn't exist",
      });
    }

    let details = req.body;

    const head = await User.findOne({ username: details.head }).select("id");

    if (!head) {
      return res.status(400).json({
        message:
          "head selected for given department doesn't exist in users list",
      });
    }

    details.head = head._id;

    if (details.department.split("_")[0] !== details.branch) {
      details.name = `${details.branch}_${details.department}`;
    }

    delete details.department;

    let branchId = await Branch.findOne({ name: req.body.branch });

    if (!branchId) {
      return res.status(400).json({
        message: "branch for which you are adding workflow doesn't exist",
      });
    }

    branchId = branchId._id;

    details.branch = branchId;

    const steps = details.workFlow;

    let updatedSteps = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let users = [];
      for (let j = 0; j < step.users.length; j++) {
        const currentUser = step.users[j].user;
        const currentRole = step.users[j].role;
        let user = await User.findOne({ username: currentUser });
        if (!user) {
          return res.status(400).json({
            message:
              "one of the users mentioned in steps as an actor doesn't exist",
          });
        }
        user = user._id;

        let role = await Role.findOne({ role: currentRole, branch: branchId });

        if (!role) {
          return res.status(400).json({
            message:
              "one of the roles mentioned in steps as an actor doesn't exist",
          });
        }

        role = role._id;

        users.push({
          user: user,
          role: role,
        });
      }

      let work = await Work.findOne({ name: step.work });

      if (!work) {
        const newWork = new Work({
          name: step.work,
        });

        work = await newWork.save();
      }

      work = work._id;

      updatedSteps.push({
        users: users,
        work: work,
        stepNumber: step.step,
      });
    }

    details.steps = updatedSteps;

    delete details.workFlow;

    details.updatedAt = Date.now();

    const updatedDepartment = await Department.findByIdAndUpdate(
      departmentId,
      details,
      { new: true }
    );

    return res.status(200).json({
      message: "Department updated successfully",
      updatedDepartment,
    });
  } catch (error) {
    console.log("error editing department", error);
    return res.status(500).json({
      message: "error editing department",
    });
  }
};

export const get_department = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    let department = await Department.findOne({ _id: req.params.id });

    if (!department) {
      return res.status(500).json({
        message: "error accessing department",
      });
    }

    department = await format_department_data([department]);

    return res.status(200).json({
      department: department,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "internal server error",
    });
  }
};

export const delete_department = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const departmentId = req.params.id;

    const processes = await Process.find({
      workFlow: departmentId,
      completed: false,
    }).select("id");

    if (processes && processes.length > 0) {
      return res.status(400).json({
        message:
          "Can't delete the department right now as there are pending processes following current department workflow",
        processes: processes,
      });
    }

    // Check if the department exists
    const department = await Department.findById(departmentId);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // If the department exists, delete it
    await Department.findByIdAndDelete(departmentId);

    return res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    return res.status(500).json({ message: "Error deleting department" });
  }
};

export const get_departments_for_initiator = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let userId = await User.findOne({ username: userData.username });
    userId = userId._id;

    const departments = await Department.find({
      steps: {
        $elemMatch: {
          stepNumber: 1,
          "users.user": userId,
        },
      },
    });

    let departments_ = await format_department_data(departments);

    return res.status(200).json({
      departments: departments_,
    });
  } catch (error) {
    console.log("error getting departments for given user");
    return res.status(500).json({
      message: "error getting departments for given user",
    });
  }
};
