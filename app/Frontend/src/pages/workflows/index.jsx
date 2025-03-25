import React, { useEffect, useState } from 'react';
import { GetWorkflows } from '../../common/Apis';
import WorkflowForm from './WorkflowForm';
import Show from './Show';
import { motion, AnimatePresence } from 'framer-motion';
import { IconArrowBadgeDown, IconX } from '@tabler/icons-react';

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
    <div className="p-3 max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
        Workflow Management
      </h2>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-6 shadow-md transition"
          onClick={() => setShowForm(true)}
        >
          + Add Workflow
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white p-6 rounded-xl shadow-xl w-full max-w-2xl relative"
            >
              <button
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-800"
                onClick={() => setShowForm(false)}
              >
                <IconX size={24} />
              </button>
              <WorkflowForm handleCloseForm={() => setShowForm(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {filteredWorkflows.length > 0 ? (
        filteredWorkflows.map((workflow) => {
          const selectedVersion =
            selectedVersions[workflow.name] || workflow.versions[0];
          const isExpanded = expandedWorkflow === workflow.name;

          return (
            <motion.div
              key={workflow.name}
              className="bg-white rounded-xl shadow-lg p-6 mb-6 border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-full mb-4 flex flex-col ml-auto items-end">
                <label className="text-sm w-fit font-medium text-gray-700">
                  Select Version
                </label>
                <select
                  value={selectedVersion.version}
                  onChange={(e) => {
                    const selected = workflow.versions.find(
                      (v) => v.version === parseInt(e.target.value, 10),
                    );
                    handleVersionChange(workflow.name, selected);
                  }}
                  className="mt-1 bg-gray-100 px-4 py-2 rounded-lg border focus:ring-blue-500 w-[200px]"
                >
                  {workflow.versions.map((version) => (
                    <option key={version.version} value={version.version}>
                      Version {version.version}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="flex border justify-between items-center cursor-pointer hover:bg-gray-100 p-4 rounded-lg transition"
                onClick={() =>
                  setExpandedWorkflow(isExpanded ? null : workflow.name)
                }
              >
                <h3 className="text-lg font-medium text-gray-800">
                  {workflow.name}
                </h3>
                <motion.span
                  className="text-gray-600"
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <IconArrowBadgeDown />
                </motion.span>
              </div>

              <div className="mt-4 space-y-4">
                <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
                  <div className="flex justify-between items-center space-x-2 text-md text-gray-700">
                    <span className="font-bold">Created on:</span>
                    <span>
                      {new Date(selectedVersion?.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {selectedVersion?.description && (
                    <div className="flex justify-between items-center space-x-2 text-md text-gray-700">
                      <span className="font-bold">Description:</span>
                      <span>{selectedVersion?.description}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center space-x-2 text-md text-gray-700">
                    <span className="font-bold">Author:</span>
                    <span>{selectedVersion?.createdBy?.email}</span>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    key={workflow.name} // Ensure uniqueness for AnimatePresence
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    exit={{ scaleY: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="origin-top overflow-hidden border-t border-gray-200 pt-5 mt-4"
                  >
                    <Show steps={selectedVersion.steps} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })
      ) : (
        <p className="text-center bg-white p-10 border rounded-lg text-gray-500 text-lg">
          No workflows found.
        </p>
      )}
    </div>
  );
}
