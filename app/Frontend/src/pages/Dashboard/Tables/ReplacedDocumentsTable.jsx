import React from 'react';

const ReplacedDocumentsTable = ({ data }) => {
  if (!data || data?.length === 0) {
    return <p className="text-gray-500">No replaced documents available.</p>;
  }

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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReplacedDocumentsTable;
