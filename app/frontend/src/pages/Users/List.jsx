import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { DataGrid } from '@mui/x-data-grid';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { DeleteUser, getAllUsers } from '../../common/Apis';
import DeleteConfirmationModal from '../../CustomComponents/DeleteConfirmation';
import CustomButtom from '../../CustomComponents/CustomButton';
import CustomCard from '../../CustomComponents/CustomCard';

const UsersList = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionsLoading, setActionsLoading] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState();
  const navigate = useNavigate();

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const fetchData = async () => {
    try {
      const { data } = await getAllUsers();
      setData(data.data);
    } catch (error) {
      toast.error('Unable to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deleteModalClose = () => {
    setDeleteItemId('');
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    setActionsLoading(true);
    try {
      await DeleteUser(id);
      setData((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      toast.error('Error deleting user');
    } finally {
      deleteModalClose();
      setActionsLoading(false);
    }
  };

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

  const columns = [
    {
      field: 'username',
      headerName: 'Username',
      flex: 1,
      renderCell: (params) => params.value || '--',
    },
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
          <CustomButtom
            variant={'secondary'}
            click={() => navigate(`/users/edit/${params.row.id}`)}
            text={<IconEdit color="white" />}
            disabled={actionsLoading}
          />
          <CustomButtom
            variant={'danger'}
            click={() => {
              setDeleteItemId(params.id);
              setModalOpen(true);
            }}
            disabled={actionsLoading}
            text={<IconTrash color="white" />}
          />
        </div>
      ),
      width: 80,
    },
  ];

  return (
    <>
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <CustomCard>
          <div className="flex items-end justify-between gap-3 mb-1">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Search
              </label>
              <input
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded max-w-[200px]"
              />
            </div>
            <Link to="/users/createNew">
              <CustomButtom text={'Add User'} />
            </Link>
          </div>

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
            isLoading={actionsLoading}
          />
        </CustomCard>
      )}
    </>
  );
};

export default UsersList;
