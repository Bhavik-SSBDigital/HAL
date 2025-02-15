import React, { useEffect, useState } from 'react';
import {
  Button,
  IconButton,
  Typography,
  Box,
  Stack,
  TextField,
  Modal,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CircularProgress } from '@mui/material';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { DataGrid } from '@mui/x-data-grid';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { getAllUsers } from '../../common/Apis';

const Users = ({ data, setData, searchTerm, setSearchTerm }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  // Modal for deleting
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deleteModalClose = () => {
    setDeleteItemId('');
    setModalOpen(false);
  };

  const deleteModalContent = (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <p style={{ fontSize: '18px', marginBottom: '10px' }}>
        ARE YOU SURE YOU WANT TO DELETE USER?
      </p>
      <Stack flexDirection="row" gap={3}>
        <Button
          variant="contained"
          size="small"
          disabled={deleteLoading}
          color="error"
          onClick={() => handleDelete(deleteItemId)}
          sx={{ '&:hover': { backgroundColor: '#ff0000' } }}
        >
          {deleteLoading ? <CircularProgress size={20} /> : 'Yes'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={deleteModalClose}
          disabled={deleteLoading}
          sx={{
            backgroundColor: '#007bff',
            color: 'white',
            '&:hover': {
              backgroundColor: '#0056b3',
            },
          }}
        >
          No
        </Button>
      </Stack>
    </Box>
  );

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      const url = backendUrl + `/deleteUser/${id}`;
      const accessToken = sessionStorage.getItem('accessToken');
      const { status } = await axios.post(url, null, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (status === 200) {
        setData((prev) => prev.filter((item) => item._id !== id));
        toast.success('User is deleted');
      }
    } catch (error) {
      toast.error('Error deleting user');
    } finally {
      deleteModalClose();
    }
    setDeleteLoading(false);
  };

  // Columns definition for XGrid
  const columns = [
    {
      field: 'username',
      headerName: 'Username',
      flex: 1,
      renderCell: (params) => params.value || '--', // Display '--' if no value
    },
    // {
    //   field: 'branch',
    //   headerName: 'Branch',
    //   flex: 1,
    //   renderCell: (params) => params.value || '--',
    // },
    // {
    //   field: 'role',
    //   headerName: 'Role',
    //   flex: 1,
    //   renderCell: (params) => params.value || '--',
    // },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      renderCell: (params) => params.value || '--',
    },
    // {
    //   field: 'status',
    //   headerName: 'Status',
    //   flex: 1,
    //   renderCell: (params) => {
    //     const status = params.value || '--';
    //     const backgroundColor = status === 'Active' ? '#13a126' : 'red';
    //     return (
    //       <Stack
    //         height={'100%'}
    //         justifyContent={'center'}
    //         alignItems={'center'}
    //       >
    //         <Typography
    //           sx={{
    //             backgroundColor,
    //             padding: '2px 12px',
    //             borderRadius: '50px',
    //             color: 'white',
    //           }}
    //         >
    //           {status}
    //         </Typography>
    //       </Stack>
    //     );
    //   },
    // },
    // {
    //   field: 'createdAt',
    //   headerName: 'Created Date',
    //   flex: 1,
    //   renderCell: (params) =>
    //     params.value
    //       ? moment(params.value).format('DD-MMM-YYYY hh:mm A')
    //       : '--', // Format date or show '--'
    // },
    {
      field: 'edit',
      headerName: 'Edit',
      renderCell: (params) => (
        <IconButton onClick={() => navigate(`/users/edit/${params.row.id}`)}>
          <IconEdit color="#2860e0" />
        </IconButton>
      ),
      width: 80,
    },
    {
      field: 'delete',
      headerName: 'Delete',
      renderCell: (params) => (
        <IconButton
          onClick={() => {
            setDeleteItemId(params.row._id);
            setModalOpen(true);
          }}
        >
          <IconTrash color="red" />
        </IconButton>
      ),
      width: 80,
    },
  ];

  // Handle the search filter
  const filteredData = data.filter((row) => {
    return (
      row?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row?.branch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row?.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      moment(row?.createdAt)
        .format('DD-MMM-YYYY hh:mm A')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  });

  return (
    <>
      <Box sx={{ backgroundColor: 'white', padding: 2, borderRadius: 2 }}>
        <Stack
          alignContent="flex-end"
          flexWrap="wrap"
          flexDirection="row"
          justifyContent="space-between"
          alignItems="flex-end"
          mb={1}
        >
          <Box sx={{ width: { lg: '250px', sm: '200px', xs: '170px' } }}>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              sx={{ background: 'white' }}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
            />
          </Box>
          <Link to="/users/createNew">
            <Button variant="contained" sx={{ borderRadius: '9px' }}>
              ADD USER
            </Button>
          </Link>
        </Stack>

        {/* XGrid Component */}
        <DataGrid
          rows={filteredData}
          columns={columns}
          pageSize={10}
          disableSelectionOnClick
          pagination
          rowsPerPageOptions={[10]}
        />

        {isModalOpen && (
          <Modal open={isModalOpen} onClose={deleteModalClose}>
            <div
              style={{
                gap: '10px',
                position: 'relative',
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '10px',
                margin: 'auto',
                top: '50%',
                transform: 'translateY(-50%)',
                maxWidth: '300px',
                textAlign: 'center',
              }}
            >
              {deleteModalContent}
            </div>
          </Modal>
        )}
      </Box>
    </>
  );
};

function List() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await getAllUsers();
      setData(data.data);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast.error('Unable to fetch data. Please try again.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <Users
          data={data}
          setData={setData}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      )}
    </>
  );
}

export default List;
