import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IconEdit,
  IconFile,
  IconTrash,
  IconEye,
  IconPlus,
  IconSearch
} from '@tabler/icons-react';
import { toast } from 'react-toastify';

import { deleteWorkflow, GetWorkflows } from '../../common/Apis';
import WorkflowForm from './WorkflowForm';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomModal from '../../CustomComponents/CustomModal';
import DeleteConfirmationModal from '../../CustomComponents/DeleteConfirmation';
import MigrationModal from './MigrationModal';
import WorkflowDetails from './WorkflowDetails'; 

export default function WorkflowVisualizer() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedVersions, setSelectedVersions] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);

  const [newWorkflowId, setNewWorkflowId] = useState(null);
  const [migrationData, setMigrationData] = useState(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [migrating, setMigrating] = useState(false);

  const [viewWorkflowId, setViewWorkflowId] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const getList = async () => {
    try {
      const res = await GetWorkflows(true);
      setWorkflows(res?.data?.workflows || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Failed to load workflows.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getList();
  }, []);

  const filteredWorkflows = workflows.filter((workflow) =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase())
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
      parentWorkflowId: version.parentWorkflowId || workflow.parentWorkflowId || '',
    };
    setEditData(editObject);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      const response = await deleteWorkflow(id);
      if (response.status === 200) {
        setWorkflows((prev) =>
          prev.map((item) =>
            (item.id || item._id) === id ? { ...item, status: 'Inactive' } : item
          )
        );
        toast.success(response?.data?.message || 'Workflow deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error(error?.response?.data?.error || error?.message);
    } finally {
      setDeleteItemId(null);
      setDeleteLoading(false);
    }
  };

  const handleEditSuccess = (newId) => {
    setNewWorkflowId(newId);
    fetchMigrationPreview(newId);
  };

  const fetchMigrationPreview = async (workflowId) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(
        `${backendUrl}/workflows/${workflowId}/migration-preview`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();

      if (response.ok) {
        if (data && data.oldWorkflow && data.newWorkflow) {
          setMigrationData(data);
          if (data.processes && data.processes.length > 0) {
            setShowMigrationModal(true);
            setSelectedProcesses(data.processes.map((p) => p.processId));
          } else {
            toast.info('No active processes need migration.');
          }
        } else {
          toast.error('Invalid migration preview data received.');
        }
      } else {
        toast.error(data.error || 'Failed to load migration preview');
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to load migration preview');
    }
  };

  const handleMigrate = async () => {
    if (selectedProcesses.length === 0) {
      toast.warning('No processes selected');
      return;
    }
    setMigrating(true);
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(
        `${backendUrl}/workflows/${newWorkflowId}/migrate-processes`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ processIds: selectedProcesses }),
        }
      );
      if (response.ok) {
        toast.success('Migration completed successfully');
        setShowMigrationModal(false);
        getList(); 
      } else {
        const data = await response.json();
        toast.error(data.error || 'Migration failed');
      }
    } catch (error) {
      toast.error('Migration failed: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  if (loading) return <ComponentLoader />;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Search and Add Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full sm:max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          />
        </div>
        <button
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl py-2.5 px-6 transition-colors shadow-sm shadow-blue-200"
          onClick={() => setShowForm(true)}
        >
          <IconPlus size={20} /> Add Workflow
        </button>
      </div>

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.length > 0 ? (
          filteredWorkflows.map((workflow) => {
            const selectedVersion = selectedVersions[workflow.name] || workflow.versions[0];
            const isInactive = selectedVersion?.status === 'Inactive';

            return (
              <motion.div
                key={workflow.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col rounded-2xl border transition-shadow hover:shadow-lg bg-white overflow-hidden ${
                  isInactive ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
                }`}
              >
                <div className="p-5 border-b border-slate-100 flex-grow space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-lg font-bold text-slate-800 line-clamp-2">
                      {workflow.name}
                    </h3>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full shrink-0 ${isInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {isInactive ? 'Inactive' : 'Active'}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                    {selectedVersion?.description || 'No description provided.'}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-2 border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-medium">Created:</span>
                      <span>{new Date(selectedVersion?.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="font-medium">Author:</span>
                      <span className="truncate ml-2" title={selectedVersion?.createdBy?.email}>
                        {selectedVersion?.createdBy?.email || 'Unknown'}
                      </span>
                    </div>
                    
                    {/* ✅ PARENT WORKFLOW DISPLAY */}
                    {(selectedVersion?.parentWorkflowName || selectedVersion?.parentWorkflowId) && (
                      <div className="flex justify-between text-slate-600">
                        <span className="font-medium">Parent:</span>
                        <span className="truncate ml-2 text-right" title={selectedVersion.parentWorkflowName || selectedVersion.parentWorkflowId}>
                          {selectedVersion.parentWorkflowName || `${selectedVersion.parentWorkflowId.split('-')[0]}...`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50 flex flex-col gap-4 border-t border-slate-100">
                  <select
                    value={selectedVersion.version}
                    onChange={(e) => {
                      const selected = workflow.versions.find(
                        (v) => v.version === parseInt(e.target.value, 10)
                      );
                      handleVersionChange(workflow.name, selected);
                    }}
                    className="w-full bg-white px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                  >
                    {workflow.versions.map((version) => (
                      <option key={version.version} value={version.version}>
                        Version {version.version}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <CustomButton
                        click={() => handleEdit(workflow, selectedVersion)}
                        text={<IconEdit size={18} />}
                        title="Edit"
                        className="!p-2"
                      />
                      <CustomButton
                        click={() => setDeleteItemId(selectedVersion?.id)}
                        text={<IconTrash size={18} />}
                        title="Delete"
                        disabled={isInactive}
                        variant="danger"
                        className="!p-2"
                      />
                      <CustomButton
                        click={() => navigate(`/templates/${selectedVersion?.id}`)}
                        text={<IconFile size={18} />}
                        title="Templates"
                        variant="secondary"
                        className="!p-2"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setViewWorkflowId(selectedVersion?.id);
                        setShowViewModal(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <IconEye size={18} /> View
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <IconSearch size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium text-lg">No workflows found.</p>
            <p className="text-slate-400 text-sm">Try adjusting your search criteria.</p>
          </div>
        )}
      </div>

      <CustomModal isOpen={showForm} onClose={() => { setShowForm(false); setEditData(null); }}>
        <WorkflowForm handleCloseForm={() => { setShowForm(false); setEditData(null); }} updateList={getList} editData={editData} setEditData={setEditData} onEditSuccess={handleEditSuccess} />
      </CustomModal>

      <CustomModal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setViewWorkflowId(null); }} size="full" className="!max-w-[95vw]">
        <div className="bg-slate-50 min-h-screen sm:min-h-0">
           <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
              <WorkflowDetails modalId={viewWorkflowId} isModalView={true} closeModal={() => setShowViewModal(false)} />
           </div>
        </div>
      </CustomModal>

      <DeleteConfirmationModal isOpen={deleteItemId !== null} onClose={() => setDeleteItemId(null)} onConfirm={() => handleDelete(deleteItemId)} isLoading={deleteLoading} deactive={true} />

      {showMigrationModal && migrationData && (
        <CustomModal isOpen={showMigrationModal} onClose={() => setShowMigrationModal(false)} size="lg">
          <MigrationModal migrationData={migrationData} selectedProcesses={selectedProcesses} setSelectedProcesses={setSelectedProcesses} onMigrate={handleMigrate} migrating={migrating} onClose={() => setShowMigrationModal(false)} />
        </CustomModal>
      )}
    </div>
  );
}