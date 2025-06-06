import React, { useState } from 'react';
import ViewFile from '../../view/View';
import CustomButton from '../../../CustomComponents/CustomButton';
import { toast } from 'react-toastify';
import { ViewDocument } from '../../../common/Apis';

const ReplacedDocumentsTable = ({
  data,
  actionsLoading,
  setActionsLoading,
}) => {
  if (!data || data?.length === 0) {
    return <p className="text-gray-500">No replaced documents available.</p>;
  }

  // states
  const [fileView, setFileView] = useState(null);

  // handlers
  const handleViewFile = async (name, path) => {
    setActionsLoading(true);
    try {
      const fileData = await ViewDocument(name, path);
      if (fileData) {
        setFileView({ url: fileData.data, type: fileData.fileType });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  return (
    <div className="overflow-x-auto rounded shadow border border-gray-200">
      <table className="min-w-full text-sm text-left bg-white">
        <thead className="bg-gray-100 border-b text-gray-600 font-medium">
          <tr>
            <th className="px-4 py-2">New Document Name</th>
            <th className="px-4 py-2">New Path</th>
            <th className="px-4 py-2">Old Document Name</th>
            <th className="px-4 py-2">Old Path</th>
            <th className="px-4 py-2">Replaced By</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((doc) => (
            <tr
              key={doc.replacedDocumentId}
              className="border-b hover:bg-gray-50"
            >
              <td className="px-4 py-2">{doc.replacedDocName}</td>
              <td className="px-4 py-2">{doc.replacedDocumentPath}</td>
              <td className="px-4 py-2">{doc.replacesDocumentName}</td>
              <td className="px-4 py-2">{doc.replacesDocumentPath}</td>
              <td className="px-4 py-2">{doc.replacedBy}</td>
              <td className="px-4 py-2 flex gap-1 flex-wrap">
                <CustomButton
                  disabled={actionsLoading}
                  text={'Old'}
                  click={() =>
                    handleViewFile(
                      doc.replacedDocName,
                      doc.replacedDocumentPath,
                    )
                  }
                />
                <CustomButton
                  disabled={actionsLoading}
                  text={'New'}
                  click={() =>
                    handleViewFile(
                      doc.replacesDocumentName,
                      doc.replacesDocumentPath,
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* View File Modal */}
      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}
    </div>
  );
};

export default ReplacedDocumentsTable;
