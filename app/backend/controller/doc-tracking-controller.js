import { verifyUser } from "../utility/verifyUser.js";
import DocHistory from "../models/doc-tracking.js";
import Document from "../models/document.js";
import User from "../models/user.js";
import { ObjectId } from "mongodb";
import Process from "../models/process.js";

export const borrow_document = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const user = await User.findOne({ username: req.body.borrower }).select(
      "_id"
    );

    const docUpdated = await Document.findOneAndUpdate(
      { _id: req.body.documentId },
      {
        physicalKeeper: userData._id,
      },
      {
        new: true,
      }
    );

    if (!docUpdated) {
      console.log("document not found");
    }

    const doc_log = new DocHistory({
      borrower: user._id,
      time: new Date(),
      documentId: req.body.documentId,
      purpose: req.body.purpose,
    });

    await doc_log.save();

    return res.status(200).json({
      message: "physical document transfer entry rugistered.",
    });
  } catch (error) {
    console.log("error registring physical document transfer entry");
    return res.status(500).json({
      message: "Error registring physical document transfer entry",
    });
  }
};

export const return_document = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const user = await User.findOne({ username: req.body.borrower }).select(
      "_id"
    );

    let doc_log = await DocHistory.findOneAndUpdate(
      {
        documentId: new ObjectId(req.body.documentId),
        borrower: user._id,
        isReturned: false,
      },
      {
        isReturned: true,
        returnedAt: Date.now(),
      },
      { new: true } // This option returns the updated document
    );

    // Check if the document log was found
    if (!doc_log) {
      return res.status(404).json({
        message: "Document log not found or already returned",
      });
    }

    await Document.findOneAndUpdate(
      { documentId: req.body.documentId },
      {
        physicalKeeper: null,
      }
    );

    return res.status(200).json({
      message: "registered return of document successfully",
    });
  } catch (error) {
    console.log("Error in registring return of document");
    return res.status(500).json({
      message: "Error in registring return of document",
    });
  }
};

export const get_document_history = async (req, res, next) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }

    const history = await DocHistory.find({
      documentId: req.params.documentId,
    });

    let history_details = [];
    for (let h = 0; h < history.length; h++) {
      const log = history[h];
      let borrower = await User.findOne({ _id: log.borrower }).select(
        "username"
      );
      borrower = borrower.username;
      history_details.push({
        borrower: borrower,
        purpose: log.purpose,
        time: log.time,
        isRetirned: log.isReturned,
        reternedAt: log.returnedAt,
      });
    }

    return res.status(200).json({
      docTrackingDetails: history_details,
    });
  } catch (error) {
    console.log("error tracking document details", error);
    return res.status(500).json({
      message: "error tracking document details",
    });
  }
};

export const get_borrowed_document_list = async (req, res, next) => {
  try {
    const docHistories = await DocHistory.find({}).select("documentId").lean();

    // Extract unique documentIds
    const uniqueDocumentIds = [
      ...new Set(docHistories.map((history) => history.documentId.toString())),
    ];

    // Find documents by their documentIds
    const documents = await Document.find({
      _id: { $in: uniqueDocumentIds },
    })
      .select("name path")
      .lean();

    // Return the documents' name and path
    return res.status(200).json({ documents: documents });
  } catch (error) {
    console.log("Error sending borrowed document details", error);
    return res.status(500).json({
      message: "Error sending borrowed document details",
    });
  }
};

export const search_document = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({
        message: "Unauthorized request",
      });
    }
    const {
      name, // partial document name
      departmentName,
      workName,
      year,
      cabinetNumber,
      searchByProcess, // boolean flag to search in Process model
      branchName,
      processName,
    } = req.body;

    let documentsQuery = {};
    let processesQuery = {};
    let documents;

    if (searchByProcess) {
      if (branchName) {
        processesQuery.name = { $regex: `^${branchName}_`, $options: "i" };
      }
      if (departmentName) {
        let finalDepartmentName = departmentName.substring(
          departmentName.indexOf("_") + 1
        );
        processesQuery.name = {
          $regex: `_${finalDepartmentName}_`,
          $options: "i",
        };
      }

      const processes = processName
        ? await Process.findOne({ name: processName })
        : await Process.find(processesQuery)
            .populate({
              path: "documents.documentId",
              select: "name path type _id",
              match: {
                name: { $regex: name ? name : "", $options: "i" },
              },
            })
            .select("documents.documentId");

      documents = processName
        ? processes.documents
        : processes.reduce((acc, process) => {
            const matchedDocs = process.documents
              .map((doc) => doc.documentId)
              .filter((doc) => doc);
            return [...acc, ...matchedDocs];
          }, []);
    } else {
      // Regex pattern for strict order matching
      let regexPattern = "^";

      // Check for departmentName
      if (departmentName) {
        let finalDepartmentName = departmentName.substring(
          departmentName.indexOf("_") + 1
        );
        finalDepartmentName = finalDepartmentName.toLowerCase();
        regexPattern += `${finalDepartmentName}_`;
      } else {
        regexPattern += `[^_]+_`; // If departmentName is absent, match any non-underscore value
      }

      // Check for workName
      if (workName) {
        regexPattern += `${workName}_`;
      } else {
        regexPattern += `[^_]+_`; // If workName is absent, match any non-underscore value
      }

      // Check for year
      if (year) {
        regexPattern += `${year}_`;
      } else {
        regexPattern += `\\d{4}_`; // If year is absent, match any 4-digit year
      }

      // Check for cabinetNumber
      if (cabinetNumber) {
        regexPattern += `cb${cabinetNumber}_`;
      } else {
        regexPattern += `cb\\d+_`; // If cabinetNumber is absent, match any cabinet with 'cb' prefix
      }

      // Match any serial number at the end
      regexPattern += "\\d+\\.pdf$";

      // Apply regex to document query
      documentsQuery.name = { $regex: regexPattern, $options: "i" };

      // Fetch documents matching the criteria
      documents = await Document.find(documentsQuery).select(
        "name path type _id"
      );

      // If 'name' is provided, filter documents further
      if (name) {
        documents = documents.filter((doc) =>
          doc.name.toLowerCase().includes(name.toLowerCase())
        );
      }
    }

    const user = await User.findById(userData._id).select(
      "readable writable uploadable downloadable"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const { readable, writable, uploadable, downloadable } = user;

    // Flatten all permission arrays into one set for easy lookup
    const allowedDocuments = new Set([
      ...readable.map((doc) => doc.toString()),
      ...writable.map((doc) => doc.toString()),
      ...uploadable.map((doc) => doc.toString()),
      ...downloadable.map((doc) => doc.toString()),
    ]);

    // Process the document results
    documents = await Promise.all(
      documents.map(async (item) => {
        let path;
        let docDetail;

        if (processName) {
          docDetail = await Document.findOne({ _id: item.documentId }).select(
            "name path type _id"
          );
        }

        path = processName
          ? `..${docDetail.path.substring(19)}`
          : `..${item.path.substring(19)}`;
        path = path.substring(0, path.lastIndexOf("/"));

        let rejectedBy;
        if (item.rejection) {
          rejectedBy = await User.findOne({
            _id: item.rejection.step.actorUser,
          }).select("username");
          rejectedBy = rejectedBy.username;
        }

        return processName
          ? {
              name: docDetail.name,
              path: path,
              type: docDetail.type,
              documentId: docDetail.documentId,
              signedBy: item.signedBy,
              rejectedBy: rejectedBy,
              documentId: docDetail._id,
            }
          : {
              name: item.name,
              path: path,
              type: item.type,
              documentId: item.documentId,
            };
      })
    );

    documents = documents
      .map((docDetail) => {
        const { documentId } = docDetail; // Extract documentId from document details

        if (allowedDocuments.has(documentId.toString())) {
          // If documentId is found in the user's permissions, include it in the result
          return processName
            ? {
                name: docDetail.name,
                path: docDetail.path,
                documentId: docDetail.documentId,
                type: docDetail.type,
                documentId: documentId,
                signedBy: docDetail.signedBy,
                rejectedBy: docDetail.rejectedBy,
              }
            : {
                name: docDetail.name,
                path: docDetail.path,
                type: docDetail.type,
                documentId: documentId,
              };
        } else {
          // If documentId is not in any permission arrays, exclude it (i.e., return null)
          return null;
        }
      })
      .filter((doc) => doc !== null); // Remove any null values

    let workRemaining = false;

    if (processName) {
      for (let d = 0; d < documents.length; d++) {
        const doc = documents[d];
        if (doc.rejectedBy) {
          continue;
        } else {
          let signedBy = doc.signedBy.map((item) => item._id);

          let signFound = false;
          for (let k = 0; k < signedBy.length; k++) {
            if (signedBy[k].equals(new ObjectId(userData._id))) {
              signFound = true;
              break;
            }
          }
          if (!signFound) {
            workRemaining = true;
            break;
          }
        }
      }
    }
    // Return the matched documents
    res
      .status(200)
      .json({ documents: documents, workRemaining: workRemaining });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
