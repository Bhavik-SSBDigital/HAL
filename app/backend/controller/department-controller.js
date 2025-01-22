import Work from "../models/work.js";
import { verifyUser } from "../utility/verifyUser.js";
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

    // const isHeadOffice = await is_branch_head_office(details.branch);

    details.steps = details.workFlow;

    details.name = details.department;

    let folderExists = false;

    folderExists = await creatFolder(true, `../${details.name}`, userData);

    let path_ = `../${details.name}`;

    let folderPath = path.join(
      __dirname,
      process.env.STORAGE_PATH,
      path_.substring(2)
    );
    if (folderExists === 409) {
      await fs.rm(folderPath, { recursive: true });
      folderExists = await creatFolder(true, `../${details.name}`, userData);
    }
    delete details.department;

    // const steps = details.workFlow;

    // let updatedSteps = [];
    // for (let i = 0; i < steps.length; i++) {
    //   const step = steps[i];
    //   let users = [];

    //   for (let j = 0; j < step.users.length; j++) {
    //     const currentUser = step.users[j].user;
    //     const currentRole = step.users[j].role;
    //     let user = await User.findOne({ username: currentUser }).select("id");
    //     if (!user) {
    //       return res.status(400).json({
    //         message:
    //           "one of the users mentioned in steps as an actor doesn't exist",
    //       });
    //     }
    //     user = user._id;

    //     let role = await Role.findOne({ role: currentRole }).select("id");

    //     if (!role) {
    //       return res.status(400).json({
    //         message:
    //           "one of the roles mentioned in steps as an role doesn't exist",
    //       });
    //     }

    //     role = role._id;

    //     users.push({
    //       user: user,
    //       role: role,
    //     });
    //   }

    //   // let work = await Work.findOne({ name: step.work });

    //   // if (!work) {
    //   //   const newWork = new Work({
    //   //     name: step.work,
    //   //   });

    //   //   work = await newWork.save();
    //   // }

    //   // work = work._id;

    //   updatedSteps.push({
    //     users: users,
    //     // work: work,
    //     stepNumber: step.step,
    //   });
    // }

    // details.steps = updatedSteps;

    // delete details.workFlow;

    details.createdAt = Date.now();

    // let head = req.body.head;

    // head = await User.findOne({ username: head }).select("_id");

    // if (!head) {
    //   return res.status(404).json({
    //     message: "Selected head doesn't exist",
    //   });
    // }

    // head = head._id;

    // details.head = head;

    // let admin = await User.findOne({ username: req.body.admin }).select("_id");

    // if (!admin) {
    //   return res.status(404).json({ message: "Selected admin is not found" });
    // }

    // admin = admin._id;

    // details.admin = admin;

    if (req.body.parentDepartment) {
      let parentDepartment = await Department.findOne({
        name: req.body.parentDepartment,
      }).select("_id");

      if (!parentDepartment) {
        return res
          .status(404)
          .json({ message: "selected parent department is not found" });
      }

      parentDepartment = parentDepartment._id;

      details.parentDepartment = parentDepartment;
    }

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
    // const work = await Work.findOne({ _id: step.work }).select("name");
    // finalStep.work = "N/A";
    // if (work) {
    //   finalStep.work = work.name;
    // }

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

export const format_workflow_steps = async (steps) => {
  try {
    let finalSteps = [];
    for (let i = 0; i < steps.length; i++) {
      let formattedStep = await format_workflow_step(steps[i]);
      finalSteps.push(formattedStep);
    }
    return finalSteps;
  } catch (error) {
    console.log("error", error);
    return null;
  }
};

export const format_department_data = async (departments) => {
  let departments_ = [];
  for (let i = 0; i < departments.length; i++) {
    let department = JSON.parse(JSON.stringify(departments[i]));

    let steps_ = [];

    if (department.steps) {
      const steps = department.steps;
      for (let i = 0; i < steps.length; i++) {
        let formattedStep = await format_workflow_step(steps[i]);
        steps_.push(formattedStep);
      }
      department.workFlow = steps_;
    }

    delete department.steps;

    delete department.__v;

    // department.department = department.name;

    // delete department.name;

    if (department.head) {
      const head = await User.findOne({ _id: department.head }).select(
        "username"
      );

      if (head) {
        department.head = head.username;
      }
    }

    if (department.admin) {
      const admin = await User.findOne({ _id: department.admin }).select(
        "username"
      );

      if (admin && admin.username) {
        department.admin = admin.username;
      } else {
        department.admin = "N/A";
      }
    } else {
      department.admin = "N/A";
    }

    if (department.parentDepartment) {
      const parentDepartment = await Department.findOne({
        _id: department.parentDepartment,
      }).select("name");

      if (parentDepartment && parentDepartment.name) {
        department.parentDepartment = parentDepartment.name;
      } else {
        department.parentDepartment = "N/A";
      }
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
    const departments = req.body.type
      ? await Department.find({ type: req.body.type })
      : await Department.find({});
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

export const get_department_names = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const departments = await Department.find({ type: "department" })
      .select("_id name")
      .lean();

    return res.status(200).json({
      names: departments,
    });
  } catch (error) {
    console.log("error getting department names", error);
    return res.status(500).json({
      message: "error getting department names",
    });
  }
};

export const get_branch_names = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const departments = await Department.find({ type: "branch" })
      .select("_id name")
      .lean();

    return res.status(200).json({
      names: departments,
    });
  } catch (error) {
    console.log("error getting department names", error);
    return res.status(500).json({
      message: "error getting department names",
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

    const department = await Department.findOne({ _id: departmentId }).select(
      "_id admin"
    );

    if (!department) {
      return res.status(400).json({
        message: "Department you are trying to edit doesn't exist",
      });
    }

    if (
      !department.admin ||
      !department.admin.equals(new ObjectId(userData._id)) ||
      userData.username !== "admin"
    ) {
      return res.status(400).json({
        message:
          "Only department/branch admin or super admin can do the edition",
      });
    }

    let details = req.body;

    const head = await User.findOne({ username: details.head }).select("_id");

    if (!head) {
      return res.status(400).json({
        message:
          "Head selected for the given department doesn't exist in users list",
      });
    }

    details.head = head._id;

    let admin = await User.findOne({ username: req.body.admin }).select("_id");

    if (!admin) {
      return res.status(404).json({ message: "Selected admin is not found" });
    }

    admin = admin._id;

    details.admin = admin;

    if (req.body.parentDepartment) {
      let parentDepartment = await Department.findOne({
        name: req.body.parentDepartment,
      }).select("_id");

      if (!parentDepartment) {
        return res
          .status(404)
          .json({ message: "Selected parent department is not found" });
      }

      parentDepartment = parentDepartment._id;

      details.parentDepartment = parentDepartment;
    }

    details.name = `${details.department}`;

    delete details.department;

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
              "One of the users mentioned in steps as an actor doesn't exist",
          });
        }
        user = user._id;

        let role = await Role.findOne({ role: currentRole, branch: branchId });

        if (!role) {
          return res.status(400).json({
            message:
              "One of the roles mentioned in steps as an actor doesn't exist",
          });
        }

        role = role._id;

        users.push({
          user: user,
          role: role,
        });
      }

      updatedSteps.push({
        users: users,
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
      message: "Error editing department",
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

    let department = await Department.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!department) {
      return res.status(500).json({
        message: "error accessing department",
      });
    }

    department = await format_department_data([department]);

    return res.status(200).json({
      department: department[0],
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

const formatWorkflowSteps = async (steps) => {
  return Promise.all(
    steps.map(async (item) => {
      try {
        // Fetch and extract the work name
        const workDoc = await Work.findOne({ _id: item.work }).select("name");
        const workName = workDoc ? workDoc.name : null;

        // Process users and their roles
        const finalUsers = await Promise.all(
          item.users.map(async (u) => {
            const userDoc = await User.findOne({ _id: u.user }).select(
              "username"
            );
            const username = userDoc ? userDoc.username : null;

            const roleDoc = await Role.findOne({ _id: u.role }).select("role");
            const roleName = roleDoc ? roleDoc.role : null;

            return {
              user: username,
              role: roleName,
            };
          })
        );

        // Return the formatted step
        return {
          work: workName,
          users: finalUsers,
          step: item.stepNumber,
        };
      } catch (error) {
        console.error("Error formatting workflow step:", error);
        return null; // Handle or log errors as needed
      }
    })
  );
};

export const get_merged_workflow = async (req, res, next) => {
  try {
    const approver = req.body.approver;
    const initiator = req.body.initiator;

    // Fetch steps for approver and initiator departments
    let approverSteps = await Department.findOne({ name: approver }).select(
      "steps"
    );
    approverSteps = approverSteps.steps;

    let initiatorSteps = await Department.findOne({ name: initiator }).select(
      "steps"
    );
    initiatorSteps = initiatorSteps.steps;

    // Format workflow steps
    approverSteps = await formatWorkflowSteps(approverSteps);
    initiatorSteps = await formatWorkflowSteps(initiatorSteps);

    console.log("initiator department", initiatorSteps);
    console.log("approver steps", approverSteps);

    // Filter out "upload" steps from approverSteps only
    approverSteps = approverSteps.filter((step) => step.work !== "upload");

    // Adjust approver step numbers relative to the initiator steps
    approverSteps = approverSteps.map((item, index) => {
      return {
        ...item,
        step: index + 1 + initiatorSteps.length, // Renumber based on new position after filtering
      };
    });

    // Merge initiator and approver steps
    let finalSteps = [...initiatorSteps, ...approverSteps];

    return res.status(200).json({
      steps: finalSteps,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error fetching merged steps",
    });
  }
};
