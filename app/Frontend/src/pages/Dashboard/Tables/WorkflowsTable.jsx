import React from 'react';

const WorkflowsTable = ({ data }) => {
  if (!data || data?.length === 0) {
    return <p className="text-gray-500">No workflows available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded shadow border border-gray-200">
      <table className="min-w-full text-sm text-left bg-white">
        <thead className="bg-gray-100 border-b text-gray-600 font-medium">
          <tr>
            <th className="px-4 py-2">Workflow ID</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Version</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2">Created At</th>
            <th className="px-4 py-2">Updated At</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((wf) => (
            <tr key={wf.workflowId} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{wf.workflowId}</td>
              <td className="px-4 py-2">{wf.name}</td>
              <td className="px-4 py-2">{wf.version}</td>
              <td className="px-4 py-2">{wf.description}</td>
              <td className="px-4 py-2">
                {new Date(wf.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2">
                {new Date(wf.updatedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WorkflowsTable;
