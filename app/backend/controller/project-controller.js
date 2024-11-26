import Document from "../models/document.js";
import User from "../models/user.js";
import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import path_ from "path";
import fs from "fs/promises";
import { dirname, join } from "path";
import Role from "../models/role.js";
import {
  getChildrenForDoc,
  getChildrenForFullAccess,
} from "../utility/accessFunction.js";
import { read } from "fs";

export const getRootDocumentsWithAccess = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    // Assuming you have a way to identify the user, e.g., from a token
    const userId = userData._id; // Adjust this based on your authentication mechanism

    // Find the user to retrieve their readable and writable documents
    let user =
      userData.username === "admin"
        ? await User.findById(userId).populate("readable writable")
        : await User.findById(userId).populate(
            "readable writable downloadable uploadable role"
          );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let readableDocumentIds = [];
    let writableDocumentIds = [];
    let uploadableDocumentIds = [];
    let downloadableDocumentIds = [];
    let fullAccessUploadable = [];
    let fullAccessReadable = [];
    let fullAccessDownloadable = [];
    if (user.username !== "admin") {
      const userRole = await Role.findOne({ _id: user.role });
      readableDocumentIds = userRole.readable.map((doc) => doc.toString()); // Access the 'readable' field directly
      writableDocumentIds = userRole.writable.map((doc) => doc.toString()); // Access the 'writable' field directly
      downloadableDocumentIds = userRole.downloadable.map((doc) =>
        doc.toString()
      );
      uploadableDocumentIds = userRole.uploadable.map((doc) => doc.toString());
      fullAccessUploadable = userRole.fullAccessUploadable.map((doc) =>
        doc.toString()
      );
      fullAccessReadable = userRole.fullAccessReadable.map((doc) =>
        doc.toString()
      );
      fullAccessDownloadable = userRole.fullAccessDownloadable.map((doc) =>
        doc.toString()
      );

      console.log("FULL ACCESS UPLOADABLE", fullAccessUploadable);
      for (let i = 0; i < fullAccessUploadable.length; i++) {
        const children = await getChildrenForDoc(fullAccessUploadable[i]);

        uploadableDocumentIds = [
          ...uploadableDocumentIds,
          // ...children,
          fullAccessUploadable[i],
        ];
      }
      for (let j = 0; j < fullAccessReadable.length; j++) {
        const children = await getChildrenForFullAccess(fullAccessReadable[j]);
        readableDocumentIds = [
          ...readableDocumentIds,
          ...children,
          fullAccessReadable[j],
        ];
      }
      for (let k = 0; k < fullAccessDownloadable.length; k++) {
        const children = await getChildrenForFullAccess(
          fullAccessDownloadable[k]
        );
        downloadableDocumentIds = [
          ...downloadableDocumentIds,
          ...children,
          fullAccessDownloadable[k],
        ];
      }
    }

    // Extract the IDs of readable and writable documents
    let readableDocumentIds_ = user.readable.map((doc) => doc._id.toString());
    let writableDocumentIds_ = user.writable.map((doc) => doc._id.toString());
    let downloadableDocumentIds_ = user.downloadable.map((doc) =>
      doc.toString()
    );
    let uploadableDocumentIds_ = user.uploadable.map((doc) => doc.toString());

    console.log("uploadable docs by user", uploadableDocumentIds_);
    console.log("uploadable docs by role", uploadableDocumentIds);

    readableDocumentIds = [
      ...new Set([...readableDocumentIds, ...readableDocumentIds_]),
    ];
    writableDocumentIds = [
      ...new Set([...writableDocumentIds, ...writableDocumentIds_]),
    ];
    uploadableDocumentIds = [
      ...new Set([...uploadableDocumentIds, ...uploadableDocumentIds_]),
    ];
    downloadableDocumentIds = [
      ...new Set(...downloadableDocumentIds, ...downloadableDocumentIds_),
    ];

    // Find documents whose parent's path contains "../"
    const rootDocuments = await Document.find({ isProject: true });

    if (!rootDocuments || rootDocuments.length === 0) {
      return res.status(200).json({
        children: [],
      });
    }

    // Filter the root documents based on user access
    let accessibleRootDocuments;

    if (userData.username === "admin" || user.isKeeperOfPhysicalDocs) {
      accessibleRootDocuments = rootDocuments;
    } else {
      accessibleRootDocuments = rootDocuments.filter((doc) => {
        if (
          readableDocumentIds.includes(doc._id.toString()) ||
          writableDocumentIds.includes(doc._id.toString())
        ) {
          return true;
        }
        return false;
      });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    let accessibleRootDocuments_ = accessibleRootDocuments.map(
      async (child) => {
        const fileAbsolutePath = path_.join(__dirname, child.path);
        try {
          const fileStats = await fs.stat(fileAbsolutePath);
          return {
            id: child._id,
            name: child.name, // Replace with the actual field name for the child's name
            // path: `../${child.name}`,
            path: `..${child.path.substring(19)}`,
            type: child.type, // Replace with the actual field name for the child's type
            createdOn: child.createdOn,
            createdBy: child.createdBy,
            lastUpdated: fileStats.mtime,
            lastAccessed: fileStats.atime,
            size: fileStats.size,
            // isUploadable: user.username === "admin" ? true : uploadableDocumentIds.includes(child._id),
            isDownloadable:
              user.username === "admin" ||
              child.createdBy.toString() === user._id.toString()
                ? true
                : downloadableDocumentIds.includes(child._id.toString()),
            isUploadable:
              user.username === "admin" ||
              uploadableDocumentIds
                .map((item) => item.toString())
                .includes(child._id.toString()),
            children: [],
          };
        } catch (error) {
          return null;
        }
      }
    );

    let result = await Promise.all(accessibleRootDocuments_);

    result = result.filter((item) => item !== null);

    if (accessibleRootDocuments.length > 0) {
      return res.status(200).json({
        children: result,
      });
    } else {
      return res.status(200).json({ children: [] });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getRootDocumentsForEdit = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    // // const user = await User.findOne({ username: req.body.username }).exec();
    // let readableArray = [];
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

    // const path = req.body.path;
    //   const foundDocument = await Document.findOne({ path: path })
    //   .populate('children') // Populate the children references
    //   .exec();

    let foundDocument = await Document.find({ isProject: true });

    // let parents = await getParents([foundDocument._id.toString()]);
    // parents = parents.map(ele => ele.toString());
    //

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
      foundDocument = foundDocument
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

            if (fullAccessUploadable.includes(child._id.toString())) {
              obj.upload = true;
            }
            if (fullAccessDownloadable.includes(child._id.toString())) {
              obj.download = true;
            }
            if (fullAccessReadable.includes(child._id.toString())) {
              obj.view = true;
            }
            if (check.includes(child._id.toString())) {
              fullAccess.push(obj);
            }

            if (uploadableArray.includes(child._id.toString())) {
              selectedUpload.push(child._id);
            }
            if (downloadableArray.includes(child._id.toString())) {
              selectedDownload.push(child._id);
            }
            if (readableArray.includes(child._id.toString())) {
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
      foundDocument = await Promise.all(foundDocument);

      foundDocument = foundDocument.filter((item) => item !== null);
      // const result = await Promise.all(children);
      // const createdByOfFoundDocument = await Document.findOne({ path: path })

      res.status(200).json({
        children: foundDocument,
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
