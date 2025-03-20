import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  CircularProgress,
  Typography,
  IconButton,
} from '@mui/material';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import DeleteConfirmationModal from '../../components/DeleteConfirmation';

const List = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  const fetchData = async () => {
    const accessToken = sessionStorage.getItem('accessToken');

    try {
      const response = await axios.post(`${backendUrl}/getAllBranches`, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 200) {
        setIsLoading(false);
        setData(response.data.departments);
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error fetching branches:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (id) => {
    navigate(`/branches/edit/${id}`);
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    const url = `${backendUrl}/deleteBranch/${id}`;
    const accessToken = sessionStorage.getItem('accessToken');

    try {
      const response = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 200) {
        setData((prev) => prev.filter((item) => item._id !== id));
        toast.success('Branch deleted');
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('Error deleting branch');
    }
    setDeleteItemId(null);
    setDeleteLoading(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Branch Name',
      width: 180,
      renderCell: (params) => params.value || '--', // Check for value, show '--' if not present
    },
    {
      field: 'code',
      headerName: 'Branch Code',
      width: 150,
      renderCell: (params) => params.value || '--', // Check for value, show '--' if not present
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (params) => (
        <Stack justifyContent="center" alignItems="center" height="100%">
          <Typography
            variant="subtitle2"
            sx={{
              backgroundColor: params?.value === 'Active' ? '#13a126' : 'red',
              padding: '5px 10px',
              borderRadius: '20px',
              color: 'white',
            }}
          >
            {params?.value || '--'}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created Date',
      width: 180,
      renderCell: (params) =>
        params.value
          ? moment(params.value).format('DD-MMM-YYYY hh:mm A')
          : '--', // Format the date or show '--'
    },
    {
      field: 'updatedAt',
      headerName: 'Updated Date',
      width: 180,
      renderCell: (params) =>
        params.value
          ? moment(params.value).format('DD-MMM-YYYY hh:mm A')
          : '--', // Format the date or show '--'
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <div className="flex space-x-2 m-1">
          <button
            className="p-2 bg-button-secondary-default hover:bg-button-secondary-hover rounded-lg"
            onClick={() => handleEdit(params.row.id)}
          >
            <IconEdit color="white" />
          </button>
          <button
            className="p-2 bg-button-danger-default hover:bg-button-danger-hover rounded-lg"
            onClick={() => {
              setDeleteItemId(params.row._id);
            }}
          >
            <IconTrash color="white" />
          </button>
        </div>
      ),
    },
  ];

  const filteredData = data.filter((row) =>
    row.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <Box sx={{ backgroundColor: 'white', padding: 2, borderRadius: 2 }}>
          <Stack
            flexDirection="row"
            justifyContent="space-between"
            gap={2}
            marginBottom={1}
          >
            <TextField
              label="Search"
              size="small"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <Link to="/branches/createNew">
              <Button variant="contained">ADD BRANCH</Button>
            </Link>
          </Stack>

          <DataGrid
            rows={filteredData}
            columns={columns}
            pageSize={10}
            autoHeight
            disableSelectionOnClick
          />
        </Box>
      )}
      <DeleteConfirmationModal
        isOpen={deleteItemId !== null}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => handleDelete(deleteItemId)}
        isLoading={deleteLoading}
      />
    </>
  );
};

export default List;
