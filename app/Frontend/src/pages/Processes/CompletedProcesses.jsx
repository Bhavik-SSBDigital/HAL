import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { IconEye, IconRefresh } from '@tabler/icons-react';
import { GetCompletedProcessList, RestartProcessApi } from '../../common/Apis';
// Import your specific restart API here
// import { RestartProcessApi } from '../../common/Apis'; 
import CustomCard from '../../CustomComponents/CustomCard';

export default function CompletedProcesses() {
  const [data, setData] = useState([]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [restartModal, setRestartModal] = useState({ open: false, processId: null });
  const [restarting, setRestarting] = useState(false);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const res = await GetCompletedProcessList();
      setData(res?.data?.data || []);
    } catch (error) {
      console.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((item) =>
    item.processName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleView = (id) => {
    navigate(`/process/view/${id}?completed=true`);
  };

  const triggerRestartConfirmation = (id) => {
    setRestartModal({ open: true, processId: id });
  };

  const executeRestartProcess = async () => {
  try {
    setRestarting(true);
    
    const payload = {
      processId: restartModal.processId,
      // targetWorkflowId: "optional-uuid-here" // Include if migrating to a new workflow
    };

    const response = await RestartProcessApi(payload);
    
    // Optional: Add success toast notification here using response.data.message
    console.log(response.data.message);

    // Refresh the list
    await fetchProcesses();
  } catch (error) {
    console.error("Failed to restart process:", error?.response?.data?.message || error.message);
    // Optional: Add error toast notification here
  } finally {
    setRestarting(false);
    setRestartModal({ open: false, processId: null });
  }
};

  const columns = [
    { field: 'processName', headerName: 'Process Name', width: 200 },
    { field: 'initiatorUsername', headerName: 'Initiator', width: 200 },
    {
      field: 'createdAt',
      headerName: 'Created At',
      width: 200,
      valueGetter: (value) =>
        value ? moment(value).format('DD-MMM-YYYY hh:mm A') : '--',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <div className="flex space-x-2 m-1">
          <button
            title="View Process"
            className="p-2 bg-button-primary-default hover:bg-button-primary-hover rounded-lg"
            onClick={() => handleView(params.row.processId)}
          >
            <IconEye color="white" size={20} />
          </button>
          <button
            title="Restart Process"
            className="p-2 bg-orange-500 hover:bg-orange-600 rounded-lg"
            onClick={() => triggerRestartConfirmation(params.row.processId)}
          >
            <IconRefresh color="white" size={20} />
          </button>
        </div>
      ),
    },
  ];

  const rows = filteredData.map((item, index) => ({
    id: index + 1,
    processId: item.processId,
    processName: item.processName,
    initiatorUsername: item.initiatorName,
    createdAt: item.createdAt,
  }));

  useEffect(() => {
    fetchProcesses();
  }, []);

  return (
    <div>
      {loading ? (
        <ComponentLoader />
      ) : (
        <CustomCard>
          <label className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            onChange={(e) => setSearchTerm(e.target.value)}
            required
            className="w-full p-2 border rounded mb-2 max-w-[200px]"
          />
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10]}
          />
        </CustomCard>
      )}

      {/* Confirmation Modal */}
      {restartModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-red-600 mb-4">Warning: Restart Process</h3>
            <p className="text-gray-700 text-sm mb-4">
              Please understand that you must carefully restart the process. If you proceed and there are already existing process details, there might be redundant details circulated to assignees.
            </p>
            <p className="text-gray-900 text-sm font-semibold mb-6">
              Do you agree to take responsibility and proceed with the restart?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                disabled={restarting}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setRestartModal({ open: false, processId: null })}
              >
                Cancel
              </button>
              <button
                disabled={restarting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
                onClick={executeRestartProcess}
              >
                {restarting ? "Restarting..." : "I Agree, Restart"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}