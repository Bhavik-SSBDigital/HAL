import React, { useEffect, useState } from 'react';
import { deleteWorkflow, GetWorkflows } from '../../common/Apis';
import WorkflowForm from './WorkflowForm';
import Show from './Show';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconArrowBadgeDown,
  IconEdit,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomCard from '../../CustomComponents/CustomCard';
import DeleteConfirmationModal from '../../CustomComponents/DeleteConfirmation';
import { toast } from 'react-toastify';

export default function WorkflowVisualizer() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [workflows, setWorkflows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedVersions, setSelectedVersions] = useState({});
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  useEffect(() => {
    const getList = async () => {
      try {
        const res = await GetWorkflows();
        setWorkflows(res?.data?.workflows || []);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      } finally {
        setLoading(false);
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
  const handleEdit = (workflow, version) => {
    const editObject = {
      name: workflow.name,
      description: version.description,
      steps: version.steps,
      id: version.id,
    };
    setEditData(editObject);
    setShowForm(true);
  };
  const handleDelete = async (id) => {
    setDeleteLoading(true);
    const url = `${backendUrl}/deleteBranch/${id}`;
    const accessToken = sessionStorage.getItem('accessToken');

    try {
      const response = await deleteWorkflow(id);

      if (response.status === 200) {
        setWorkflows((prev) => prev.filter((item) => item._id !== id));
        toast.success(response?.data?.message);
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error(error?.response?.data?.message || error?.message);
    }
    setDeleteItemId(null);
    setDeleteLoading(false);
  };

  if (loading) {
    return <ComponentLoader />;
  }
  return (
    <div className="p-2 mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-3">
        <input
          type="text"
          placeholder="Search workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md p-3 border border-slate-400 rounded-lg transition"
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-6 transition"
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
                onClick={() => {
                  setShowForm(false);
                  setEditData(null);
                }}
              >
                <IconX size={24} />
              </button>
              <WorkflowForm
                handleCloseForm={() => {
                  setShowForm(false);
                  setEditData(null);
                }}
                editData={editData}
                setEditData={setEditData}
              />
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
              className="bg-white rounded-xl shadow-lg p-6 mb-3 border border-slate-400 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-full mb-2 flex flex-col ml-auto items-end">
                <div className="flex absolute top-3 left-3 gap-2">
                  <CustomButton
                    click={() => handleEdit(workflow, selectedVersion)}
                    text={<IconEdit size={20} />}
                    title={'Edit'}
                  />
                  <CustomButton
                    click={() => setDeleteItemId(selectedVersion?.id)}
                    text={<IconTrash size={20} />}
                    title={'Delete'}
                    variant={'danger'}
                  />
                </div>

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
                  className="mt-1 bg-gray-100 px-4 py-2 rounded-md border border-slate-300 focus:ring-blue-500 w-[200px]"
                >
                  {workflow.versions.map((version) => (
                    <option key={version.version} value={version.version}>
                      Version {version.version}
                    </option>
                  ))}
                </select>
              </div>
              <CustomCard
                className="flex border justify-between items-center cursor-pointer transition"
                click={() =>
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
              </CustomCard>

              <div className="mt-2 space-y-4">
                <CustomCard>
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
                </CustomCard>
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

      <DeleteConfirmationModal
        isOpen={deleteItemId !== null}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => handleDelete(deleteItemId)}
        isLoading={deleteLoading}
      />
    </div>
  );
}
