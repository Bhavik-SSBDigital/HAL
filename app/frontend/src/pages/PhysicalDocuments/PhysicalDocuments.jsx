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
import moment from 'moment';

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
  const isKeeperOfPhysicalDocs = sessionStorage.getItem(
    'isKeeperOfPhysicalDocs',
  );
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
      isAdmin === 'true' || isKeeperOfPhysicalDocs === 'true'
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
      <div className="p-2 bg-gray-100 min-h-screen">
        {/* Filter */}
        <div className="flex items-center gap-4 mb-2 rounded-lg">
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
        <div className="space-y-4">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((req) => (
              <CustomCard key={req.id}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                  {/* LEFT: DOCUMENT + REQUEST INFO */}
                  <div className="flex-1 space-y-3">
                    {/* Document */}
                    <div>
                      <p className="font-semibold text-lg text-gray-900 truncate">
                        📄 {req.document?.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {req.document?.path}
                      </p>
                    </div>

                    {/* Reason */}
                    <div className="bg-gray-50 border rounded-lg p-3 text-base">
                      <span className="font-medium text-gray-700">Reason:</span>
                      <span className="ml-1 text-gray-600">{req.reason}</span>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-semibold">Department:</span>{' '}
                        {req.department?.name}
                      </p>
                      <p>
                        <span className="font-semibold">Requested By:</span>{' '}
                        {req.requestingUser?.username}
                      </p>
                      <p>
                        <span className="font-semibold">Requested On:</span>{' '}
                        {moment(req.createdAt).format('DD MMM YYYY, hh:mm A')}
                      </p>
                      <p>
                        <span className="font-semibold">Last Update:</span>{' '}
                        {moment(req.updatedAt).format('DD MMM YYYY, hh:mm A')}
                      </p>
                    </div>

                    {/* Recent message */}
                    {req.lastMessage && (
                      <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-1.5">
                        💬 {req.lastMessage}
                      </p>
                    )}
                  </div>

                  {/* RIGHT: STATUS + ACTIONS */}
                  <div className="flex lg:flex-col justify-between lg:items-end gap-3 min-w-[230px]">
                    {/* Status */}
                    <span
                      className={`px-4 py-1.5 text-sm rounded-full font-semibold border text-center w-fit
                ${
                  req.status.includes('APPROVED')
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : req.status.includes('REJECTED')
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                }`}
                    >
                      {req.status.replaceAll('_', ' ')}
                    </span>

                    {/* Actions */}
                    <div className="flex flex-wrap justify-end gap-2">
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
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-sm font-medium border"
                      >
                        History
                      </button>

                      {getAvailableActions(req.status).length > 0 && (
                        <button
                          onClick={() => openModal(req)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                        >
                          Update
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CustomCard>
            ))
          ) : (
            <p className="text-gray-500 text-center py-10 text-base">
              No requests found.
            </p>
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
                      Username : {msg.user.username}
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
                          {msg.changerRole == 'ADMIN'
                            ? 'ADMIN OR AUTHORIZED_PERSON'
                            : msg.changerRole}
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
