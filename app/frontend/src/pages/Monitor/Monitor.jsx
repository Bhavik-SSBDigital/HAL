import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { Box, Button, Stack, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { toast } from 'react-toastify';
import sessionData from '../../Store';
import styles from './Monitor.module.css';
import ComponentLoader from '../../common/Loader/ComponentLoader';

const Monitor = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const { setWork } = sessionData();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const fetchProcesses = async ({ page, pageSize }) => {
    try {
      const url = `${backendUrl}/getProcessesForUser`;
      const res = await axios.post(
        url,
        {
          startingIndex: page * pageSize,
          pageSize: pageSize,
          forMonitoring: true,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );

      if (res.status === 200) {
        return res.data;
      } else {
        throw new Error('Unable to fetch processes for user');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const { data, isLoading, isFetching } = useQuery(
    ['pendingProcesses', 'monitor', page, pageSize],
    () => fetchProcesses({ page, pageSize }),
    {
      staleTime: 60000,
      cacheTime: 60000,
      keepPreviousData: true,
    },
  );

  const handleView = (id, workflow) => {
    navigate(
      `/monitor/view?data=${encodeURIComponent(
        id,
      )}&workflow=${encodeURIComponent(workflow)}`,
    );
  };

  const columns = [
    { field: 'id', headerName: 'Serial No', width: 100 },
    { field: 'name', headerName: 'Process Name', width: 250 },
    {
      field: 'createdAt',
      headerName: 'Create Time',
      width: 200,
      renderCell: (params) =>
        moment(params.value).format('DD-MMM-YYYY hh:mm A'),
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 150,
      renderCell: (params) => (
        <Button
          onClick={() =>
            handleView(params.row._id, params.row.workFlowToBeFollowed)
          }
        >
          View
        </Button>
      ),
    },
  ];

  const rows =
    data?.processes?.map((row, index) => ({
      id: index + 1,
      ...row,
    })) || [];

  return (
    <>
      {isFetching || isLoading ? (
        <ComponentLoader />
      ) : (
        <Stack flexDirection="column" className={styles.container}>
          <Box display="flex" justifyContent="flex-end" my={1}>
            <TextField
              label="Search"
              size="small"
              variant="outlined"
              value={searchTerm}
              sx={{ backgroundColor: 'white' }}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading || isFetching}
            />
          </Box>
          <Box
            className={styles.tableContainer}
            style={{ width: '100%' }}
          >
            <DataGrid
              rows={rows.filter((row) =>
                row.name.toLowerCase().includes(searchTerm.toLowerCase()),
              )}
              columns={columns}
              pageSize={pageSize}
              rowsPerPageOptions={[10, 20, 50]}
              pagination
              paginationMode="server"
              rowCount={data?.total || 0}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => setPageSize(newSize)}
              loading={isLoading}
            />
          </Box>
        </Stack>
      )}
    </>
  );
};

export default Monitor;
