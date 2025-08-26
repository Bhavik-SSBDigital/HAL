import { useEffect, useState } from 'react';
import CustomButton from '../../CustomComponents/CustomButton';
import TopLoader from '../../common/Loader/TopLoader';
import { getPhysicalRequests } from '../../common/Apis';

const PhysicalDocuments = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Static API response data
  const staticData = {
    approved: [
      {
        id: 1,
        document: { id: 1, name: 'Audit Report 2025' },
        department: { id: 2, name: 'Finance' },
        reason: 'Need physical copy for audit',
        status: 'ADMIN_APPROVED',
        messages: [
          {
            id: 1,
            message: 'Approved by admin',
            user: { id: 102, name: 'Admin User' },
            createdAt: '2025-08-26T13:15:00Z',
          },
        ],
      },
    ],
    rejected: [
      {
        id: 2,
        document: { id: 3, name: 'Contract X' },
        department: { id: 2, name: 'Finance' },
        reason: 'For client meeting',
        status: 'HOD_REJECTED',
        messages: [
          {
            id: 2,
            message: 'Rejected: Not necessary',
            user: { id: 103, name: 'HOD User' },
            createdAt: '2025-08-26T13:20:00Z',
          },
        ],
      },
    ],
    pendingHod: [
      {
        id: 3,
        document: { id: 4, name: 'Policy Doc' },
        department: { id: 2, name: 'Finance' },
        reason: 'For training',
        status: 'PENDING_HOD_APPROVAL',
        messages: [],
      },
    ],
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await getPhysicalRequests();
      setRequests(response?.data);
      setFilteredRequests(response?.data);
    } catch (err) {
      console.error(err);
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

  if (loading) {
    return <TopLoader />;
  }

  return (
    <div className="p-6">
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring focus:ring-green-500"
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
            <div
              key={req.id}
              className="p-4 border rounded-lg shadow-sm bg-white flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{req.document?.name}</p>
                <p className="text-sm text-gray-600">
                  {req.reason} -{' '}
                  <span className="font-medium">{req.department?.name}</span>
                </p>
                {req.messages?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last message:{' '}
                    {req.messages[req.messages.length - 1].message} (
                    {req.messages[req.messages.length - 1].user.name})
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 text-xs rounded-full border ${
                  req.status.includes('APPROVED')
                    ? 'bg-green-100 text-green-700'
                    : req.status.includes('REJECTED')
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {req.status}
              </span>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No requests found.</p>
        )}
      </div>
    </div>
  );
};

export default PhysicalDocuments;
