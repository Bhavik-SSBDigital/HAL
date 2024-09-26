import { get } from "mongoose";
import Document from "../models/document.js";
import mongoose from "mongoose";
export const returnParentsForUpload = async (upload) => {
  try {
    const uploadArrayToBeStoredInUser = [];
    const visitedParentIds = new Set(); // Keep track of visited parent IDs

    // Define a base case to stop the recursion
    if (upload.length === 0) {
      return uploadArrayToBeStoredInUser;
    }

    for (let i = 0; i < upload.length; i++) {
      const childDocument = await Document.findById(upload[i]);

      if (!childDocument) {
        continue; // Skip this document and continue with the next one
      }

      // Check if it's not a project to continue the recursion
      if (childDocument.isProject !== true) {
        const parentId = childDocument.parent;

        // Only push unique parent IDs into the array
        if (!visitedParentIds.has(parentId)) {
          uploadArrayToBeStoredInUser.push(parentId);
          visitedParentIds.add(parentId); // Add the parent ID to the Set
        }

        const childUpload = [parentId]; // Create an array for the parent ID
        const childResults = await returnParentsForUpload(childUpload); // Recurse with the parent ID

        // Append the results of the recursive call to the main array
        uploadArrayToBeStoredInUser.push(...childResults);
      }
    }

    return uploadArrayToBeStoredInUser;
  } catch (error) {
    console.error("Error in uploadAccess:", error);
    return null;
  }
};

export const returnParentsForDownload = async (download) => {
  try {
    const downloadArrayToBeStoredInUser = [];
    const visitedParentIds = new Set(); // Keep track of visited parent IDs

    // Define a base case to stop the recursion
    if (download.length === 0) {
      return downloadArrayToBeStoredInUser;
    }

    for (let i = 0; i < download.length; i++) {
      const childDocument = await Document.findById(download[i]);

      if (!childDocument) {
        continue; // Skip this document and continue with the next one
      }

      // Check if it's not a project to continue the recursion
      if (childDocument.isProject !== true) {
        const parentId = childDocument.parent;

        // Only push unique parent IDs into the array
        if (!visitedParentIds.has(parentId)) {
          downloadArrayToBeStoredInUser.push(parentId);
          visitedParentIds.add(parentId); // Add the parent ID to the Set
        }

        const childDownload = [parentId]; // Create an array for the parent ID
        const childResults = await returnParentsForDownload(childDownload); // Recurse with the parent ID

        // Append the results of the recursive call to the main array
        downloadArrayToBeStoredInUser.push(...childResults);
      }
    }

    return downloadArrayToBeStoredInUser;
  } catch (error) {
    console.error("Error in downloadAccess:", error);
    return null;
  }
};

export const returnParentsForView = async (view) => {
  try {
    const viewArrayToBeStoredInUser = [];
    const visitedParentIds = new Set(); // Keep track of visited parent IDs

    // Define a base case to stop the recursion
    if (view.length === 0) {
      return viewArrayToBeStoredInUser;
    }

    for (let i = 0; i < view.length; i++) {
      const childDocument = await Document.findById(view[i]);

      if (!childDocument) {
        continue; // Skip this document and continue with the next one
      }

      // Check if it's not a project to continue the recursion
      if (childDocument.isProject !== true) {
        const parentId = childDocument.parent;

        // Only push unique parent IDs into the array
        if (!visitedParentIds.has(parentId)) {
          viewArrayToBeStoredInUser.push(parentId);
          visitedParentIds.add(parentId); // Add the parent ID to the Set
        }

        const childView = [parentId]; // Create an array for the parent ID
        const childResults = await returnParentsForView(childView); // Recurse with the parent ID

        // Append the results of the recursive call to the main array
        viewArrayToBeStoredInUser.push(...childResults);
      }
    }

    return viewArrayToBeStoredInUser;
  } catch (error) {
    console.error("Error in viewAccess:", error);
    return null;
  }
};

export const getParents = async (view) => {
  try {
    const viewArrayToBeStoredInUser = [];
    const visitedParentIds = new Set(); // Keep track of visited parent IDs

    // Define a base case to stop the recursion
    if (view.length === 0) {
      return viewArrayToBeStoredInUser;
    }

    for (let i = 0; i < view.length; i++) {
      const childDocument = await Document.findOne({
        _id: new mongoose.Types.ObjectId(view[i]),
      });

      if (childDocument === null || childDocument === undefined) {
        continue; // Skip this document and continue with the next one
      }

      // Check if it's not a project to continue the recursion
      if (childDocument.isProject !== true) {
        const parentId = childDocument.parent;

        // Only push unique parent IDs into the array
        if (!visitedParentIds.has(parentId)) {
          viewArrayToBeStoredInUser.push(parentId);
          visitedParentIds.add(parentId); // Add the parent ID to the Set
        }

        const childView = [parentId]; // Create an array for the parent ID
        const childResults = await returnParentsForView(childView); // Recurse with the parent ID

        // Append the results of the recursive call to the main array
        viewArrayToBeStoredInUser.push(...childResults);
      }
    }

    return viewArrayToBeStoredInUser;
  } catch (error) {
    console.error("Error in viewAccess:", error);
    return null;
  }
};

export const uploadAccess = async (upload, create) => {
  let uploadArrayToBeStored = await returnParentsForUpload(upload);

  uploadArrayToBeStored = [...uploadArrayToBeStored, ...upload];
  uploadArrayToBeStored = [...new Set(uploadArrayToBeStored)];

  if (create) {
    return uploadArrayToBeStored;
  }
};

export const downloadAccess = async (download, create) => {
  let downloadArrayToBeStored = await returnParentsForDownload(download);
  downloadArrayToBeStored = [...downloadArrayToBeStored, ...download];
  downloadArrayToBeStored = [...new Set(downloadArrayToBeStored)];

  if (create) {
    return downloadArrayToBeStored;
  }
};

export const viewAccess = async (view, create) => {
  let viewArrayToBeStored = await returnParentsForView(view);
  viewArrayToBeStored = [...viewArrayToBeStored, ...view];
  viewArrayToBeStored = [...new Set(viewArrayToBeStored)];

  if (create) {
    return viewArrayToBeStored;
  }
};

export const getChildrenForFullAccess = async (id) => {
  let children = [];
  const document = await Document.findById(id);

  if (document === null) {
    return [];
  }

  if (document.children && document.children.length > 0) {
    for (let i = 0; i < document.children.length; i++) {
      children.push(document.children[i]);
      const nested = await getChildrenForFullAccess(document.children[i]);
      children = [...children, ...nested];
    }
  }

  return children;
};

export const fullAccess = async (fullAccess) => {
  let uploads = [];
  let downloads = [];
  let views = [];
  for (let i = 0; i < fullAccess.length; i++) {
    const doc = fullAccess[i];
    const children = await getChildrenForFullAccess(doc.id);
    let array = [...children, doc.id];

    if (doc.upload) {
      let upload = [...new Set(array)];
      const parents = await returnParentsForUpload([doc.id]);
      uploads = [...uploads, ...upload, ...parents];
    }

    if (doc.download) {
      let download = [...new Set(array)];
      const parents = await returnParentsForDownload([doc.id]);
      downloads = [...downloads, ...download, ...parents];
    }

    if (doc.view) {
      let view = [...new Set(array)];
      const parents = await returnParentsForView([doc.id]);
      views = [...views, ...view, ...parents];
    }
  }
  return {
    upload: uploads,
    download: downloads,
    view: views,
  };
};

export const test = async (req, res) => {
  return res.status(200).json({
    // data: await fullAccess(req.body.fullAccess)
    data: await uploadAccess(req.body.view, true),
  });
};
