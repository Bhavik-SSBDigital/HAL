import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useQueryClient } from 'react-query';
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
import { toast } from 'react-toastify';
import axios from 'axios';
import moment from 'moment';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { IconSquareRoundedX } from '@tabler/icons-react';
import sessionData from '../../Store';
import styles from './List.module.css';

export default function List() {
  const { setNotifications, notifications } = sessionData();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [fileListOpen, setFileListOpen] = useState(false);
  const [filesList, setFilesList] = useState([]);

  const fetchProcesses = async () => {
    try {
      const res = await axios.post(
        `${backendUrl}/getProcessesForUser`,
        {
          startingIndex: 0,
          pageSize: 100,
          forPublishedProcesses: false,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );
      return res.data;
    } catch (error) {
      toast.error('Unable to fetch processes for user');
    }
  };

  const { data, isLoading } = useQuery('pendingProcesses', fetchProcesses, {
    cacheTime: 12000,
    staleTime: 12000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const filteredData = data?.processes?.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleView = (id, workflow) => {
    navigate(
      `/processes/work/view?data=${encodeURIComponent(
        id,
      )}&workflow=${encodeURIComponent(workflow)}`,
    );
    handleRemoveNotification(id);
  };

  const handleRemoveNotification = async (id) => {
    try {
      await axios.post(`${backendUrl}/removeProcessNotification/${id}`, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      setNotifications(notifications?.filter((item) => item.processId !== id));
    } catch (error) {
      console.error('Error removing notification', error);
    }
  };

  const handleViewFileList = (files) => {
    setFileListOpen(true);
    setFilesList(files);
  };

  const columns = [
    { field: 'id', headerName: 'Serial No', width: 100 },
    { field: 'name', headerName: 'Process Name', width: 200 },
    {
      field: 'createdAt',
      headerName: 'Create Time',
      width: 200,
      valueFormatter: ({ value }) =>
        moment(value).format('DD-MMM-YYYY hh:mm A'),
    },
    {
      field: 'actions',
      headerName: 'Action',
      width: 200,
      renderCell: (params) => (
        <Button
          onClick={() =>
            handleView(params.row._id, params.row.workFlowToBeFollowed)
          }
        >
          View Details
        </Button>
      ),
    },
  ];

  const rows = filteredData?.map((item, index) => ({
    id: index + 1,
    _id: item._id,
    name: item.name,
    createdAt: item.createdAt,
    workFlowToBeFollowed: item.workFlowToBeFollowed,
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
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={rows || []}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10]}
            />
          </Box>
          <Dialog
            open={fileListOpen}
            onClose={() => setFileListOpen(false)}
            sx={{ backdropFilter: 'blur(4px)' }}
          >
            <DialogTitle>
              <Typography variant="h6">Process Files</Typography>
              <IconButton
                onClick={() => setFileListOpen(false)}
                sx={{ position: 'absolute', right: '5px', top: '0px' }}
              >
                <IconSquareRoundedX />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ minWidth: 300 }}>
                {filesList?.length ? (
                  filesList.map((file, index) => (
                    <Typography key={index}>
                      {index + 1}. {file}
                    </Typography>
                  ))
                ) : (
                  <Typography>No files available</Typography>
                )}
              </Box>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Box>
  );
}
