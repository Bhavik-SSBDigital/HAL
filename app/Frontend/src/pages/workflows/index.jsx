import React, { useEffect, useState } from 'react';
import { GetWorkflows } from '../../common/Apis';
import WorkflowForm from './WorkflowForm';
import Show from './Show';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkflowVisualizer() {
  const [workflows, setWorkflows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState({});
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);

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

  const handleVersionChange = (workflowName, version) => {
    setSelectedVersions((prev) => ({
      ...prev,
      [workflowName]: version,
    }));
  };

  return (
    <div className="p-8 mx-auto rounded-xl w-full">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
        Workflow Management
      </h2>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6">
        <input
          type="text"
          placeholder="Search workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
        />
        <button
          className="bg-blue-600 text-white rounded-lg py-3 w-[200px] shadow-md hover:bg-blue-700 transition"
          onClick={() => setShowForm(true)}
        >
          + Add Workflow
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm px-4">
          <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-3xl relative overflow-y-auto max-h-[90vh]">
            <WorkflowForm handleCloseForm={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {filteredWorkflows.length > 0 ? (
        filteredWorkflows.map((workflow, wIndex) => {
          const selectedVersion =
            selectedVersions[workflow.name] || workflow.versions[0];
          const isExpanded = expandedWorkflow === workflow.name;

          return (
            <motion.div
              key={wIndex}
              className="bg-white rounded-xl shadow-lg p-6 mb-8 border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="flex justify-between items-center cursor-pointer hover:bg-gray-100 p-4 rounded-lg transition"
                onClick={() =>
                  setExpandedWorkflow(isExpanded ? null : workflow.name)
                }
              >
                <h3 className="text-2xl font-semibold text-gray-800">
                  {workflow.name}
                </h3>
                <motion.span
                  className="text-blue-600 text-lg font-semibold"
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  ▼
                </motion.span>
              </div>

              <div className="mt-4">
                <label className="text-gray-700 font-medium text-sm ml-0.5">
                  Select Version :
                </label>
                <select
                  value={selectedVersion.version}
                  onChange={(e) => {
                    const selected = workflow.versions.find(
                      (v) => v.version === parseInt(e.target.value, 10),
                    );
                    handleVersionChange(workflow.name, selected);
                  }}
                  className="text-sm bg-gray-100 px-4 py-2 rounded-lg border focus:outline-none shadow-sm cursor-pointer w-full"
                >
                  {workflow.versions.map((version, index) => (
                    <option key={index} value={version.version}>
                      Version {version.version}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 bg-gray-50 p-6 rounded-lg border">
                <p className="text-sm text-gray-500">
                  <b className="text-gray-700">Created on :</b>
                  {new Date(selectedVersion?.createdAt).toLocaleString()}
                </p>
                {selectedVersion?.description && (
                  <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                    <b className="text-gray-700">Description :</b>{' '}
                    {selectedVersion?.description}
                  </p>
                )}
                <p className="text-gray-500 text-sm mt-2">
                  <b className="text-gray-700">Author :</b>
                  <span className="font-medium text-gray-800">
                    {selectedVersion?.createdBy?.email}
                  </span>
                </p>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-gray-200 pt-5 mt-4"
                  >
                    <Show steps={selectedVersion.steps} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })
      ) : (
        <p className="text-center bg-white p-20 border rounded-lg text-gray-500 text-lg">
          No workflows found.
        </p>
      )}
    </div>
  );
}
