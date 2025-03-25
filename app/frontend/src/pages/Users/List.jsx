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
import { DeleteUser, getAllUsers } from '../../common/Apis';
import DeleteConfirmationModal from '../../CustomComponents/DeleteConfirmation';
import CustomButtom from '../../CustomComponents/CustomButton';
import CustomCard from '../../CustomComponents/CustomCard';

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

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      const res = await DeleteUser(id);
      setData((prev) => prev.filter((item) => item._id !== id));
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
    {
      field: 'actions',
      flex: 1,
      headerName: 'Actions',
      renderCell: (params) => (
        <div className="flex space-x-2 m-1">
          <button
            className="p-2 bg-button-secondary-default hover:bg-button-secondary-hover rounded-lg"
            onClick={() => navigate(`/users/edit/${params.row.id}`)}
          >
            <IconEdit color="white" />
          </button>
          <button
            className="p-2 bg-button-danger-default hover:bg-button-danger-hover rounded-lg"
            onClick={() => {
              setDeleteItemId(params.id);
              setModalOpen(true);
            }}
          >
            <IconTrash color="white" />
          </button>
        </div>
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
    <CustomCard>
      <Stack
        alignContent="flex-end"
        flexWrap="wrap"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="flex-end"
        mb={1}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            onChange={(e) => setSearchTerm(e.target.value)}
            required
            className="w-full p-2 border rounded max-w-[200px]"
          />
        </div>
        <Link to="/users/createNew">
          <CustomButtom text={'Add User'} />
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
      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={deleteModalClose}
        onConfirm={() => handleDelete(deleteItemId)}
        isLoading={deleteLoading}
      />
    </CustomCard>
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
