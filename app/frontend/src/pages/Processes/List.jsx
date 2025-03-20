import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Box,
  Button,
  TextField,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { IconEye, IconSquareRoundedX } from '@tabler/icons-react';
import sessionData from '../../Store';
import { GetProcessesList } from '../../common/Apis';

export default function List() {
  const { setNotifications, notifications } = sessionData();
  const [data, setData] = useState([]);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProcesses = async () => {
    try {
      const res = await GetProcessesList();
      setData(res?.data || []);
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
    navigate(`/processes/work/view?data=${encodeURIComponent(id)}`);
    handleRemoveNotification(id);
  };

  const handleRemoveNotification = async (id) => {
    try {
      await axios.post(`${backendUrl}/removeProcessNotification/${id}`, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      setNotifications(notifications.filter((item) => item.processId !== id));
    } catch (error) {
      console.error('Error removing notification', error);
    }
  };

  const columns = [
    { field: 'processName', headerName: 'Process Name', width: 200 },
    { field: 'initiatorUsername', headerName: 'Initiator', width: 200 },
    {
      field: 'createdAt',
      headerName: 'Created At',
      width: 200,
      valueFormatter: ({ value }) =>
        moment(value).format('DD-MMM-YYYY hh:mm A'),
    },
    { field: 'actionType', headerName: 'Action Type', width: 150 },
    { field: 'stepName', headerName: 'Step Name', width: 150 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <div className="flex space-x-2 m-1">
          <button
            className="p-2 bg-button-primary-default hover:bg-button-primary-hover rounded-lg"
            onClick={() => navigate(`/users/edit/${params.row.processId}`)}
          >
            <IconEye color="white" />
          </button>
        </div>
      ),
    },
  ];

  const rows = filteredData.map((item, index) => ({
    id: index + 1,
    processId: item.processId,
    processName: item.processName,
    initiatorUsername: item.initiatorUsername,
    createdAt: item.createdAt,
    actionType: item.actionType,
    stepName: item.stepName,
  }));

  useEffect(() => {
    fetchProcesses();
  }, []);

  return (
    <Box>
      {loading ? (
        <ComponentLoader />
      ) : (
        <div className="border border-slate-300 bg-white p-6 rounded-lg shadow-sm w-full mx-auto">
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
        </div>
      )}
    </Box>
  );
}
