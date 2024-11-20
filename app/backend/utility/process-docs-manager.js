export const get_documents_with_replacements = async (documents) => {
  // Map for quick lookup of documents by _id

  let related_docs = [];
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    const docDetails = doc.details;

    let doc_group = [doc];

    if (doc.ref) {
      let ref_doc = documents.find((item) => item.details._id.equals(doc.ref));

      if (ref_doc) {
        doc_group.push(ref_doc);
      }
    }

    let group_found = false;
    for (let k = 0; k < related_docs.length; k++) {
      const group = related_docs[k].map((item) => String(item.details._id));

      const current_docs_group_already_exists = group.some((ele) =>
        doc_group.some((doc) => ele === String(doc.details._id))
      );

      if (current_docs_group_already_exists) {
        related_docs[k] = [...new Set([...related_docs[k], ...doc_group])];
        group_found = true;
        break;
      }
    }

    if (!group_found) {
      related_docs.push(doc_group);
    }
  }

  const latestDocs = related_docs.map((subArray) => {
    // Find the latest document in the current sub-array by comparing `createdOn`
    return subArray.reduce((latest, current) => {
      if (
        !latest ||
        new Date(current.details.createdOn) > new Date(latest.details.createdOn)
      ) {
        return current;
      }
      return latest;
    }, null);
  });

  const transformReplacements = transform_replacements(related_docs);

  const transformedActiveDocs = latestDocs.map((doc) => ({
    workName: doc.workName,
    cabinetNo: doc.cabinetNo,
    rejection: doc.rejection || null, // Assuming rejection might not always exist
    signedBy: doc.signedBy,
    details: {
      name: doc.details.name,
      _id: doc.details._id,
      file_name: doc.details.name, // Mapping "file_name" to the same "name" field in details
    },
  }));

  return {
    replacementsWithRef: transformReplacements,
    activeDocs: transformedActiveDocs,
  };
};

const transform_replacements = (replacements) => {
  return replacements.map((array) => {
    // Find the latest document
    const latestDoc = array.reduce((latest, doc) =>
      new Date(doc.details.createdOn) > new Date(latest.details.createdOn)
        ? doc
        : latest
    );

    // Filter out the latest document from the array
    const remainingDocs = array.filter((doc) => doc !== latestDoc);

    // Format the latest document (ref) and remaining documents (replacements)
    return {
      ref: {
        workName: latestDoc.workName,
        cabinetNo: latestDoc.cabinetNo,
        rejection: latestDoc.rejection || null,
        signedBy: latestDoc.signedBy || [],
        details: {
          name: latestDoc.details.name,
          _id: latestDoc.details._id,
          file_name: latestDoc.details.name,
        },
      },
      replacements: remainingDocs.map((doc) => ({
        workName: doc.workName,
        cabinetNo: doc.cabinetNo,
        rejection: doc.rejection || null,
        signedBy: doc.signedBy || [],
        details: {
          name: doc.details.name,
          _id: doc.details._id,
          file_name: doc.details.name,
        },
      })),
    };
  });
};
