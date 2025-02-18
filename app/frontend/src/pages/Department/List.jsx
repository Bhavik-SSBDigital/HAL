import {
  Box,
  Button,
  CircularProgress,
  Modal,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IconTrash, IconEdit, IconEye } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import ShowWorkflow from '../../common/Workflow/ShowWorkflow';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import {
  getDepartments,
  getRolesHierarchyInDepartment,
  getDepartmentsHierarchy,
} from '../../common/Apis';
import styles from './List.module.css';
import TreeGraph from '../../components/TreeGraph';

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

  useEffect(() => {
    getHierarchy();
    fetchDepartments();
  }, []);

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
      console.log(response.data.data);
      setSelectedDepartmentData(response.data.data);
      setHierarchyModalOpen(true);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error?.response?.data?.message);
    }
  };

  const filteredData = departments.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <Stack className={styles.container}>
          <Stack
            justifyContent={{ xs: 'center', sm: 'space-between' }}
            flexDirection={'row'}
            flexWrap={'wrap'}
            gap={1}
            mb={1}
          >
            <Stack
              gap={1}
              sx={{
                bgcolor: '#EEEEEE',
                p: 0.6,
                borderRadius: '8px',
              }}
              flexDirection={'row'}
            >
              <div
                onClick={() => setSelectedTab('list')}
                className={`${styles.tab} ${
                  selectedTab == 'list' && styles.selectedTab
                }`}
              >
                <Typography
                  variant="body1"
                  color="initial"
                  textAlign={'center'}
                >
                  List
                </Typography>
              </div>
              <div
                onClick={() => setSelectedTab('tree')}
                className={`${styles.tab} ${
                  selectedTab == 'tree' && styles.selectedTab
                }`}
              >
                <Typography
                  variant="body1"
                  color="initial"
                  textAlign={'center'}
                >
                  Tree
                </Typography>
              </div>
            </Stack>
          </Stack>
          {selectedTab == 'tree' ? (
            <TreeGraph data={data} loading={isLoading} />
          ) : (
            <Box sx={{ width: '100%' }}>
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
                  <Button variant="contained" sx={{ borderRadius: '8px' }}>
                    Create Department
                  </Button>
                </Link>
              </Stack>
              {filteredData.length > 0 ? (
                filteredData.map((i) => (
                  <Accordion key={i._id} elevation={1} sx={{ marginBottom: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack
                        flexDirection="row"
                        justifyContent="space-between"
                        width="100%"
                      >
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            {i.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Head: {i.head || 'N/A'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Roles Hierarchy">
                            <IconButton
                              onClick={() => handleViewHierarchy(i.id)}
                            >
                              <IconEye color="#2860e0" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              onClick={() =>
                                navigate(`/departments/edit/${i.id}`)
                              }
                            >
                              <IconEdit color="#2860e0" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              onClick={() => {
                                setDeleteItemId(i._id);
                                setModalOpen(true);
                              }}
                            >
                              <IconTrash color="red" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      {i.workFlow ? (
                        <ShowWorkflow workFlow={i.workFlow} />
                      ) : (
                        <Typography color="blue">
                          Please Assign WorkFlow
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))
              ) : (
                <Typography variant="h6" align="center" color="textSecondary">
                  No departments found
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      )}

      {/* Hierarchy Modal */}
      <Dialog
        open={isHierarchyModalOpen}
        fullWidth
        maxWidth="md"
        onClose={() => setHierarchyModalOpen(false)}
      >
        <div>
          <TreeGraph data={selectedDepartmentData} loading={isLoading} />
        </div>
      </Dialog>
    </>
  );
}