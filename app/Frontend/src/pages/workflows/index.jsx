import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IconEdit,
  IconFile,
  IconEye,
  IconPlus,
  IconSearch,
  IconArchiveOff,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { toast } from 'react-toastify';

import {
  deleteWorkflow,
  GetWorkflowsByAccess,
} from '../../common/Apis';

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
  const [permanentDeleteId, setPermanentDeleteId] = useState(null);

  const [newWorkflowId, setNewWorkflowId] = useState(null);

  const [migrationData, setMigrationData] = useState(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [migrating, setMigrating] = useState(false);

  const [viewWorkflowId, setViewWorkflowId] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  const getList = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');

      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload?.isAdmin || false);
      }

      const res = await GetWorkflowsByAccess();

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
      parentWorkflowId:
        version.parentWorkflowId ||
        workflow.parentWorkflowId ||
        '',
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
          prev.map((workflowGroup) => {
            const hasTargetVersion =
              workflowGroup.versions.some((v) => v.id === id);

            if (hasTargetVersion) {
              return {
                ...workflowGroup,
                versions: workflowGroup.versions.map((v) => ({
                  ...v,
                  isActive: false,
                  status: 'Inactive',
                })),
              };
            }

            return workflowGroup;
          })
        );

        toast.success(
          response?.data?.message ||
            'Workflow deactivated successfully'
        );
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.error || error?.message
      );
    } finally {
      setDeleteItemId(null);
      setDeleteLoading(false);
    }
  };

  const handlePermanentDelete = async (id) => {
    setDeleteLoading(true);

    try {
      const token = sessionStorage.getItem('accessToken');

      const response = await fetch(
        `${backendUrl}/workflows/${id}/permanent`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setWorkflows((prev) =>
          prev.filter((workflow) => {
            return !workflow.versions.some(
              (version) => version.id === id
            );
          })
        );

        toast.success(
          data.message || 'Workflow permanently deleted.'
        );

        setTimeout(() => {
          getList();
        }, 1000);
      } else {
        toast.error(
          data.message || 'Permanent deletion failed.'
        );
      }
    } catch (error) {
      console.error(error);
      toast.error('Deletion request failed.');
    } finally {
      setPermanentDeleteId(null);
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

          if (
            data.processes &&
            data.processes.length > 0
          ) {
            setShowMigrationModal(true);

            setSelectedProcesses(
              data.processes.map((p) => p.processId)
            );
          } else {
            toast.info(
              'No active processes need migration.'
            );
          }
        } else {
          toast.error(
            'Invalid migration preview data received.'
          );
        }
      } else {
        toast.error(
          data.error || 'Failed to load migration preview'
        );
      }
    } catch (error) {
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
          body: JSON.stringify({
            processIds: selectedProcesses,
          }),
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
      toast.error(
        'Migration failed: ' + error.message
      );
    } finally {
      setMigrating(false);
    }
  };

  if (loading) return <ComponentLoader />;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full sm:max-w-md">
          <IconSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />

          <input
            type="text"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          />
        </div>

        <button
          className={`w-full sm:w-auto flex items-center justify-center gap-2 text-white font-medium rounded-xl py-2.5 px-6 transition-colors shadow-sm ${
            isAdmin
              ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
              : 'bg-slate-400 cursor-not-allowed'
          }`}
          onClick={() => {
            if (!isAdmin) return;
            setShowForm(true);
          }}
          disabled={!isAdmin}
          title={
            !isAdmin
              ? 'Only admins can create workflows'
              : ''
          }
        >
          <IconPlus size={20} />
          Add Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.length > 0 ? (
          filteredWorkflows.map((workflow) => {
            const selectedVersion =
              selectedVersions[workflow.name] ||
              workflow.versions[0];

            const isInactive =
              selectedVersion?.isActive === false ||
              selectedVersion?.status === 'Inactive';

            return (
              <motion.div
                key={workflow.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col rounded-2xl border transition-shadow hover:shadow-lg bg-white overflow-hidden ${
                  isInactive
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-slate-200'
                }`}
              >
                <div className="p-5 border-b border-slate-100 flex-grow space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-lg font-bold text-slate-800 line-clamp-2">
                      {workflow.name}
                    </h3>

                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full shrink-0 ${
                        isInactive
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {isInactive
                        ? 'Inactive'
                        : 'Active'}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                    {selectedVersion?.description ||
                      'No description provided.'}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-2 border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-medium">
                        Created:
                      </span>

                      <span>
                        {new Date(
                          selectedVersion?.createdAt
                        ).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span className="font-medium">
                        Author:
                      </span>

                      <span
                        className="truncate ml-2"
                        title={
                          selectedVersion?.createdBy?.email
                        }
                      >
                        {selectedVersion?.createdBy
                          ?.email || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50 flex flex-col gap-4 border-t border-slate-100">
                  <select
                    value={selectedVersion.version}
                    onChange={(e) => {
                      const selected =
                        workflow.versions.find(
                          (v) =>
                            v.version ===
                            parseInt(
                              e.target.value,
                              10
                            )
                        );

                      handleVersionChange(
                        workflow.name,
                        selected
                      );
                    }}
                    className="w-full bg-white px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                  >
                    {workflow.versions.map((version) => (
                      <option
                        key={version.version}
                        value={version.version}
                      >
                        Version {version.version}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <CustomButton
                        click={() => {
                          if (!isAdmin) return;

                          handleEdit(
                            workflow,
                            selectedVersion
                          );
                        }}
                        text={<IconEdit size={18} />}
                        title={
                          !isAdmin
                            ? 'Only admins can edit workflows'
                            : 'Edit'
                        }
                        className="!p-2"
                        disabled={!isAdmin}
                      />

                      <CustomButton
                        click={() => {
                          if (!isAdmin) return;

                          setDeleteItemId(
                            selectedVersion?.id
                          );
                        }}
                        text={
                          <IconArchiveOff size={18} />
                        }
                        title={
                          !isAdmin
                            ? 'Only admins can deactivate workflows'
                            : 'Deactivate Workflow'
                        }
                        disabled={
                          isInactive || !isAdmin
                        }
                        variant="warning"
                        className="!p-2"
                      />

                      <CustomButton
                        click={() => {
                          if (!isAdmin) return;

                          setPermanentDeleteId(
                            selectedVersion?.id
                          );
                        }}
                        text={
                          <IconAlertTriangle
                            size={18}
                          />
                        }
                        title={
                          !isAdmin
                            ? 'Only admins can permanently delete workflows'
                            : 'Permanent Delete'
                        }
                        variant="danger"
                        className="!p-2 !bg-red-700 hover:!bg-red-800"
                        disabled={!isAdmin}
                      />

                      <CustomButton
                        click={() => {
                          if (!isAdmin) return;

                          navigate(
                            `/templates/${selectedVersion?.id}`
                          );
                        }}
                        text={<IconFile size={18} />}
                        title={
                          !isAdmin
                            ? 'Only admins can manage templates'
                            : 'Templates'
                        }
                        variant="secondary"
                        className="!p-2"
                        disabled={!isAdmin}
                      />
                    </div>

                    <button
                      onClick={() => {
                        setViewWorkflowId(
                          selectedVersion?.id
                        );

                        setShowViewModal(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <IconEye size={18} />
                      View
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <IconSearch
                size={32}
                className="text-slate-400"
              />
            </div>

            <p className="text-slate-500 font-medium text-lg">
              No workflows found.
            </p>
          </div>
        )}
      </div>

      <CustomModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditData(null);
        }}
      >
        <WorkflowForm
          handleCloseForm={() => {
            setShowForm(false);
            setEditData(null);
          }}
          updateList={getList}
          editData={editData}
          setEditData={setEditData}
          onEditSuccess={handleEditSuccess}
        />
      </CustomModal>

      <CustomModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewWorkflowId(null);
        }}
        size="full"
        className="!max-w-[95vw]"
      >
        <div className="bg-slate-50 min-h-screen sm:min-h-0">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
            <WorkflowDetails
              modalId={viewWorkflowId}
              isModalView={true}
              closeModal={() =>
                setShowViewModal(false)
              }
            />
          </div>
        </div>
      </CustomModal>

      <DeleteConfirmationModal
        isOpen={deleteItemId !== null}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() =>
          handleDelete(deleteItemId)
        }
        isLoading={deleteLoading}
        deactive={true}
      />

      <CustomModal
        isOpen={permanentDeleteId !== null}
        onClose={() =>
          setPermanentDeleteId(null)
        }
      >
        <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-auto shadow-2xl">
          <div className="flex items-center gap-3 text-red-600 mb-5 pb-4 border-b border-red-100">
            <IconAlertTriangle
              size={36}
              className="shrink-0"
            />

            <h2 className="text-2xl font-bold uppercase tracking-wide">
              Extreme Warning
            </h2>
          </div>

          <div className="space-y-4 mb-8">
            <p className="font-bold text-red-700 text-lg">
              THIS ACTION IS COMPLETELY IRREVERSIBLE
              AND CANNOT BE UNDONE!
            </p>

            <p className="text-slate-700 text-base">
              You are about to{' '}
              <span className="font-bold">
                PERMANENTLY WIPE OUT
              </span>{' '}
              this workflow and EVERYTHING associated
              with it.
            </p>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="font-bold text-slate-800 mb-2">
                THIS WILL DESTROY:
              </p>

              <ul className="list-disc pl-5 space-y-1.5 text-slate-700 font-medium text-sm">
                <li>
                  ALL Workflow Versions &
                  Configurations
                </li>
                <li>ALL Associated Templates</li>
                <li>
                  ALL Uploaded Documents & Process
                  Files
                </li>
                <li>
                  ALL Running & Completed Processes
                </li>
                <li>
                  ALL Approval Histories &
                  Signatures
                </li>
                <li>ALL Physical Server Folders</li>
              </ul>
            </div>

            <p className="font-bold text-slate-900 mt-2 text-center text-lg">
              Are you absolutely sure you want to
              proceed?
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <CustomButton
              variant="secondary"
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 transition-all rounded-lg font-semibold"
              click={() =>
                setPermanentDeleteId(null)
              }
              disabled={deleteLoading}
              type="button"
              text="Cancel & Keep Safe"
            />

            <CustomButton
              variant="danger"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 transition-all text-white rounded-lg font-semibold shadow-md shadow-red-200"
              click={() =>
                handlePermanentDelete(
                  permanentDeleteId
                )
              }
              disabled={deleteLoading}
              type="button"
              text={
                deleteLoading
                  ? 'Deleting...'
                  : 'Permanently Delete Everything'
              }
            />
          </div>
        </div>
      </CustomModal>

      {showMigrationModal && migrationData && (
        <CustomModal
          isOpen={showMigrationModal}
          onClose={() =>
            setShowMigrationModal(false)
          }
          size="lg"
        >
          <MigrationModal
            migrationData={migrationData}
            selectedProcesses={selectedProcesses}
            setSelectedProcesses={
              setSelectedProcesses
            }
            onMigrate={handleMigrate}
            migrating={migrating}
            onClose={() =>
              setShowMigrationModal(false)
            }
          />
        </CustomModal>
      )}
    </div>
  );
}