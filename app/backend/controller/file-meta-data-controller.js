import Document from "../models/document.js";
import Department from "../models/department.js";
import Work from "../models/work.js";
import { createUserPermissions } from "./file-controller.js";
import { storeChildIdInParentDocument } from "./file-controller.js";
import { verifyUser } from "../utility/verifyUser.js";
import { ObjectId } from "mongodb";
import Branch from "../models/branch.js";

export const add_doc_meta_data = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);

    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const { workName, year, cabinetNo, name } = req.body;

    let departmentName = req.body.departmentName;

    const department = await Department.findOne({
      name: req.body.departmentName,
    }).select("_id");

    const headOfficeBranch = Branch.findOne({ isHeadOffice: true }).select(
      "name"
    );

    let pathForDepartment = headOfficeBranch
      ? departmentName.split("_")[0] === headOfficeBranch.name
        ? `../${departmentName.substring(11)}`
        : `../${departmentName}`
      : `../${departmentName}`;

    console.log("path for department", pathForDepartment);

    let path = req.body.path || pathForDepartment;

    path = path.substring(2);

    path = "../../../../storage" + path;

    let docData = {
      department: department._id,
      path: path + `/${name}`,
      type: "file",
      createdBy: new ObjectId(userData._id),
      isProject: false,
      onlyMetaData: true,
    };

    let fileName = `${name}`;

    if (workName) {
      docData.work = workName;

      // fileName += `_${workName}`;
    }

    if (year) {
      docData.year = year;
    }

    if (cabinetNo) {
      docData.cabinetNo = cabinetNo;
    }

    const regexPattern = new RegExp(`^${fileName}`);

    let uniqueNo = await Document.countDocuments({
      name: { $regex: regexPattern },
    });

    uniqueNo += 1;
    fileName = `${fileName}_${uniqueNo}`;

    docData.name = fileName;

    let newDocument = new Document(docData);

    newDocument = await newDocument.save();

    console.log("new doc", newDocument);
    const relativePath = path + `/${fileName}`;

    await createUserPermissions(newDocument._id, userData.username, true);
    const parts = relativePath.split("/");
    const parentPath = parts.slice(0, -1).join("/");

    await storeChildIdInParentDocument(parentPath, newDocument._id);
    return res.status(200).json({
      message: "added doc meta data successfully",
    });
  } catch (error) {
    console.log("Error adding meta data of document", error);
    return res.status(500).json({
      message: "Error adding meta data of document",
    });
  }
};
