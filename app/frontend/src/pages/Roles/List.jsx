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
import CustomButtom from '../../CustomComponents/CustomButton';
import DeleteConfirmationModal from '../../components/DeleteConfirmation';
import CustomCard from '../../CustomComponents/CustomCard';

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
    // {
    //   field: 'status',
    //   headerName: 'Status',
    //   flex: 1,
    //   renderCell: (params) => (
    //     <Stack justifyContent="center" alignItems="center" height="100%">
    //       <Typography
    //         variant="subtitle2"
    //         sx={{
    //           backgroundColor: params?.value === 'Active' ? '#13a126' : 'red',
    //           padding: '5px 10px',
    //           borderRadius: '20px',
    //           color: 'white',
    //         }}
    //       >
    //         {params?.value || '--'}
    //       </Typography>
    //     </Stack>
    //   ),
    // },
    {
      field: 'actions',
      flex: 1,
      headerName: 'Actions',
      sortable: false,
      renderCell: (params) => (
        <div className="flex space-x-2 m-1">
          {console.log(params)}
          <button
            className="p-2 bg-button-secondary-default hover:bg-button-secondary-hover rounded-lg"
            onClick={() => handleEdit(params.row)}
          >
            <IconEdit color="white" />
          </button>
          <button
            className="p-2 bg-button-danger-default hover:bg-button-danger-hover rounded-lg"
            onClick={() => {
              setDeleteItemId(params.row.id);
              setModalOpen(true);
            }}
          >
            <IconTrash color="white" />
          </button>
        </div>
      ),
    },
  ];

  const filteredRoles = roles
    .filter(
      (row) =>
        row?.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row?.departmentName?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .map((row, index) => ({ ...row }));
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
        <Link to="/roles/createNew">
          <CustomButtom text={'Add Role'} />
        </Link>
      </Stack>

      <DataGrid
        rows={filteredRoles}
        columns={columns}
        pageSize={10}
        autoHeight
        disableSelectionOnClick
      />

      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => handleDelete(deleteItemId)}
        isLoading={deleteLoading}
      />
    </CustomCard>
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
