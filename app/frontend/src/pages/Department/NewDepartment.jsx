import React, { useEffect, useState } from 'react';
import {
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Stack,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogActions,
  Tooltip,
  Grid2,
} from '@mui/material';
import axios from 'axios';
import { FaRegTrashAlt } from 'react-icons/fa';

import CloseIcon from '@mui/icons-material/Close';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
// import Sidedrawer from '../drawer/Sidedrawer';
import styles from './NewDepartment.module.css';
import { IconArrowRight } from '@tabler/icons-react';
import { toast } from 'react-toastify';
// import useStoreData, { sessionData } from '../../Store';
// table
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import Workflow from '../../components/Workflow';

export default function NewDepartment(props) {
  const token = sessionStorage.getItem('accessToken');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { id } = useParams();
  const location = useLocation();

  const [editObject, setEditObject] = useState({});
  const initialUser = {
    code: null,
    department: null,
    parentDepartment: null,
    head: null,
    type: 'department',
    workFlow: null,
    isHeadOffice: false,
    status: 'Active',
  };
  const [formData, setFormData] = useState({ ...initialUser });
  const [flow, setFlow] = useState({ step: '' });
  const [usersOnStep, setUsersOnStep] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newWork, setNewWork] = useState(false);
  const [finalBranch, setFinalBranch] = useState('');
  const [openH, setOpenH] = useState(false);

  // checking
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    if (name !== 'userBranch') {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
    if (name === 'branch') {
      if (!userBranch) {
        setUserBranch(value);
        if (value) {
          const { _id } = branches.find((data) => data.name === value);
          getRoles(_id);
        }
      }
    }
    if (name === 'userBranch') {
      if (value) {
        const { _id } = branches.find((data) => data.name === value);
        setRoles([]);
        getRoles(_id);
      }
      setUserSelection({ user: '', role: '' });
      setUserBranch(value);
    }
  };
  const getRoles = async (id) => {
    // setFieldsLoading(true);
    const urlRole = backendUrl + '/getRolesInBranch/';
    try {
      const { data } = await axios.post(urlRole + `${id}`, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRoles(data.roles);
    } catch {
      console.error('Error getting roles for selected branch');
    }
  };

  // --------------------
  const getBranches = async () => {
    try {
      const url = backendUrl + '/getAllBranches';

      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setBranches(data.branches);
      return data.branches;
    } catch (error) {
      console.error('unable to fetch branches');
    }
  };
  const [departments, setDepartments] = useState([]);
  const getDepartments = async () => {
    const url = backendUrl + '/getDepartmentNames';
    try {
      const res = await axios({
        url: url,
        method: 'get',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(res?.data?.names);
    } catch (error) {
      console.log(error);
    }
  };

  const getUsers = async (branchValue, roleValue) => {
    // const branchValue = value ? headInfo.branch : userBranch;
    // const roleValue = value ? headInfo.role : flow.role;
    // setFieldsLoading(true);
    try {
      const url = backendUrl + '/getUsersByRoleInBranch';

      const { _id } = branches.find((item) => item.name === branchValue);
      const id = roles.find((item) => item.role === roleValue);
      const { data } = await axios.post(
        url,
        {
          branchId: _id,
          roleId: id._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setUsers(data.users);
    } catch (error) {
      alert(error);
    }
  };
  const navigate = useNavigate();
  const handleSubmit = async (id) => {
    setLoading(true);
    const url =
      Object.keys(editObject).length > 0
        ? backendUrl + `/editDepartment/${id}`
        : backendUrl + '/addDepartment';
    try {
      const response = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        setEditObject({});
        Object.keys(editObject).length > 0
          ? toast.success('Department edited')
          : toast.success('Department created');
        setLoading(false);
        setFormData({ ...initialUser });
        navigate('/departments/list');
      }
    } catch (error) {
      setLoading(false);
      Object.keys(editObject).length > 0
        ? toast.error('Not able to edit department')
        : toast.error('Not able to add department');
    }
  };
  const handleWorkFlow = () => {
    if (formData.workFlow.length === 0) {
      setFinalBranch(formData.branch);
    }
    if (usersOnStep.length > 0) {
      setFormData((prev) => {
        const updatedWorkFlow = [...prev.workFlow];

        if (flow.step > prev.workFlow.length) {
          // If step is greater than the length, insert at the end
          updatedWorkFlow.push({ ...flow, users: usersOnStep });
        } else {
          updatedWorkFlow.splice(flow.step - 1, 0, {
            ...flow,
            users: usersOnStep,
          });

          // Update step numbers for all items after the insertion point
          for (let i = flow.step; i < updatedWorkFlow.length; i++) {
            updatedWorkFlow[i].step++;
          }
        }

        return {
          ...prev,
          workFlow: updatedWorkFlow,
        };
      });
      setFlow({ step: '' });
      // setUserBranch('');
      setUsersOnStep([]);
    } else {
      toast.info('Please provide all inputs!');
    }
  };
  const handleAddWork = () => {
    setNewWork(false);
  };
  const handleClose = () => {
    setOpenH(false);
  };
  const [headInfo, setHeadInfo] = useState({ branch: '', role: '' });
  const handleSelectHead = (e) => {
    const { name, value } = e.target;
    if (name === 'branch') {
      if (value) {
        const { _id } = branches.find((data) => data.name === value);
        getRoles(_id);
      }
      setHeadInfo((prev) => ({
        ...prev,
        branch: value,
      }));
    } else if (name === 'role') {
      setHeadInfo((prev) => ({
        ...prev,
        role: value,
      }));
      getUsers(headInfo.branch, value);
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };
  const getEditDetails = async () => {
    setLoading(true);
    try {
      const url = backendUrl + `/getDepartment/${id}`;
      const res = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 200) {
        setEditObject(res.data.department[0]);
        setFormData(res.data.department[0]);
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getBranches();
    getDepartments();
    if (id) {
      getEditDetails();
    }
  }, []);
  useEffect(() => {
    setFlow((prevFlow) => ({
      ...prevFlow,
      step: formData?.workFlow?.length + 1,
    }));
  }, [formData?.workFlow]);
  useEffect(() => {
    setFormData(initialUser);
  }, [location.pathname]);

  return (
    <>
      {loading ? (
        <ComponentLoader />
      ) : (
        <div
          className={styles.formContainer}
          style={{
            border: '1px solid lightgray',
            borderRadius: '10px',
            boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
          }}
        >
          <Grid2 container spacing={3} sx={{ marginBottom: '20px' }}>
            <Grid2 item size={{ xs: 12, md: 6 }}>
              <Typography variant="body1">Parent Department:</Typography>
              <FormControl fullWidth variant="outlined">
                <Select
                  name="parentDepartment"
                  value={formData?.branch}
                  sx={{ backgroundColor: 'whitesmoke' }}
                  onChange={handleInputChange}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {departments?.map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 item size={{ xs: 12, md: 6 }}>
              <Typography variant="body1">Department Code:</Typography>
              <TextField
                fullWidth
                sx={{ backgroundColor: 'whitesmoke' }}
                variant="outlined"
                name="code"
                value={formData?.code}
                onChange={handleInputChange}
              />
            </Grid2>
            <Grid2 item size={{ xs: 12, md: 6 }}>
              <Typography variant="body1">Department Name:</Typography>
              <TextField
                fullWidth
                sx={{ backgroundColor: 'whitesmoke' }}
                variant="outlined"
                name="department"
                value={formData?.department}
                onChange={handleInputChange}
              />
            </Grid2>
            <Grid2 item size={{ xs: 12, md: 6 }}>
              <Typography variant="body1">Department Head:</Typography>
              <TextField
                fullWidth
                sx={{ backgroundColor: 'whitesmoke' }}
                variant="outlined"
                name="head"
                disabled
                value={formData.head}
              />
            </Grid2>
            <Grid2
              item
              size={{ xs: 12 }}
              sx={{
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Button variant="contained" onClick={() => setOpenH(true)}>
                Select department head
              </Button>
            </Grid2>
            <Dialog onClose={handleClose} open={openH}>
              <DialogTitle
                textAlign="center"
                sx={{
                  backgroundColor: 'var(--themeColor)',
                  margin: '5px',
                  color: 'white',
                }}
              >
                Select Head
              </DialogTitle>
              <Box width={300} padding={1}>
                <Typography variant="body1">Head Branch:</Typography>
                <FormControl fullWidth variant="outlined">
                  <Select name="branch" onChange={handleSelectHead}>
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {branches?.map((data) => (
                      <MenuItem key={data.name} value={data.name}>
                        {data.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box width={300} padding={1}>
                <Typography variant="body1">Actor Role:</Typography>
                <FormControl fullWidth variant="outlined">
                  <Select name="role" onChange={handleSelectHead}>
                    <MenuItem value="" disabled>
                      <em>None</em>
                    </MenuItem>
                    {roles?.map((data) => (
                      <MenuItem key={data.role} value={data.role}>
                        {data.role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box width={300} padding={1}>
                <Typography variant="body1">Head:</Typography>
                <FormControl fullWidth variant="outlined">
                  <Select name="head" onChange={handleSelectHead}>
                    <MenuItem value="" disabled>
                      <em>None</em>
                    </MenuItem>
                    {users?.map((data) => (
                      <MenuItem key={data.username} value={data.username}>
                        {data.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <DialogActions
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Button
                  variant="contained"
                  onClick={() => setOpenH(false)}
                  sx={{
                    backgroundColor: '#65B741',
                    ':hover': {
                      backgroundColor: 'darkgreen',
                    },
                  }}
                >
                  Save
                </Button>
              </DialogActions>
            </Dialog>
          </Grid2>
          <Divider sx={{ mb: 2 }} />
          <Typography
            variant="h6"
            sx={{ textAlign: 'center', mb: 4 }}
            gutterBottom
          >
            Work Flow :
          </Typography>
          <Workflow
            workFlow={formData?.workFlow}
            workFlowLength={formData?.workFlow?.length || 0}
            handleWorkFlow={handleWorkFlow}
            setWorkFLow={setFormData}
            flow={flow}
            setFlow={setFlow}
            usersOnStep={usersOnStep}
            setUsersOnStep={setUsersOnStep}
            branches={branches}
            setBranches={setBranches}
            fullState={formData}
          />
          {true && (
            <Stack
              flexDirection="row"
              gap={2}
              justifyContent="center"
              sx={{ margin: 1 }}
            >
              <Box>
                <Button
                  variant="contained"
                  disabled={loading}
                  onClick={
                    Object.keys(editObject).length > 0
                      ? () => handleSubmit(formData._id)
                      : () => handleSubmit()
                  }
                  sx={{
                    backgroundColor: '#65B741',
                    ':hover': {
                      backgroundColor: 'darkgreen',
                    },
                    minWidth: '150px',
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} /> // Show this when loading is true
                  ) : Object.keys(editObject).length > 0 ? (
                    'Save'
                  ) : (
                    'ADD DEPARTMENT'
                  )}
                </Button>
              </Box>
            </Stack>
          )}
        </div>
      )}
    </>
  );
}
