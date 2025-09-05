import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import CustomButton from '../../CustomComponents/CustomButton';
import TopLoader from '../../common/Loader/TopLoader';
import { IconEye } from '@tabler/icons-react';
import {
  getPhysicalRequests,
  updatePhysicalRequest,
  getPhysicalRequestMessages,
  ViewDocument,
} from '../../common/Apis';
import ViewFile from '../view/View';
import CustomModal from '../../CustomComponents/CustomModal';
import CustomCard from '../../CustomComponents/CustomCard';

const PhysicalDocuments = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [fileView, setFileView] = useState(null);
  const isAdmin = sessionStorage.getItem('isAdmin');
  const isDepartmentHead = sessionStorage.getItem('isDepartmentHead');

  const statuses = [
    'PENDING_ADMIN_APPROVAL',
    'ADMIN_APPROVED',
    'ADMIN_REJECTED',
    'PENDING_HOD_APPROVAL',
    'HOD_APPROVED',
    'HOD_REJECTED',
    'PENDING_USER_RESPONSE',
    'DOC_RETURNED',
    'DOC_SCRAPPED',
  ];

  const actionOptions = {
    admin: {
      PENDING_ADMIN_APPROVAL: ['approve', 'reject', 'sendToHod', 'queryUser'],
      ADMIN_APPROVED: [],
      HOD_APPROVED: ['approve', 'reject'],
    },
    hod: {
      PENDING_HOD_APPROVAL: ['approve', 'reject', 'queryUser'],
    },
    user: {
      PENDING_USER_RESPONSE: ['respond'],
      ADMIN_APPROVED: ['returnDoc', 'scrapDoc'],
      DOC_RETURNED: ['respond'],
      DOC_SCRAPPED: ['respond'],
    },
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await getPhysicalRequests();
      setRequests(response?.data);
      setFilteredRequests(response?.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = async (name, path, fileId, type) => {
    setLoading(true);
    try {
      const fileData = await ViewDocument(name, path, type, fileId);
      setFileView(fileData);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Set initial status filter based on role
    if (isAdmin === 'true') {
      setStatusFilter('PENDING_ADMIN_APPROVAL');
    } else if (isDepartmentHead === 'true') {
      setStatusFilter('PENDING_HOD_APPROVAL');
    } else {
      setStatusFilter('ADMIN_APPROVED');
    }
  }, []);

  useEffect(() => {
    if (statusFilter) {
      setFilteredRequests(
        requests.filter((req) => req.status === statusFilter),
      );
    } else {
      setFilteredRequests(requests);
    }
  }, [statusFilter, requests]);

  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
    setAction('');
    setMessage('');
    setError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setAction('');
    setMessage('');
    setError('');
  };

  const openHistoryModal = async (request) => {
    setLoading(true);
    setSelectedRequest(request);
    setIsHistoryModalOpen(true);
    setSelectedMessages([]);
    try {
      const response = await getPhysicalRequestMessages(request.id);
      setSelectedMessages(response.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch message history');
    } finally {
      setLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedRequest(null);
    setSelectedMessages([]);
  };

  const handleUpdateRequest = async () => {
    if (!action) {
      setError('Please select an action');
      toast.error('Please select an action');
      return;
    }

    setModalLoading(true);
    try {
      const response = await updatePhysicalRequest(
        selectedRequest.id,
        JSON.stringify({ action, message: message.trim() || undefined }),
      );

      const data = response.data;
      setRequests((prev) =>
        prev.map((req) => (req.id === data.id ? data : req)),
      );
      setFilteredRequests((prev) =>
        prev.map((req) => (req.id === data.id ? data : req)),
      );
      toast.success('Request updated successfully');
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const getAvailableActions = (status) => {
    const userRole =
      isAdmin === 'true'
        ? 'admin'
        : isDepartmentHead === 'true'
          ? 'hod'
          : 'user';
    return actionOptions[userRole]?.[status] || [];
  };

  if (loading) {
    return <TopLoader />;
  }

  return (
    <>
      <div className="p-6 bg-gray-100 min-h-screen">
        {/* Filter */}
        <div className="flex items-center gap-4 mb-6 rounded-lg">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-md px-4 py-2 focus:ring-2 focus:ring-green-500 bg-white shadow-sm flex-1"
          >
            <option value="">All Status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <CustomButton
            text="Refresh"
            click={fetchRequests}
            variant="primary"
            disabled={loading}
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((req) => (
              <CustomCard key={req.id}>
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-lg text-gray-900 truncate">
                    {req.document?.name}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                    <b>Reason :</b> {req.reason}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    <b>Department Name : </b>
                    <span className="font-medium">{req?.department?.name}</span>
                  </p>
                  {req.lastMessage && (
                    <p className="text-sm text-gray-500 mt-1">
                      Recent Message:{' '}
                      <span className="font-medium">{req.lastMessage}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap w-full justify-end">
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-medium border ${
                      req.status.includes('APPROVED')
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : req.status.includes('REJECTED')
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }`}
                  >
                    {req.status.replace('_', ' ')}
                  </span>
                  <CustomButton
                    text={<IconEye size={18} className="text-white" />}
                    title="View Document"
                    click={() =>
                      handleViewFile(
                        req.document?.name,
                        req.document?.path.substring(
                          0,
                          req.document?.path.lastIndexOf('/'),
                        ),
                        req.document?.id,
                        req.document?.name?.split('.').pop()?.toLowerCase(),
                      )
                    }
                    variant="primary"
                  />
                  <button
                    onClick={() => openHistoryModal(req)}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 text-sm font-medium"
                  >
                    History
                  </button>
                  {getAvailableActions(req.status).length > 0 && (
                    <button
                      onClick={() => openModal(req)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                    >
                      Update
                    </button>
                  )}
                </div>
              </CustomCard>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No requests found.</p>
          )}
        </div>

        {/* View File Modal */}
        {fileView && (
          <ViewFile
            docu={fileView}
            setFileView={setFileView}
            handleViewClose={() => setFileView(null)}
          />
        )}
      </div>
      {/* Update Modal */}
      {isModalOpen && (
        <CustomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Update Request: {selectedRequest?.document?.name}
          </h2>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Action</option>
              {getAvailableActions(selectedRequest?.status).map((act) => (
                <option key={act} value={act}>
                  {act.charAt(0).toUpperCase() + act.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white"
              rows="4"
              placeholder="Enter a message..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <CustomButton
              click={closeModal}
              variant={'danger'}
              disabled={modalLoading}
              text={'Cancel'}
            ></CustomButton>
            <CustomButton
              click={handleUpdateRequest}
              disabled={modalLoading}
              text={modalLoading ? 'Updating...' : 'Submit'}
            ></CustomButton>
          </div>
        </CustomModal>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <CustomModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
        >
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Message History: {selectedRequest?.document?.name}
          </h2>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700">Query Reason:</p>
            <p className="text-sm text-gray-600">{selectedRequest?.reason}</p>
          </div>
          <div className="mb-6 space-y-4 max-h-96 overflow-y-auto">
            {selectedMessages.length > 0 ? (
              selectedMessages.map((msg, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-gray-50 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold text-sm text-gray-800">
                      {msg.user.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Message:
                    </p>
                    <p className="text-sm text-gray-600">{msg.message}</p>
                  </div>
                  {msg.previousStatus && msg.newStatus && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Status Update:
                      </p>
                      <p className="text-xs text-gray-600">
                        Changed from{' '}
                        <span className="font-semibold text-red-600">
                          {msg.previousStatus}
                        </span>{' '}
                        to{' '}
                        <span className="font-semibold text-green-600">
                          {msg.newStatus}
                        </span>{' '}
                        by{' '}
                        <span className="font-semibold text-blue-600">
                          {msg.changerRole}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No messages found.
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <CustomButton
              click={closeHistoryModal}
              variant={'danger'}
              text={'Close'}
            ></CustomButton>
          </div>
        </CustomModal>
      )}
    </>
  );
};

export default PhysicalDocuments;
