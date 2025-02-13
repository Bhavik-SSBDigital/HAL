import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { DataGrid } from '@mui/x-data-grid';
import { TextField, Paper, Box } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { toast } from 'react-toastify';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import styles from './List.module.css';

export default function List() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    const url = backendUrl + '/getUserLogs';
    const res = await axios.post(
      url,
      { startingIndex: 0, pageSize: 100 },
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      },
    );
    if (res.status === 200) {
      return res.data.worksDone || [];
    } else {
      throw new Error('Unable to fetch logs for user');
    }
  };

  const { data, error, isLoading } = useQuery('userLogs', fetchLogs, {
    onError: (error) => {
      toast.error(error.message);
    },
    cacheTime: 12000,
    staleTime: 12000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const filteredData = data?.filter((item) =>
    item.processName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleLogView = (id) => {
    navigate(
      `/processes/logs/view?data=${encodeURIComponent(JSON.stringify(id))}`,
    );
  };

  const columns = [
    { field: 'id', headerName: 'Serial No', width: 100 },
    { field: 'processName', headerName: 'Process Name', flex: 1 },
    {
      field: 'time',
      headerName: 'Time',
      width: 200,
      valueFormatter: ({ value }) =>
        moment(value).format('DD-MMM-YYYY hh:mm A'),
    },
    { field: 'work', headerName: 'Your Work', flex: 1 },
    {
      field: 'action',
      headerName: 'Action',
      width: 150,
      renderCell: (params) => (
        <button onClick={() => handleLogView(params.row._id)}>
          View Details
        </button>
      ),
    },
  ];

  const rows = filteredData?.map((row, index) => ({
    id: index + 1,
    _id: row._id,
    processName: row.processName,
    time: row.time,
    work: row.currentStep.work,
  }));

  return (
    <Box>
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <div className={styles.container}>
          <TextField
            label="Search"
            variant="outlined"
            value={searchTerm}
            size="small"
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2, width: '100%' }}
          />
          <DataGrid
            rows={rows || []}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            autoHeight
            disableSelectionOnClick
          />
        </div>
      )}
    </Box>
  );
}
