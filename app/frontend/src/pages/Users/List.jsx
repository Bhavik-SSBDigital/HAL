import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import moment from 'moment';
import { DataGrid } from '@mui/x-data-grid';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { DeleteUser, getAllUsers } from '../../common/Apis';
import DeleteConfirmationModal from '../../CustomComponents/DeleteConfirmation';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomCard from '../../CustomComponents/CustomCard';

const UsersList = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionsLoading, setActionsLoading] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState('');
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0,
    direction: 'below',
  });
  const tooltipRef = useRef(null);
  const navigate = useNavigate();

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const fetchData = async () => {
    try {
      const { data } = await getAllUsers();
      // Normalize data to handle both id and _id
      const normalizedData = data.data.map((item) => ({
        ...item,
        id: item.id || item._id,
      }));
      setData(normalizedData);
    } catch (error) {
      toast.error('Unable to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Adjust tooltip position if it goes off-screen
    if (tooltipContent && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = tooltipPosition.x;
      let newY = tooltipPosition.y;
      let direction = tooltipPosition.direction;

      // Check right boundary
      if (newX + tooltipRect.width > viewportWidth) {
        newX = viewportWidth - tooltipRect.width - 10;
      }

      // Check left boundary
      if (newX < 10) {
        newX = 10;
      }

      // If positioned below, check bottom boundary
      if (direction === 'below' && newY + tooltipRect.height > viewportHeight) {
        direction = 'above';
        newY = tooltipPosition.y - tooltipRect.height - 30;
      }

      // If positioned above, check top boundary
      if (direction === 'above' && newY < 10) {
        direction = 'below';
        newY = tooltipPosition.y + 30;
      }

      setTooltipPosition({ x: newX, y: newY, direction });
    }
  }, [tooltipContent, tooltipPosition]);

  const deleteModalClose = () => {
    setDeleteItemId('');
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    setActionsLoading(true);
    try {
      await DeleteUser(id);
      setData((prev) =>
        prev.map((item) =>
          (item.id || item._id) === id ? { ...item, status: 'Inactive' } : item,
        ),
      );
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Error deleting user');
    } finally {
      deleteModalClose();
      setActionsLoading(false);
    }
  };

  const showTooltip = (content, event) => {
    const rect = event.target.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Default to positioning below, but if near bottom of viewport, position above
    const direction = rect.bottom > viewportHeight / 2 ? 'above' : 'below';

    setTooltipPosition({
      x: rect.left + window.scrollX,
      y:
        direction === 'below'
          ? rect.bottom + window.scrollY
          : rect.top + window.scrollY - 10,
      direction,
    });
    setTooltipContent(content);

    // Add event listener to close tooltip when clicking outside
    document.addEventListener('click', handleClickOutside, true);
  };

  const handleClickOutside = (event) => {
    if (
      !event.target.closest('.custom-tooltip') &&
      !event.target.closest('.tooltip-trigger')
    ) {
      hideTooltip();
    }
  };

  const hideTooltip = () => {
    setTooltipContent(null);
    document.removeEventListener('click', handleClickOutside, true);
  };

  // Get all unique departments from user roles
  const getAllDepartments = (roles) => {
    const departmentMap = new Map();
    roles?.forEach((role) => {
      role.departments?.forEach((dept) => {
        if (!departmentMap.has(dept.id)) {
          departmentMap.set(dept.id, dept);
        }
      });
    });
    return Array.from(departmentMap.values());
  };

  const filteredData = data.filter((row) => {
    const rolesString =
      row.roles?.map((r) => r.role?.toLowerCase()).join(' ') || '';
    const departments = getAllDepartments(row.roles);
    const departmentsString =
      departments.map((d) => d.name?.toLowerCase()).join(' ') || '';

    return (
      row?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row?.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      '' ||
      rolesString.includes(searchTerm.toLowerCase()) ||
      departmentsString.includes(searchTerm.toLowerCase()) ||
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
      minWidth: 120,
      renderCell: (params) => (
        <span className="text-gray-900 truncate" title={params.value || ''}>
          {params.value || '--'}
        </span>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <span className="text-gray-900 truncate" title={params.value || ''}>
          {params.value || '--'}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 100,
      renderCell: (params) => (
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold truncate ${
            params.value === 'ACTIVE'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
          title={params.value || ''}
        >
          {params.value || '--'}
        </span>
      ),
    },
    {
      field: 'roles',
      headerName: 'Roles',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const roles = params.value || [];
        return roles.length > 0 ? (
          <button
            className="tooltip-trigger inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold truncate hover:bg-blue-200 transition-colors"
            title="Click to view roles and departments"
            onClick={(e) => {
              e.stopPropagation();
              showTooltip(
                <div>
                  <h4 className="font-bold mb-2">Roles & Departments:</h4>
                  <ul className="list-none space-y-2 max-h-40 overflow-y-auto">
                    {roles.map((role, index) => (
                      <li key={index} className="truncate">
                        <span className="font-medium">{role.role}</span>
                        {role.departments && role.departments.length > 0 && (
                          <span className="text-gray-600 text-sm ml-2">
                            ({role.departments.map((d) => d.name).join(', ')})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>,
                e,
              );
            }}
          >
            {roles.length} Role{roles.length !== 1 ? 's' : ''}
          </button>
        ) : (
          <span className="text-gray-500">--</span>
        );
      },
    },
    {
      field: 'departments',
      headerName: 'Departments',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const departments = getAllDepartments(params.row.roles);
        return departments.length > 0 ? (
          <button
            className="tooltip-trigger inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold truncate hover:bg-purple-200 transition-colors"
            title="Click to view departments"
            onClick={(e) => {
              e.stopPropagation();
              showTooltip(
                <div>
                  <h4 className="font-bold mb-2">Departments:</h4>
                  <ul className="list-disc list-inside max-h-40 overflow-y-auto">
                    {departments.map((dept, index) => (
                      <li key={index} className="truncate">
                        {dept.name}
                      </li>
                    ))}
                  </ul>
                </div>,
                e,
              );
            }}
          >
            {departments.length} Department{departments.length !== 1 ? 's' : ''}
          </button>
        ) : (
          <span className="text-gray-500">--</span>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <div className="flex space-x-2 m-1">
          <CustomButton
            variant="secondary"
            click={() => navigate(`/users/edit/${params.row.id}`)}
            text={<IconEdit className="h-5 w-5 text-white" />}
            disabled={actionsLoading}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
          />
          <CustomButton
            variant="danger"
            click={() => {
              setDeleteItemId(params.id);
              setModalOpen(true);
            }}
            disabled={actionsLoading || params.row.status == 'Inactive'}
            text={<IconTrash className="h-5 w-5 text-white" />}
            className="p-2 bg-red-600 hover:bg-red-700 rounded"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="bg-gray-50">
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <CustomCard className="bg-white shadow-lg rounded-lg">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div className="max-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300"
                placeholder="Search by username, email, status, role, department"
              />
            </div>
            <Link to="/users/createNew">
              <CustomButton
                text="Add User"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              />
            </Link>
          </div>

          <div className="overflow-x-auto relative">
            <DataGrid
              rows={filteredData}
              columns={columns}
              pageSize={10}
              disableSelectionOnClick
              pagination
              rowsPerPageOptions={[10]}
              className="bg-white border border-gray-200"
              getRowId={(row) => row.id || row._id}
              getRowClassName={(params) =>
                params.row.status === 'Inactive'
                  ? 'bg-red-100 text-gray-500'
                  : ''
              }

              // sx={{
              //   '& .MuiDataGrid-columnHeaders': {
              //     backgroundColor: '#f3f4f6',
              //     fontWeight: 'bold',
              //     borderBottom: '2px solid #e5e7eb',
              //   },
              //   '& .MuiDataGrid-cell': {
              //     padding: '12px',
              //     alignItems: 'center',
              //     display: 'flex',
              //   },
              //   '& .MuiDataGrid-row': {
              //     minHeight: '60px',
              //     '&:hover': {
              //       backgroundColor: '#f9fafb',
              //     },
              //   },
              //   '& .MuiDataGrid-columnHeaderTitle': {
              //     fontSize: '0.9rem',
              //     fontWeight: '600',
              //     color: '#1f2937',
              //   },
              // }}
            />

            {/* Custom Tooltip */}
            {tooltipContent && (
              <div
                ref={tooltipRef}
                className="custom-tooltip fixed z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs max-h-60 overflow-hidden"
                style={{
                  left: `${tooltipPosition.x}px`,
                  top: `${tooltipPosition.y}px`,
                  transform:
                    tooltipPosition.direction === 'above'
                      ? 'translateY(-100%)'
                      : 'none',
                }}
              >
                <button
                  className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 z-10 bg-white rounded-full w-5 h-5 flex items-center justify-center"
                  onClick={hideTooltip}
                >
                  ×
                </button>
                <div className="overflow-y-auto max-h-52">{tooltipContent}</div>
              </div>
            )}
          </div>

          <DeleteConfirmationModal
            isOpen={isModalOpen}
            onClose={deleteModalClose}
            onConfirm={() => handleDelete(deleteItemId)}
            isLoading={actionsLoading}
            deactive={true}
          />
        </CustomCard>
      )}
    </div>
  );
};

export default UsersList;
