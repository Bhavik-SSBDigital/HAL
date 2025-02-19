import React, { useEffect, useState } from 'react';
import { GetWorkflows } from '../../common/Apis';
import WorkflowForm from './WorkflowForm';
import Show from './Show';

export default function WorkflowVisualizer() {
  const [workflows, setWorkflows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const getList = async () => {
      try {
        const res = await GetWorkflows();
        setWorkflows(res?.data?.workflows || []);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      }
    };
    getList();
  }, []);

  const filteredWorkflows = workflows.filter((workflow) =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 mx-auto bg-white rounded-xl shadow-md w-full">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Workflow Management
      </h2>

      {/* Search & Button Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <input
          type="text"
          placeholder="Search workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-2/3 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <button
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition"
          onClick={() => setShowForm(true)}
        >
          + Add Workflow
        </button>
      </div>

      {/* Workflow Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl relative overflow-y-auto max-h-[90vh]">
            <WorkflowForm handleCloseForm={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* Workflows List */}
      {filteredWorkflows.length > 0 ? (
        filteredWorkflows.map((workflow, wIndex) => (
          <div
            key={wIndex}
            className="bg-gray-50 rounded-xl shadow-md p-6 mb-6 border"
          >
            <h3 className="text-xl font-semibold text-gray-800">
              Name : {workflow.name}
            </h3>

            {workflow.versions.map((version, wfIndex) => (
              <div
                key={wfIndex}
                className="mt-4 p-5 rounded-xl bg-white shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold text-gray-700">
                    Version {version.version}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {new Date(version.createdAt).toLocaleString()}
                  </p>
                </div>

                <p className="text-sm text-gray-600 mt-2">
                  <b> Description :</b> {version.description}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  <b>Created By:</b>
                  <span className="font-medium">
                    {' '}
                    {version.createdBy.email}
                  </span>
                </p>

                {/* Workflow Visualizer */}
                <div className="mt-5 border-t border-gray-200 pt-5">
                  <Show steps={version.steps} />
                </div>
              </div>
            ))}
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500 text-lg">No workflows found.</p>
      )}
    </div>
  );
}
