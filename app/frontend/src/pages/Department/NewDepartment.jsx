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
} from '@mui/material';
import axios from 'axios';
import { FaRegTrashAlt } from "react-icons/fa";

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
import ComponentLoader from "../../common/Loader/ComponentLoader";

export default function NewDepartment(props) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { id } = useParams();

  const [editObject, setEditObject] = useState({});
  const initialUser = {
    department: '',
    branch: '',
    head: '',
    workFlow: [],
  };
  const [formData, setFormData] = useState({ ...initialUser });
  const [flow, setFlow] = useState({ work: '', step: '' });
  const [usersOnStep, setUsersOnStep] = useState([]);
  const [userSelection, setUserSelection] = useState({ user: '', role: '' });

  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [works, setWorks] = useState();
  const [newWork, setNewWork] = useState(false);
  const [users, setUsers] = useState();
  const [finalBranch, setFinalBranch] = useState('');
  const [openH, setOpenH] = useState(false);
  const [userBranch, setUserBranch] = useState('');
  const handleFlowChange = (event) => {
    const { name, value } = event.target;
    setFlow((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  const deleteStepUser = (index) => {
    const updatedUsersOnStep = usersOnStep.filter((_, i) => i !== index);
    setUsersOnStep(updatedUsersOnStep);
  };

  const getBranches = async () => {
    try {
      const url = backendUrl + '/getAllBranches';
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setBranches(data.branches);
      return data.branches;
    } catch (error) {
      console.error('unable to fetch branches');
    }
  };
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const getRoles = async (id) => {
    setFieldsLoading(true)
    const urlRole = backendUrl + '/getRolesInBranch/';
    try {

      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await axios.post(urlRole + `${id}`, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setRoles(data.roles);
    } catch {
      console.error("Error getting roles for selected branch");
    } finally {
      setFieldsLoading(false);
    }
  };
  const getWorks = async () => {
    try {
      const url = backendUrl + '/getWorks';
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setWorks(data.works);
    } catch (error) {
      console.log(error);
    }
  };
  const getUsers = async (branchValue, roleValue) => {
    // const branchValue = value ? headInfo.branch : userBranch;
    // const roleValue = value ? headInfo.role : flow.role;
    setFieldsLoading(true);
    try {
      const url = backendUrl + '/getUsersByRoleInBranch';
      const accessToken = sessionStorage.getItem('accessToken');
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
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      setUsers(data.users);
    } catch (error) {
      alert(error);
    } finally {
      setFieldsLoading(false);
    }
  };
  const handleInputChange = (event) => {
    const { name, value } = event.target;
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
  const navigate = useNavigate();
  const handleSubmit = async (id) => {
    const finalData = {
      department: formData.department,
      branch: formData.branch,
      workFlow: formData.workFlow,
      head: formData.head,
    };
    setLoading(true);
    const url =
      Object.keys(editObject).length > 0
        ? backendUrl + `/editDepartment/${id}`
        : backendUrl + '/addDepartment';
    try {
      const response = await axios.post(
        url,
        { ...finalData },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );

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
    if (formData.workFlow.length === 0 && flow.work !== 'upload') {
      toast.info('First step should be upload');
      return;
    }
    if (formData.workFlow.length === 0) {
      setFinalBranch(formData.branch);
    }
    if (usersOnStep.length > 0 && flow.work) {
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
      setFlow({ work: '', step: '' });
      // setUserBranch('');
      setUsersOnStep([]);
    } else {
      toast.info('Please provide all inputs!');
    }
  };
  // multiple user on same step
  const handleUserSelection = (event) => {
    const { name, value } = event.target;
    if (name === 'role') {
      setUserSelection((prev) => ({ ...prev, user: '' }));
      setUsers([]);
    }
    setUserSelection((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleUserAdd = () => {
    if (!userSelection.user || !userSelection.role) {
      toast.info('Please select user & role');
      return;
    }
    // if (usersOnStep.length > 0) {
    //   toast.info(
    //     'Multi user functionality is not working currently please add step',
    //   );
    //   return;
    // }
    const newUser = {
      user: userSelection.user,
      role: userSelection.role,
    };
    // Update the state with the new user object
    setUsersOnStep((prevData) => [...prevData, newUser]);
    setUserSelection({ user: '', role: '' });
  };

  const handleDelete = (index) => {
    const updatedWorkFlow = [...formData.workFlow];
    updatedWorkFlow.splice(index, 1);
    setFormData({
      ...formData,
      workFlow: updatedWorkFlow.map((step, i) => ({ ...step, step: i + 1 })),
    });
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
  function formatUserNames(users) {
    if (!users || users.length === 0) {
      return "No users";
    } else if (users.length === 1) {
      return users[0].user;
    } else {
      return users[0].user + ", ...";
    }
  }
  const renderWorkFlow = () => {
    return (
      <Stack
        flexDirection="row"
        flexWrap="wrap"
        rowGap={3}
        columnGap={1}
        justifyContent="center"
        sx={{ marginBottom: '40px', marginTop: '10px' }}
      >
        {formData.workFlow.map((item, index) => (
          <>
            <Paper
              key={index + 1}
              elevation={3}
              sx={{
                position: 'relative',
                width: { xs: 230, sm: 250, md: 280 },
                borderRadius: '15px',
                backgroundColor: 'white',
              }}
            >
              <IconButton
                sx={{ position: 'absolute', right: '0px', top: '0px' }}
                onClick={() => handleDelete(index)}
              >
                <CloseIcon />
              </IconButton>
              <h3 className={styles.workflowIndex}>{index + 1}</h3>
              <div className={styles.workflowContent}>
                <div className={styles.workFlowElements}>
                  <p style={{ width: '60px' }}>
                    <strong>Work :</strong>
                  </p>
                  <p>{item?.work}</p>
                </div>
                <div className={styles.workFlowElements}>
                  <p style={{ width: '60px' }}>
                    <strong>Users :</strong>
                  </p>
                  <Tooltip
                    title={
                      item?.users?.length > 1
                        ? item.users.map((user) => user.user).join(", ")
                        : null
                    }
                  >
                    <p>{formatUserNames(item?.users)}</p>
                  </Tooltip>
                </div>
              </div>
            </Paper>
          </>
        ))}
      </Stack>
    );
  };
  const getEditDetails = async () => {
    setLoading(true);
    try {
      const url = backendUrl + `/getDepartment/${id}`
      const res = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`
        }
      })
      if (res.status === 200) {
        setEditObject(res.data.department[0]);
        setFormData(res.data.department[0]);
      }
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    getBranches();
    getWorks();
    if (id) {
      getEditDetails();
    }
    const fetchData = async () => {
      const branch = await getBranches();
      if (Object.keys(editObject).length > 0) {
        setFormData(editObject);
        const { _id } = branch.find((data) => data.name === editObject.branch);
        getRoles(_id);
      }
    };
    fetchData();
  }, []);
  useEffect(() => {
    if (userSelection.role && userBranch) {
      getUsers(userBranch, userSelection.role);
    }
  }, [userSelection.role]);
  useEffect(() => {
    setFlow((prevFlow) => ({
      ...prevFlow,
      step: formData?.workFlow?.length + 1,
    }));
  }, [formData?.workFlow]);

  return (
    <>
      {loading ? <ComponentLoader /> : <div className={styles.formContainer} style={{
        border: "1px solid lightgray",
        borderRadius: "10px",
        boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px'
      }}>
        <Grid container spacing={3} sx={{ marginBottom: '20px' }}>
          <Grid item xs={12}>
            <Typography variant="body1">Department Branch:</Typography>
            <FormControl fullWidth variant="outlined">
              <Select
                name="branch"
                size="small"

                value={formData?.branch}
                sx={{ backgroundColor: "whitesmoke" }}
                onChange={handleInputChange}
              >
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
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body1">Department Name:</Typography>
            <TextField
              fullWidth
              size="small"
              sx={{ backgroundColor: "whitesmoke" }}
              variant="outlined"
              name="department"
              value={formData?.department}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body1">Department Head:</Typography>
            <TextField
              fullWidth
              sx={{ backgroundColor: "whitesmoke" }}
              size="small"
              variant="outlined"
              name="head"
              disabled
              value={formData.head}
            />
          </Grid>
          <Grid
            item
            sm={12}
            sx={{
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Button onClick={() => setOpenH(true)}>
              Select department head
            </Button>
          </Grid>
          <Dialog onClose={handleClose} open={openH} sx={{ backdropFilter: "blur(8px)" }}>
            <DialogTitle
              textAlign="center"
              sx={{ backgroundColor: '#86A7FC', margin: '5px' }}
            >
              SELECT HEAD
            </DialogTitle>
            <Box width={300} padding={1}>
              <Typography variant="body1">Head Branch:</Typography>
              <FormControl fullWidth variant="outlined">
                <Select
                  size="small"
                  name="branch"
                  onChange={handleSelectHead}
                >
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
                <Select name="role" size='small' onChange={handleSelectHead}>
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
                <Select name="head" size='small' onChange={handleSelectHead}>
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
        </Grid>
        <Typography
          variant="h6"
          sx={{ textAlign: 'center', mb: 4 }}
          gutterBottom
        >
          Work Flow :
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="body1">
              {/* {newWork ? "name of work" : "Work"}: */}
              Work
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: '3px' }}>
              {newWork ? (
                <TextField fullWidth variant="outlined" name="workName" />
              ) : (
                <FormControl fullWidth variant="outlined">
                  <Select
                    name="work"
                    size='small'
                    sx={{ backgroundColor: "whitesmoke" }}
                    fullWidth
                    value={flow && flow.work}
                    onChange={handleFlowChange}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {works?.map((data) => (
                      <MenuItem key={data.name} value={data.name}>
                        {data.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {/* <Button
                  variant="contained"
                  size="small"
                  sx={{ borderRadius: "10px" }}
                  onClick={() => (newWork ? handleAddWork() : setNewWork(true))}
                >
                  {newWork ? "ADD" : "ADD NEW?"}
                </Button> */}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body1">Step No:</Typography>
            <FormControl fullWidth variant="outlined">
              <Select
                name="step"
                size='small'
                sx={{ backgroundColor: "whitesmoke" }}
                onChange={handleFlowChange}
                value={+flow.step ? +flow.step : formData.workFlow.length + 1}
              >
                {Array.from(
                  { length: formData?.workFlow?.length + 1 },
                  (_, index) => (
                    <MenuItem key={index} value={index + 1}>
                      {index + 1}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ width: '100%', padding: '20px', display: 'flex', gap: "10px", flexDirection: "column", border: '1px solid lightgray' }}>
              {/* <Grid item xs={12}> */}
              <Typography variant="body1">User Branch:</Typography>
              <FormControl fullWidth variant="outlined">
                <Select
                  name="userBranch"
                  size='small'
                  sx={{ backgroundColor: "whitesmoke" }}
                  value={userBranch}
                  onChange={handleInputChange}
                >
                  <MenuItem value="" disabled>
                    <em>None</em>
                  </MenuItem>
                  {branches?.map((data) => (
                    <MenuItem key={data.name} value={data.name}>
                      {data.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* </Grid> */}
              {/* <Grid item xs={12}> */}
              <Typography variant="body1">Actor Role:</Typography>
              <FormControl fullWidth variant="outlined">
                <Select
                  name="role"
                  size='small'
                  disabled={fieldsLoading}
                  sx={{ backgroundColor: "whitesmoke" }}
                  value={userSelection.role}
                  onChange={handleUserSelection}
                >
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
              {/* </Grid> */}
              {/* <Grid item xs={12}> */}
              <Typography variant="body1">User:</Typography>
              <FormControl fullWidth variant="outlined">
                <Select
                  name="user"
                  size='small'
                  sx={{ backgroundColor: "whitesmoke" }}
                  value={userSelection.user}
                  disabled={fieldsLoading}
                  onChange={handleUserSelection}
                >
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
              <Button
                variant='outlined'
                sx={{ mt: 1, width: '150px', mx: 'auto' }}
                onClick={handleUserAdd}
              >
                Add User
              </Button>
              {/* </Grid> */}
              {usersOnStep.length ? (
                <div style={{ margin: '30px auto', width: '100%' }}>
                  <Typography variant="h6" textAlign="center">
                    This step users :
                  </Typography>
                  {/* {usersOnStep.map((obj, index) => (
                <p key={index} style={{ display: "inline" }}>
                  {obj.user}/{obj.role}
                  {index !== usersOnStep.length - 1 ? ", " : ""}
                </p>
              ))} */}
                  <TableContainer
                    sx={{ maxHeight: '200px', overflow: 'auto', width: '100%', border: '1px solid lightgray' }}
                  >
                    <Table
                      size="small"
                      aria-label="a dense table"
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>Sr No</TableCell>
                          <TableCell>Username</TableCell>
                          <TableCell>User Role</TableCell>
                          <TableCell>Delete</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {usersOnStep.map((row, index) => (
                          <TableRow
                            key={index}
                          // sx={{
                          //   "&:last-child td, &:last-child th": { border: 0 },
                          // }}
                          >
                            <TableCell component="th" scope="row">
                              {index + 1}
                            </TableCell>
                            <TableCell component="th" scope="row">
                              {row.user}
                            </TableCell>
                            <TableCell component="th" scope="row">
                              {row.role}
                            </TableCell>
                            <TableCell component="th" scope="row">
                              <Button onClick={() => deleteStepUser(index)}><FaRegTrashAlt /> </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              ) : null}
            </Paper>
          </Grid>
        </Grid>

        {usersOnStep.length && flow.work && flow.step ? (
          <Stack
            sx={{ marginTop: '20px' }}
            gap={1}
            flexDirection="row"
            justifyContent="center"
          >
            <Box>
              <Button
                variant="contained"
                onClick={handleWorkFlow}
                sx={{ backgroundColor: '#40A2E3' }}
              >
                Add Step
              </Button>
            </Box>
          </Stack>
        ) : null}
        {formData?.workFlow?.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 4, mt: 4 }} gutterBottom>
              Steps :
            </Typography>
            {renderWorkFlow()}
          </Box>
        )}
        {formData?.branch &&
          formData?.head &&
          formData?.department &&
          formData?.workFlow?.length > 0 && (
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
      </div>}
    </>
  );
}
