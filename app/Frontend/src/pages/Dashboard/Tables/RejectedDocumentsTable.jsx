import React from 'react';

const RejectedDocumentsTable = ({ data }) => {
  if (!data || data?.length === 0) {
    return <p className="text-gray-500">No rejected documents available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded shadow border border-gray-200">
      <table className="min-w-full text-sm text-left bg-white">
        <thead className="bg-gray-100 border-b text-gray-600 font-medium">
          <tr>
            <th className="px-4 py-2">Document Name</th>
            <th className="px-4 py-2">Process Name</th>
            <th className="px-4 py-2">Path</th>
            <th className="px-4 py-2">Rejected At</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((doc) => (
            <tr key={doc.documentId} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{doc.documentName}</td>
              <td className="px-4 py-2">{doc.processName}</td>
              <td className="px-4 py-2">{doc.documentPath}</td>
              <td className="px-4 py-2">
                {new Date(doc.rejectedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RejectedDocumentsTable;
