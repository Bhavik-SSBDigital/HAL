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
import TreeGraph from '../../components/TreeGraph';
import DeleteConfirmationModal from '../../CustomComponents/DeleteConfirmation';
import moment from 'moment';
import CustomCard from '../../CustomComponents/CustomCard';
import CustomButton from '../../CustomComponents/CustomButton';

export default function List() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
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
    setActionsLoading(true);
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
    setActionsLoading(false);
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
        <div className="flex space-x-2 my-1">
          <CustomButton
            click={() => handleViewHierarchy(params.row.id)}
            text={<IconEye color="white" />}
            disabled={actionsLoading}
          />
          <CustomButton
            variant={'secondary'}
            click={() => navigate(`/departments/edit/${params.row.id}`)}
            text={<IconEdit color="white" />}
            disabled={actionsLoading}
          />

          <CustomButton
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
    },
  ];

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.code.includes(searchTerm),
  );

  return (
    <>
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <CustomCard>
          {/* Tabs */}
          <div className="flex justify-end mb-1">
            <div className="flex gap-2 border border-slate-300 bg-[#EEEEEE] p-[6px] rounded-md w-fit">
              <div
                onClick={() => setSelectedTab('list')}
                className={`p-[5px] w-[100px] rounded cursor-pointer text-center transition-all duration-300 ease-in-out ${
                  selectedTab === 'list'
                    ? 'bg-white scale-[1.05]'
                    : 'hover:bg-white/70'
                }`}
              >
                <p className="text-base">List</p>
              </div>
              <div
                onClick={() => setSelectedTab('tree')}
                className={`p-[5px] w-[100px] rounded cursor-pointer text-center transition-all duration-300 ease-in-out ${
                  selectedTab === 'tree'
                    ? 'bg-white scale-[1.05]'
                    : 'hover:bg-white/70'
                }`}
              >
                <p className="text-base">Tree</p>
              </div>
            </div>
          </div>

          {/* Tree View */}
          {selectedTab === 'tree' ? (
            <TreeGraph data={data} loading={isLoading} />
          ) : (
            <div className="w-full">
              {/* Search & Add Button */}
              <div className="flex flex-wrap justify-between items-end mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Search
                  </label>
                  <input
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="p-2 border rounded w-full max-w-xs"
                  />
                </div>
                <Link to="/departments/createNew">
                  <CustomButton text="Add Department" />
                </Link>
              </div>

              {/* Data Grid */}
              <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={filteredDepartments}
                  columns={columns}
                  pageSize={5}
                  autoHeight
                />
              </div>
            </div>
          )}
        </CustomCard>
      )}

      {/* Modal */}
      {isHierarchyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white w-11/12 max-w-4xl rounded-lg p-4 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setHierarchyModalOpen(false)}
                className="text-gray-600 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <TreeGraph data={selectedDepartmentData} loading={isLoading} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => handleDepDelete(deleteItemId)}
        isLoading={actionsLoading}
      />
    </>
  );
}
