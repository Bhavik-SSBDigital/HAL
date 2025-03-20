import {
  Box,
  CircularProgress,
  Dialog,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { IconTrash, IconEdit, IconEye } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import {
  getDepartments,
  getRolesHierarchyInDepartment,
  getDepartmentsHierarchy,
} from '../../common/Apis';
import styles from './List.module.css';
import TreeGraph from '../../components/TreeGraph';
import DeleteConfirmationModal from '../../components/DeleteConfirmation';
import moment from 'moment';

export default function List() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteDepLoading, setDeleteDepLoading] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [data, setData] = useState();
  const [selectedDepartmentData, setSelectedDepartmentData] = useState(null);
  const [isHierarchyModalOpen, setHierarchyModalOpen] = useState(false);
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('list');

  useEffect(() => {
    getHierarchy();
    fetchDepartments();
  }, []);

  const getHierarchy = async () => {
    try {
      const res = await getDepartmentsHierarchy();
      setData(res.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(response.data.departments);
    } catch (error) {
      toast.error('Failed to load departments');
    }
    setIsLoading(false);
  };

  const handleDepDelete = async (id) => {
    setDeleteDepLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/deleteDepartment/${id}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );
      if (response.status === 200) {
        setDepartments((prev) => prev.filter((item) => item._id !== id));
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error('Error deleting department');
    }
    setDeleteDepLoading(false);
    setModalOpen(false);
  };

  const handleViewHierarchy = async (id) => {
    try {
      const response = await getRolesHierarchyInDepartment(id);
      setSelectedDepartmentData(response.data.data);
      setHierarchyModalOpen(true);
    } catch (error) {
      toast.error(error?.response?.data?.message);
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', flex: 0.5 },
    { field: 'name', headerName: 'Department Name', flex: 1 },
    { field: 'code', headerName: 'Code', flex: 0.5 },
    { field: 'status', headerName: 'Status', flex: 0.5 },
    {
      field: 'createdAt',
      headerName: 'Created At',
      flex: 1,
      renderCell: (params) => moment(params.value).format('DD-MM-YYYY'),
    },
    {
      field: 'updatedAt',
      headerName: 'Updated At',
      flex: 1,
      renderCell: (params) => moment(params.value).format('DD-MM-YYYY'),
    },

    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <div className="flex space-x-2 m-1">
          <button
            className="p-2 rounded-lg bg-button-primary-default hover:bg-button-primary-hover"
            onClick={() => handleViewHierarchy(params.row.id)}
          >
            <IconEye color="white" />
          </button>
          <button
            className="p-2 bg-button-secondary-default hover:bg-button-secondary-hover rounded-lg"
            onClick={() => navigate(`/departments/edit/${params.row.id}`)}
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
    },
  ];

  return (
    <>
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <Stack className={styles.container}>
          <Stack
            flexDirection={'row'}
            justifyContent={{ xs: 'center', sm: 'space-between' }}
            flexWrap={'wrap'}
            gap={1}
            mb={1}
          >
            <Stack
              gap={1}
              sx={{ bgcolor: '#EEEEEE', p: 0.6, borderRadius: '8px' }}
              flexDirection={'row'}
            >
              <div
                onClick={() => setSelectedTab('list')}
                className={`${styles.tab} ${
                  selectedTab === 'list' && styles.selectedTab
                }`}
              >
                <Typography variant="body1" textAlign={'center'}>
                  List
                </Typography>
              </div>
              <div
                onClick={() => setSelectedTab('tree')}
                className={`${styles.tab} ${
                  selectedTab === 'tree' && styles.selectedTab
                }`}
              >
                <Typography variant="body1" textAlign={'center'}>
                  Tree
                </Typography>
              </div>
            </Stack>
          </Stack>
          {selectedTab === 'tree' ? (
            <TreeGraph data={data} loading={isLoading} />
          ) : (
            <Box sx={{ width: '100%', height: 400 }}>
              <Stack
                flexDirection="row"
                justifyContent={'flex-end'}
                sx={{ marginBottom: 2 }}
                gap={1}
              >
                <TextField
                  label="Search Departments"
                  variant="outlined"
                  size="small"
                  sx={{ backgroundColor: 'white' }}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Link to="/departments/createNew">
                  <button
                    variant="contained"
                    className="bg-button-primary-default hover:bg-button-primary-hover text-white p-2 rounded-md"
                    sx={{ borderRadius: '8px' }}
                  >
                    Create Department
                  </button>
                </Link>
              </Stack>
              <DataGrid
                rows={departments}
                columns={columns}
                pageSize={5}
                autoHeight
              />
            </Box>
          )}
        </Stack>
      )}
      <Dialog
        open={isHierarchyModalOpen}
        fullWidth
        maxWidth="md"
        onClose={() => setHierarchyModalOpen(false)}
      >
        <TreeGraph data={selectedDepartmentData} loading={isLoading} />
      </Dialog>
      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => handleDepDelete(deleteItemId)}
        isLoading={deleteDepLoading}
      />
    </>
  );
}
