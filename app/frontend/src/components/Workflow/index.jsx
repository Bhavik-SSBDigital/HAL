import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid2,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import styles from './Workflow.module.css';
import { IconX } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function Workflow({
  workFlow,
  setWorkFLow,
  workFlowLength,
  handleWorkFlow,
  flow,
  setFlow,
  usersOnStep,
  setUsersOnStep,
  branches,
  fullState,
}) {
  // variable
  const token = sessionStorage.getItem('accessToken');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // states
  const [works, setWorks] = useState([]);
  const [userSelection, setUserSelection] = useState({ user: '', role: '' });
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userBranch, setUserBranch] = useState('');
  const [allBranches, setAllBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  // handlers
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
  const onUserDialogClose = () => {
    setUserDialogOpen(false);
  };
  function formatUserNames(users) {
    if (!users || users.length === 0) {
      return 'No users';
    } else if (users.length === 1) {
      return users[0].user;
    } else {
      return users[0].user + ', ...';
    }
  }
  const handleDelete = (index) => {
    const updatedWorkFlow = [...workFlow];
    updatedWorkFlow.splice(index, 1);
    setWorkFLow({
      ...fullState,
      workFlow: updatedWorkFlow.map((step, i) => ({ ...step, step: i + 1 })),
    });
  };
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'branch') {
      if (!userBranch) {
        setUserBranch(value);
        if (value) {
          const { _id } = allBranches.find((data) => data.name === value);
          getRoles(_id);
        }
      }
    }
    if (name === 'userBranch') {
      if (value) {
        const { _id } = allBranches.find((data) => data.name === value);
        setRoles([]);
        getRoles(_id);
      }
      setUserSelection({ user: '', role: '' });
      setUserBranch(value);
    }
  };
  const handleUserSelection = (event) => {
    const { name, value } = event.target;
    if (name === 'role') {
      setUserSelection((prev) => ({ ...prev, user: '' }));
      getUsers(value);
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
    const newUser = {
      user: userSelection.user,
      role: userSelection.role,
    };
    // Update the state with the new user object
    setUsersOnStep((prevData) => [...prevData, newUser]);
    setUserSelection({ user: '', role: '' });
    setUserDialogOpen(false);
  };

  // network calls
  const getWorks = async () => {
    try {
      const url = backendUrl + '/getWorks';
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setWorks(data.works);
    } catch (error) {
      console.log(error);
    }
  };
  const getBranches = async () => {
    try {
      const url = backendUrl + '/getAllBranches';
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAllBranches(data.branches);
      return data.branches;
    } catch (error) {
      console.error('unable to fetch branches');
    }
  };
  const getUsers = async (role) => {
    setFieldsLoading(true);
    try {
      const url = backendUrl + '/getUsersByRoleInBranch';
      const { _id } = allBranches?.find((item) => item.name === userBranch);
      const id = roles.find((item) => item.role === role);
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
      toast.error(error);
    } finally {
      setFieldsLoading(false);
    }
  };
  const getRoles = async (id) => {
    setFieldsLoading(true);
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
    } finally {
      setFieldsLoading(false);
    }
  };

  useEffect(() => {
    getWorks();
    getBranches();
  }, []);
  return (
    <div>
      <Grid2 container spacing={3} p={2}>
        <Grid2 item size={{ xs: 6 }}>
          <Typography variant="body1">Work</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: '3px' }}>
            <FormControl fullWidth variant="outlined">
              <Select
                name="work"
                size="small"
                sx={{ backgroundColor: 'whitesmoke' }}
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
          </Box>
        </Grid2>
        <Grid2 item size={{ xs: 6 }}>
          <Typography variant="body1">Step No:</Typography>
          <FormControl fullWidth variant="outlined">
            <Select
              name="step"
              size="small"
              sx={{ backgroundColor: 'whitesmoke' }}
              onChange={handleFlowChange}
              value={+flow.step ? +flow.step : workFlowLength + 1}
            >
              {Array.from({ length: workFlowLength + 1 }, (_, index) => (
                <MenuItem key={index} value={index + 1}>
                  {index + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid2>
        <Grid2 item size={{ xs: 12 }}>
          <div>
            <Typography variant="h6">This step users :</Typography>
            <TableContainer
              sx={{
                maxHeight: '300px',
                overflow: 'auto',
                width: '100%',
                borderRadius: '5px',
                border: '1px solid lightgray',
              }}
            >
              <Table size="small" aria-label="a dense table">
                <TableHead>
                  <TableRow sx={{ height: '50px' }}>
                    <TableCell>Sr No</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>User Role</TableCell>
                    <TableCell>Delete</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usersOnStep.length ? (
                    usersOnStep.map((row, index) => (
                      <TableRow key={index}>
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
                          <Button onClick={() => deleteStepUser(index)}>
                            <FaRegTrashAlt color="red" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4}>Please add users</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={4} align="right">
                      <Button
                        variant="contained"
                        color="secondary"
                        size="small"
                        onClick={() => setUserDialogOpen(true)}
                      >
                        Add Users
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </Grid2>
        <Grid2 item size={{ xs: 12 }}>
          <Box sx={{ mx: 'auto', width: 'fit-content' }}>
            <Button variant="contained" onClick={handleWorkFlow}>
              Add Step
            </Button>
          </Box>
        </Grid2>
      </Grid2>
      <Stack
        flexDirection="row"
        flexWrap="wrap"
        rowGap={3}
        columnGap={1}
        justifyContent="center"
        sx={{ marginBottom: '20px', marginTop: '40px' }}
      >
        {workFlow?.map((item, index) => (
          <>
            <Paper
              key={index + 1}
              elevation={3}
              sx={{
                position: 'relative',
                width: { xs: 230, sm: 250, md: 280 },
                border: "1px solid lightgray",
                borderRadius: '15px',
                backgroundColor: 'white',
              }}
            >
              <IconButton
                sx={{
                  position: 'absolute',
                  right: '0px',
                  top: '0px',
                }}
                onClick={() => handleDelete(index)}
              >
                <IconX />
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
                        ? item.users.map((user) => user.user).join(', ')
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
      <Dialog
        maxWidth="sm"
        fullWidth
        open={userDialogOpen}
        onClose={onUserDialogClose}
      >
        <DialogTitle>Add users</DialogTitle>
        <DialogContent>
          <Stack gap={1}>
            <Typography variant="body1">User Branch:</Typography>
            <FormControl fullWidth variant="outlined">
              <Select
                name="userBranch"
                size="small"
                fullWidth
                sx={{ backgroundColor: 'whitesmoke' }}
                value={userBranch}
                onChange={handleInputChange}
              >
                <MenuItem value="" disabled>
                  <em>None</em>
                </MenuItem>
                {allBranches?.map((data) => (
                  <MenuItem key={data.name} value={data.name}>
                    {data.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body1">Actor Role:</Typography>
            <FormControl fullWidth variant="outlined">
              <Select
                name="role"
                fullWidth
                size="small"
                disabled={fieldsLoading}
                sx={{ backgroundColor: 'whitesmoke' }}
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
            <Typography variant="body1">User:</Typography>
            <FormControl fullWidth variant="outlined">
              <Select
                name="user"
                fullWidth
                size="small"
                sx={{ backgroundColor: 'whitesmoke' }}
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleUserAdd}>
            Add User
          </Button>
        </DialogActions>
      </Dialog>
      {/* <Button
        variant="contained"
        onClick={handleNextClick}
        sx={{ display: 'block', mx: 'auto' }}
      >
        Process
      </Button> */}
    </div>
  );
}
