import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Button,
  IconButton,
  Box,
  Stack,
  TextField,
  Modal,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { GetRoles } from '../../common/Apis';

const Roles = ({ setIsLoading, isLoading, roles, setRoles }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      const url = `${backendUrl}/deleteRole/${id}`;
      const accessToken = sessionStorage.getItem('accessToken');
      const { status } = await axios.post(url, null, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (status === 200) {
        setRoles((prev) => prev.filter((item) => item._id !== id));
        toast.success('Role deleted');
      }
    } catch (error) {
      toast.error('Error deleting role');
    } finally {
      setDeleteLoading(false);
      setModalOpen(false);
    }
  };

  const handleEdit = (row) => {
    navigate(`/roles/edit/${row.id}`);
  };

  const columns = [
    {
      field: 'role',
      headerName: 'Role Name',
      flex: 1,
      valueGetter: (params) => params || '--',
    },
    {
      field: 'departmentName',
      headerName: 'Department',
      flex: 1,
      valueGetter: (params) => params || '--',
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      flex: 1,
      valueFormatter: (params) =>
        params ? moment(params).format('DD-MMM-YYYY hh:mm A') : '--',
    },
    {
      field: 'updatedAt',
      headerName: 'Updated At',
      flex: 1,
      valueFormatter: (params) =>
        params ? moment(params).format('DD-MMM-YYYY hh:mm A') : '--',
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
      field: 'edit',
      headerName: 'Edit',
      sortable: false,
      renderCell: (params) => (
        <IconButton onClick={() => handleEdit(params.row)}>
          <IconEdit color="#2860e0" />
        </IconButton>
      ),
    },
    {
      field: 'delete',
      headerName: 'Delete',
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={() => {
            setDeleteItemId(params.row.id);
            setModalOpen(true);
          }}
        >
          <IconTrash color="red" />
        </IconButton>
      ),
    },
  ];

  const filteredRoles = [
    {
      id: 1,
      role: 'Administrator',
      branch: 'New York HQ',
      createdAt: '2024-02-06T10:30:00Z',
      updatedAt: '2024-02-06T12:45:00Z',
      status: 'Active',
    },
  ];

  return (
    <Box sx={{ backgroundColor: 'white', padding: 2, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" mb={2} mt={2}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Link to="/roles/createNew">
          <Button variant="contained">ADD ROLE</Button>
        </Link>
      </Stack>
      <DataGrid
        rows={filteredRoles}
        columns={columns}
        pageSize={10}
        autoHeight
        disableSelectionOnClick
      />
      <Modal open={isModalOpen} onClose={() => setModalOpen(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'white',
            p: 3,
            boxShadow: 24,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6">
            ARE YOU SURE YOU WANT TO DELETE ROLE?
          </Typography>
          <Stack direction="row" spacing={2} mt={2}>
            <Button
              variant="contained"
              color="error"
              disabled={deleteLoading}
              onClick={() => handleDelete(deleteItemId)}
            >
              {deleteLoading ? <CircularProgress size={20} /> : 'Yes'}
            </Button>
            <Button variant="outlined" onClick={() => setModalOpen(false)}>
              No
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};

function List() {
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await GetRoles();
        setRoles(data.roles);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return isLoading ? (
    <ComponentLoader />
  ) : (
    <Roles
      roles={roles}
      setRoles={setRoles}
      setIsLoading={setIsLoading}
      isLoading={isLoading}
    />
  );
}

export default List;
