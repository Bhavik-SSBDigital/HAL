import React, { useState, useEffect } from 'react';
import { useInfiniteQuery } from 'react-query';
import {
  Box,
  TextField,
  CircularProgress,
  Paper,
  Stack,
  Pagination,
  Button,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { toast } from 'react-toastify';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import styles from './List.module.css'

export default function List() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const fetchProcesses = async ({ pageParam = 0 }) => {
    const url = `${backendUrl}/getProcessesForUser`;
    const res = await axios.post(
      url,
      {
        startingIndex: pageParam * pageSize,
        pageSize: pageSize,
        forPublishedProcesses: true,
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
      throw new Error('Unable to fetch process for user');
    }
  };

  const { data, error, isLoading, isFetching, fetchNextPage, hasNextPage } =
    useInfiniteQuery('publishedProcesses', fetchProcesses, {
      getNextPageParam: (lastPage, allPages) => {
        return lastPage.remaining ? allPages.length : undefined;
      },
      onError: (error) => {
        toast.error(error.message);
      },
      cacheTime: 12000,
      staleTime: 12000,
    });

  const filteredData =
    data?.pages
      .flatMap((page) => page.processes)
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ) || [];

  const handleChangePage = (newPage) => {
    setPage(newPage);
    fetchNextPage();
  };

  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  const handleView = (id) => {
    navigate(
      `/processes/work/view?data=${encodeURIComponent(id)}&published=true`,
    );
  };

  const columns = [
    { field: 'id', headerName: 'Serial No', width: 120 },
    { field: 'name', headerName: 'Process Name', flex: 1 },
    {
      field: 'createdAt',
      headerName: 'Create Time',
      width: 220,
      renderCell: (params) =>
        moment(params.value).format('DD-MMM-YYYY hh:mm A'),
    },
    {
      field: 'actions',
      headerName: 'View Details',
      width: 150,
      renderCell: (params) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => handleView(params.row._id)}
        >
          View
        </Button>
      ),
    },
  ];

  const rows = filteredData.map((row, index) => ({
    id: index + 1 + page * pageSize,
    _id: row._id,
    name: row.name,
    createdAt: row.createdAt,
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
            sx={{ backgroundColor: 'white', mb: 1 }}
          />
          <DataGrid
            rows={rows}
            columns={columns}
            pagination
            pageSize={pageSize}
            onPageChange={handleChangePage}
            rowCount={filteredData.length}
            disableSelectionOnClick
            loading={isFetching}
          />
        </div>
      )}
    </Box>
  );
}
