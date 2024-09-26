import Document from "../models/document.js";
import User from "../models/user.js";
import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import path_ from "path";
import fs from "fs/promises";
import { dirname, join } from "path";
import { createUserPermissions } from "./file-controller.js";
import { read } from "fs";
import Role from "../models/role.js";
import {
  getChildrenForFullAccess,
  getParents,
} from "../utility/accessFunction.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function removeDuplicates(array) {
  return Array.from(new Set(array));
}

export const getDocumentChildren = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    let path = process.env.STORAGE_PATH + req.body.path.substring(2);

    const document = await Document.findOne({
      path: path, // I assume 'path' is the field that represents the parent document's ID
    });

    let documents = await getChildrenForFullAccess(document._id);

    documents = [document._id, ...documents];

    documents = documents.map(async (item) => {
      let doc = await Document.findOne({ _id: item, type: "folder" }).select(
        "path"
      );
      return doc;
    });

    documents = await Promise.all(documents);

    documents = documents
      .filter((item) => item !== null)
      .map((item) => {
        if (item) {
          let doc = item.path;
          doc = `..${doc.substring(19)}`;
          return doc;
        }
      });
    return res.status(200).json({
      children: documents,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "error fetching children for document residing at given path",
    });
  }
};

export const getDocumentDetailsOnTheBasisOfPath = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const user = await User.findOne({ username: userData.username }).exec();

    // console.log("user readable", user.readable);

    let readableArray = user.readable.map((doc) => {
      if (doc !== null) {
        return doc.toString();
      }
    });
    let writableArray = user.writable.map((doc) => {
      if (doc !== null) {
        return doc.toString();
      }
    });
    let downloadableArray = user.downloadable.map((doc) => {
      if (doc !== null) {
        return doc.toString();
      }
    });
    let uploadableArray = user.uploadable.map((doc) => {
      if (doc !== null) {
        return doc.toString();
      }
    });

    let readableArray_ = [];
    let writableArray_ = [];
    let uploadableArray_ = [];
    let downloadableArray_ = [];
    let fullAccessUploadable = [];
    let fullAccessReadable = [];
    let fullAccessDownloadable = [];
    if (userData.username !== "admin") {
      const userRole = await Role.findOne({ _id: user.role });
      readableArray_ = userRole.readable.map((doc) => doc.toString()); // Access the 'readable' field directly
      writableArray_ = userRole.writable.map((doc) => doc.toString()); // Access the 'writable' field directly
      downloadableArray_ = userRole.downloadable.map((doc) => doc.toString());
      uploadableArray_ = userRole.uploadable.map((doc) => doc.toString());
      fullAccessUploadable = userRole.fullAccessUploadable.map((doc) =>
        doc.toString()
      );
      fullAccessReadable = userRole.fullAccessReadable.map((doc) =>
        doc.toString()
      );
      fullAccessDownloadable = userRole.fullAccessDownloadable.map((doc) =>
        doc.toString()
      );

      // for(let i=0; i<fullAccessUploadable.length; i++){
      //   const children = await getChildrenForFullAccess(fullAccessUploadable[i]);
      //
      //   uploadableArray = [...uploadableArray, ...children]
      //   uploadableArray = uploadableArray.map(doc => doc.toString())
      // }
      // for(let i=0; i<fullAccessReadable.length; i++){
      //   const children = await getChildrenForFullAccess(fullAccessReadable[i]);
      //
      //   readableArray = [...readableArray, ...children]
      //   readableArray = readableArray.map(doc => doc.toString())
      // }
      // for(let i=0; i<fullAccessDownloadable.length; i++){
      //   const children = await getChildrenForFullAccess(fullAccessDownloadable[i]);
      //
      //   downloadableArray = [...downloadableArray, ...children]
      //   downloadableArray = downloadableArray.map(doc => doc.toString())
      // }
    }

    readableArray = [
      ...readableArray,
      ...readableArray_,
      ...fullAccessReadable,
    ];
    writableArray = [...writableArray, ...writableArray_];
    uploadableArray = [
      ...uploadableArray,
      ...uploadableArray_,
      ...fullAccessUploadable,
    ];
    downloadableArray = [
      ...downloadableArray,
      ...downloadableArray_,
      ...fullAccessDownloadable,
    ];

    let path = req.body.path;
    path = process.env.STORAGE_PATH + path.substring(2);

    const foundDocument = await Document.findOne({ path: path })
      .populate("children") // Populate the children references
      .exec();

    let parents = await getParents([foundDocument._id.toString()]);
    parents = parents.map((ele) => ele.toString());

    if (
      fullAccessUploadable.includes(foundDocument._id.toString()) ||
      fullAccessUploadable.some((element) => parents.includes(element))
    ) {
      const children = foundDocument.children.map((doc) => doc._id.toString());
      uploadableArray = [...uploadableArray, ...children];
    }

    if (
      fullAccessDownloadable.includes(foundDocument._id.toString()) ||
      fullAccessDownloadable.some((element) => parents.includes(element))
    ) {
      const children = foundDocument.children.map((doc) => doc._id.toString());
      downloadableArray = [...downloadableArray, ...children];
    }

    if (
      fullAccessReadable.includes(foundDocument._id.toString()) ||
      fullAccessReadable.some((element) => parents.includes(element))
    ) {
      const children = foundDocument.children.map((doc) => doc._id.toString());
      readableArray = [...readableArray, ...children];
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    let children;
    if (foundDocument) {
      if (userData.username === "admin" || user.isKeeperOfPhysicalDocs) {
        children = await Promise.all(
          foundDocument.children.map(async (child) => {
            const fileAbsolutePath = path_.join(__dirname, child.path);
            const createdBy = await User.findOne({
              _id: child.createdBy,
            }).select("username");

            const physicalKeeper = child.physicalKeeper
              ? await User.findOne({ _id: child.physicalKeeper }).select(
                  "username"
                )
              : null;
            try {
              const fileStats = await fs.stat(fileAbsolutePath);
              return {
                id: child._id,
                path: `..${child.path.substring(19)}`,
                // path: `${path}/${child.name}`,
                name: child.name, // Replace with the actual field name for the child's name
                type: child.type, // Replace with the actual field name for the child's type
                createdOn: child.createdOn,
                isInvolvedInProcess:
                  child.isInvolvedInProcess === undefined
                    ? false
                    : child.isInvolvedInProcess,
                createdBy: createdBy.username,
                lastUpdated: fileStats.mtime,
                lastAccessed: fileStats.atime,
                size: fileStats.size,
                isUploadable: true,
                isDownloadable: true,
                isRejected: child.isRejected || false,
                physicalHolder: physicalKeeper,
                children: [],
              };
            } catch (error) {
              return null;
            }
          })
        );
      } else {
        children = await Promise.all(
          foundDocument.children
            .filter(
              (child) =>
                writableArray.includes(child._id.toString()) ||
                readableArray.includes(child._id.toString())
            )
            .map(async (child) => {
              const fileAbsolutePath = path_.join(__dirname, child.path);
              const createdBy = await User.findOne({
                _id: child.createdBy,
              }).select("username");

              const physicalKeeper = child.physicalKeeper
                ? await User.findOne({
                    _id: child.physicalKeeper,
                  }).select("username")
                : null;
              try {
                const fileStats = await fs.stat(fileAbsolutePath);
                return {
                  id: child._id,
                  path: `..${child.path.substring(19)}`,
                  // path: `${path}/${child.name}`,
                  name: child.name, // Replace with the actual field name for the child's name
                  type: child.type, // Replace with the actual field name for the child's type
                  createdOn: child.createdOn,
                  isInvolvedInProcess:
                    child.isInvolvedInProcess === undefined
                      ? false
                      : child.isInvolvedInProcess,
                  createdBy: createdBy.username,
                  lastUpdated: fileStats.mtime,
                  lastAccessed: fileStats.atime,
                  size: fileStats.size,
                  isRejected: child.isRejected || false,
                  physicalHolder: physicalKeeper,
                  // isUploadable: uploadableArray.includes(child._id),
                  isDownloadable:
                    user._id.toString() === child.createdBy.toString()
                      ? true
                      : downloadableArray.includes(child._id),
                  children: [],
                };
              } catch (error) {
                return null;
              }
            })
        );
      }

      let result = await Promise.all(children);

      result = result.filter((item) => item !== null);

      const createdByOfFoundDocument = await Document.findOne({ path: path });

      res.status(200).json({
        children: result,
        isUploadable:
          userData.username === "admin"
            ? true
            : user._id.toString() ===
              createdByOfFoundDocument.createdBy.toString()
            ? true
            : uploadableArray.includes(createdByOfFoundDocument._id.toString()),
      });
    } else {
      res.status(400).json({
        message: "document doesn't exist",
      });
    }
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "error accessing given document",
    });
    console.error("Error finding document:", error);
  }
};

export const create_permissions = async (req, res) => {
  try {
    // permissions
    // filename, read, write

    for (let i = 0; i < req.body.permissions.length; i++) {
      const obj = req.body.permissions[i];
      const documentId = await Document.findOne({ path: obj.filePath }).exec();
      const path = obj.filePath;
      const pathSegments = path.split("/").filter((segment) => segment !== "");
      const permissionedUsers = [...obj.read, ...obj.write];
      for (let m = 0; m < permissionedUsers.length; m++) {
        let id_ = "..";
        for (let p = 1; p < pathSegments.length - 1; p++) {
          if (id_ === "") {
            id_ = "/" + pathSegments[p];
          } else {
            id_ = id_ + "/" + pathSegments[p];
          }
          const documentID = await Document.findOne({ path: id_ }).exec();
          await createUserPermissions(documentID, permissionedUsers[m], false);
        }
      }
      for (let j = 0; j < obj.read.length; j++) {
        await createUserPermissions(documentId, obj.read[j], false);
      }
      for (let k = 0; k < obj.write.length; k++) {
        await createUserPermissions(documentId, obj.write[k], true);
      }
    }

    res.status(200).json({
      message: "permissions created successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "error creating permissions",
    });
  }
};

export const getDocumentDetailsForAdmin = async (req, res) => {
  try {
    const documents = await Document.find({});

    res.status(200).json({
      documents: documents,
    });
  } catch (error) {
    res.status(500).json({
      message: "error in returning document details",
    });
  }
};

export const getDocumentDetailsOnTheBasisOfPathForEdit = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    // const user = await User.findOne({ username: req.body.username }).exec();
    // let readableArray = user.readable.map(doc => doc.toString());
    // let writableArray = user.writable.map(doc => doc.toString());
    // let downloadableArray = user.downloadable.map(doc => doc.toString());
    // let uploadableArray = user.uploadable.map(doc => doc.toString());

    let readableArray = [];
    let writableArray = [];
    let uploadableArray = [];
    let downloadableArray = [];
    let fullAccessUploadable = [];
    let fullAccessReadable = [];
    let fullAccessDownloadable = [];
    const userRole = await Role.findOne({ _id: req.body.role });
    readableArray = userRole.readable.map((doc) => doc.toString()); // Access the 'readable' field directly
    writableArray = userRole.writable.map((doc) => doc.toString()); // Access the 'writable' field directly
    downloadableArray = userRole.downloadable.map((doc) => doc.toString());
    uploadableArray = userRole.uploadable.map((doc) => doc.toString());
    fullAccessUploadable = userRole.fullAccessUploadable.map((doc) =>
      doc.toString()
    );
    fullAccessReadable = userRole.fullAccessReadable.map((doc) =>
      doc.toString()
    );
    fullAccessDownloadable = userRole.fullAccessDownloadable.map((doc) =>
      doc.toString()
    );

    // readableArray = [...readableArray, ...readableArray_];
    // writableArray = [...writableArray, ...writableArray_];
    // uploadableArray = [...uploadableArray, ...uploadableArray_];
    // downloadableArray = [...downloadableArray, ...downloadableArray_];

    let path = req.body.path;
    path = process.env.STORAGE_PATH + path.substring(2);
    const foundDocument = await Document.findOne({ path: path })
      .populate("children") // Populate the children references
      .exec();

    let parents = await getParents([foundDocument._id.toString()]);
    parents = parents.map((ele) => ele.toString());

    // if(fullAccessUploadable.includes(foundDocument._id.toString()) || fullAccessUploadable.some(element => parents.includes(element))){
    //   const children = foundDocument.children.map(doc => doc._id.toString())
    //   uploadableArray = [...uploadableArray, ...children]
    //
    // }

    // if(fullAccessDownloadable.includes(foundDocument._id.toString()) || fullAccessDownloadable.some(element => parents.includes(element))){
    //   const children = foundDocument.children.map(doc => doc._id.toString())
    //   downloadableArray = [...downloadableArray, ...children]
    // }

    // if(fullAccessReadable.includes(foundDocument._id.toString()) || fullAccessReadable.some(element => parents.includes(element))){
    //   const children = foundDocument.children.map(doc => doc._id.toString())
    //   readableArray = [...readableArray, ...children]
    //
    // }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    let children;
    let selectedUpload = [];
    let selectedDownload = [];
    let selectedView = [];
    let fullAccess = [];
    const check = [
      ...fullAccessUploadable,
      ...fullAccessDownloadable,
      ...fullAccessReadable,
    ];
    if (foundDocument) {
      children = foundDocument.children
        // .filter((child) => writableArray.includes(child._id.toString()) || readableArray.includes(child._id.toString()))
        .map(async (child) => {
          const fileAbsolutePath = path_.join(__dirname, child.path);
          try {
            const fileStats = await fs.stat(fileAbsolutePath);
            let obj = {
              id: child._id,
              upload: false,
              download: false,
              view: false,
            };

            let parents = await getParents([child._id.toString()]);
            parents = parents.map((ele) => ele.toString());

            if (
              fullAccessUploadable.includes(child._id.toString()) ||
              fullAccessUploadable.some((element) => parents.includes(element))
            ) {
              if (child.type === "folder") {
                obj.upload = true;
              }
            }
            if (
              fullAccessDownloadable.includes(child._id.toString()) ||
              fullAccessDownloadable.some((element) =>
                parents.includes(element)
              )
            ) {
              if (child.type === "folder") {
                obj.download = true;
              } else {
                selectedDownload.push(child._id);
              }
            }
            if (
              fullAccessReadable.includes(child._id.toString()) ||
              fullAccessReadable.some((element) => parents.includes(element))
            ) {
              if (child.type === "folder") {
                obj.view = true;
              } else {
                selectedView.push(child._id);
              }
            }
            if (
              check.includes(child._id.toString()) ||
              check.some((element) => parents.includes(element))
            ) {
              if (child.type === "folder") {
                fullAccess.push(obj);
              }
            }

            if (uploadableArray.includes(child._id.toString())) {
              selectedUpload.push(child._id);
              // selectedView = [...selectedView, ...parents]
            }
            if (downloadableArray.includes(child._id.toString())) {
              selectedDownload.push(child._id);
              // selectedView = [...selectedView, ...parents]
            }
            if (readableArray.includes(child._id.toString())) {
              // const array = [...parents, child._id]
              // selectedView = [...selectedView, ...array]
              selectedView.push(child._id);
            }
            return {
              id: child._id,
              name: child.name,
              path: `..${child.path.substring(19)}`,
              // path: child.path,
              type: child.type,
              children: [],
            };
          } catch (error) {
            return null;
          }
        });
      // }

      let result = await Promise.all(children);

      result = result.filter((item) => item !== null);

      // const createdByOfFoundDocument = await Document.findOne({ path: path })

      res.status(200).json({
        children: result,
        // isUploadable: req.body.username === "admin" ? true : (user._id.toString() === createdByOfFoundDocument.createdBy.toString() ? true :  uploadableArray.includes(createdByOfFoundDocument._id.toString())),
        selectedUpload: selectedUpload,
        selectedDownload: selectedDownload,
        selectedView: selectedView,
        fullAccess: fullAccess,
      });
    } else {
      res.status(400).json({
        message: "document doesn't exist",
      });
    }
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "error accessing given document",
    });
    console.error("Error finding document:", error);
  }
};
