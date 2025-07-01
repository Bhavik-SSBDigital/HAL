import React, { useEffect, useState } from 'react';
import { ViewDocument, GetDocumentsVersionWise } from '../../common/Apis';
import { IconEye, IconX } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import CustomButton from '../../CustomComponents/CustomButton';
import { ImageConfig } from '../../config/ImageConfig';
import ViewFile from '../view/View';

export default function DocumentsVersionWise({ processId, close }) {
  const [documents, setDocuments] = useState([]);
  const [fileView, setFileView] = useState(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState(1);

  const fetchDocuments = async (version = 1) => {
    try {
      const res = await GetDocumentsVersionWise(version, processId);
      setDocuments(res.data || []);
      setActiveVersionId(version);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  const handleViewFile = async (name, path, fileId, type) => {
    setActionsLoading(true);
    try {
      const res = await ViewDocument(name, path, type, fileId);
      setFileView(res);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleVersionChange = async (e) => {
    const versionId = e.target.value;
    await fetchDocuments(versionId);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <>
      <div className="w-full">
        {/* Close Button */}
        <button
          onClick={close}
          className="absolute top-2 right-2 z-10 bg-gray-100 hover:bg-gray-200 p-1 rounded-full"
          title="Close"
        >
          <IconX size={20} className="text-gray-700" />
        </button>

        {/* Version Dropdown */}
        <div className="flex justify-end mb-4 mt-2">
          <select
            className="text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-1"
            onChange={handleVersionChange}
            value={activeVersionId}
          >
            {[1, 2].map((ver) => (
              <option key={ver} value={ver}>
                {`Version ${ver}`}
              </option>
            ))}
          </select>
        </div>

        {/* Documents Table */}
        <div className="overflow-auto">
          <table className="min-w-full table-auto border border-gray-200">
            <thead className="bg-gray-100">
              <tr className="text-left text-sm font-semibold text-gray-700">
                <th className="px-4 py-2 border-b">#</th>
                <th className="px-4 py-2 border-b">File</th>
                <th className="px-4 py-2 border-b">Type</th>
                <th className="px-4 py-2 border-b">Label</th>
                <th className="px-4 py-2 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => {
                const extension = doc.name?.split('.').pop()?.toLowerCase();
                return (
                  <tr
                    key={doc.id}
                    className="text-sm text-gray-800 border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <img
                        width={24}
                        height={24}
                        src={ImageConfig[extension] || ImageConfig['default']}
                        alt="icon"
                        className="shrink-0"
                      />
                      <span className="truncate max-w-[200px]">{doc.name}</span>
                    </td>
                    <td className="px-4 py-3 capitalize">{extension}</td>
                    <td className="px-4 py-3">
                      {doc.isNew ? (
                        <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          New
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          Old
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <CustomButton
                          className="px-2"
                          click={() =>
                            handleViewFile(
                              doc.name,
                              doc.path,
                              doc.id,
                              extension,
                            )
                          }
                          disabled={actionsLoading}
                          title="View Document"
                          text={<IconEye size={18} className="text-white" />}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}
    </>
  );
}
