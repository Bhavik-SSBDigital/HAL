import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid2,
  IconButton,
  ListItemText,
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import React, { useEffect, useState } from 'react';
import styles from './InitiateForm.module.css';
import axios from 'axios';
import CheckboxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckboxIcon from '@mui/icons-material/CheckBox';
import { IconCircle, IconGradienter, IconX } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import InitiatProcess from './InitiateProcess';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { FaRegTrashAlt } from 'react-icons/fa';

export default function InitiateForm() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState({});
  const [workFlow, setWorkFlow] = useState('');
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentSelection, setDepartmentSelection] = useState('');
  const headOfficeDepartments = branches?.find(
    (item) => item.name === 'headOffice',
  )?.departments;
  const [processType, setProcessType] = useState();
  const [headofficeInclude, setHeadofficeInclude] = useState();
  const [managerDep, setManagerDep] = useState();
  const depBelongsToHeadoffice =
    departmentSelection.split('_')[0].toLowerCase() === 'headoffice'
      ? true
      : false;

  // ---------------** when deparmtent outside headoffice
  // headoffice is not included branches select
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectAllCheckBranches, setSelectAllCheckBranches] = useState(false);
  const handleCommanBranchChange = (e, value) => {
    setSelectedBranches(value);
  };
  const handleSelectAllBranches = (e) => {
    if (e.target.checked) {
      const nonHeadOfficeBranches = branches
        ?.filter(
          (item) => item.name !== 'headOffice' && item.departments.length > 0,
        )
        ?.filter((item) => !departmentSelection.includes(item.name))
        .map((item) => item.name);
      setSelectedBranches(nonHeadOfficeBranches);
      setSelectAllCheckBranches(true);
    } else {
      setSelectedBranches([]);
      setSelectAllCheckBranches(false);
    }
  };

  // headoffice included
  const handleChangeManagerDep = (event, value) => {
    if (value) {
      setManagerDep(value.name);
    }
  };
  // --------------------------------------------------------
  // when department inside headoffice
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedHeadDepartments, setSelectedHeadDepartments] = useState([]);
  const [selectAllCheckDepartments, setSelectAllCheckDepartments] =
    useState(false);
  const [selectAllCheckHeadDepartments, setSelectAllCheckHeadDepartments] =
    useState(false);
  const handleDepartmentsSelect = (e, value) => {
    setSelectedDepartments(value);
  };
  const handleHeadDepartmentsSelect = (e, value) => {
    setSelectedHeadDepartments(value);
  };
  const handleSelectAllDepartments = (e) => {
    if (e.target.checked) {
      const allDeps = branches
        ?.filter(
          (item) =>
            !departmentSelection.includes(item.name) &&
            item.departments.length > 0,
        )
        .map((item) => item.name);
      setSelectedDepartments(allDeps);
      setSelectAllCheckDepartments(true);
    } else {
      setSelectedDepartments([]);
      setSelectAllCheckDepartments(false);
    }
  };
  const handleSelectAllHeadDepartments = (e) => {
    if (e.target.checked) {
      const allDeps = headOfficeDepartments
        ?.filter((dep) => dep.name !== departmentSelection)
        ?.map((dep) => dep.name);
      setSelectedHeadDepartments(allDeps);
      setSelectAllCheckHeadDepartments(true);
    } else {
      setSelectedHeadDepartments([]);
      setSelectAllCheckHeadDepartments(false);
    }
  };
  // ----------------------------------------
  const fetchBranches = async () => {
    const url = backendUrl + '/getBranchesWithDepartments';
    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setBranches(data.branches);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  const getDepartments = async () => {
    const url = backendUrl + '/getDepartmentForInititors';
    axios
      .post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      })
      .then((response) => {
        if (response.status === 200) {
          setDepartments(response.data.departments);
        }
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        console.error('error', error);
      });
  };
  const navigate = useNavigate();
  const handleProceed = (type) => {
    let workFlow = '',
      connectors = [],
      infoMessage;

    switch (type) {
      case '1':
        if (!departmentSelection) {
          infoMessage = 'Select a department';
          break;
        }
        // find if of workFlow using name
        const workFlowId = departments.find(
          (item) => item.department === departmentSelection,
        );
        workFlow = workFlowId?._id;
        break;

      case '2':
        // filter ids of departments from names
        const headDepsIDs = headOfficeDepartments
          ?.filter((dep) => selectedHeadDepartments.includes(dep.name))
          .map((dep) => dep._id);
        const normalDepIDs = branches
          ?.filter((branch) => selectedDepartments.includes(branch.name))
          ?.map((branch) => branch.departments.map((dep) => dep._id))
          .flat();
        const finalDepartments = [...headDepsIDs, ...normalDepIDs];
        if (!departmentSelection || finalDepartments.length === 0) {
          infoMessage = 'Select department and provide inputs';
          break;
        }
        // find id of workFlow using name
        const workFlowId1 = departments.find(
          (item) => item.department === departmentSelection,
        );
        workFlow = workFlowId1?._id;
        connectors = finalDepartments;
        break;

      case '3':
        if (!managerDep || !departmentSelection) {
          infoMessage = 'Please select department';
          break;
        }
        // find id of headoffice department using its name
        const managerDepId = headOfficeDepartments?.find(
          (dep) => dep.name === managerDep,
        );
        // find connector id using name from selectedDepartment array
        workFlow = managerDepId?._id;
        connectors = [selectedDepartment?._id];
        break;

      default:
        if (!departmentSelection || selectedBranches.length === 0) {
          infoMessage = 'Select department and provide branches';
          break;
        }
        // find workFLow id from departments array using its names
        const workFlowId2 = departments.find(
          (item) => item.department === departmentSelection,
        );
        // find branches ids from branches array by using names in selectedBranches array
        const branchesIds = branches
          ?.filter((branch) => selectedBranches.includes(branch.name))
          ?.map((branch) => branch.departments.map((dep) => dep._id))
          .flat();
        workFlow = workFlowId2?._id;
        connectors = branchesIds;
        break;
    }

    if (infoMessage) {
      toast.info(infoMessage);
      return;
    }
    if (workFlow) {
      setWorkFlow(workFlow);
    }
    if (connectors.length !== 0) {
      setConnectors(connectors);
    }
    setActiveStep(1);
  };
  // handle step
  const handlePreviousClick = () => {
    setActiveStep((prev) => prev - 1);
  };
  const handleNextClick = () => {
    setActiveStep((prev) => prev + 1);
  };

  // workflow handling
  const [works, setWorks] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [userBranch, setUserBranch] = useState('');
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [userSelection, setUserSelection] = useState({ user: '', role: '' });
  const [users, setUsers] = useState([]);
  const [usersOnStep, setUsersOnStep] = useState([]);
  const [flow, setFlow] = useState({
    work: '',
    step: selectedDepartment?.workFlow?.length,
  });
  useEffect(() => {
    setFlow((prev) => ({
      ...prev,
      step: selectedDepartment?.workFlow?.length || 0,
    }));
  }, [selectedDepartment]);

  const getBranches = async () => {
    try {
      const url = backendUrl + '/getAllBranches';
      const accessToken = sessionStorage.getItem('accessToken');
      const { data } = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setAllBranches(data.branches);
      return data.branches;
    } catch (error) {
      console.error('unable to fetch branches');
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
  function formatUserNames(users) {
    if (!users || users.length === 0) {
      return 'No users';
    } else if (users.length === 1) {
      return users[0].user;
    } else {
      return users[0].user + ', ...';
    }
  }
  const handleFlowChange = (event) => {
    const { name, value } = event.target;
    setFlow((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  const getRoles = async (id) => {
    setFieldsLoading(true);
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
      console.error('Error getting roles for selected branch');
    } finally {
      setFieldsLoading(false);
    }
  };
  const getUsers = async (role) => {
    setFieldsLoading(true);
    try {
      const url = backendUrl + '/getUsersByRoleInBranch';
      const accessToken = sessionStorage.getItem('accessToken');
      const { _id } = branches.find((item) => item.name === userBranch);
      const id = roles.find((item) => item.role === role);
      // console.log(role);
      // console.log(userBranch);
      // console.log(branches);
      // console.log(roles);
      // console.log(_id, id._id);
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
  const handleInputChange = (event) => {
    const { name, value } = event.target;
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
  const handleWorkFlow = () => {
    if (selectedDepartment?.workFlow?.length === 0 && flow.work !== 'upload') {
      toast.info('First step should be upload');
      return;
    }
    if (usersOnStep.length > 0 && flow.work) {
      setSelectedDepartment((prev) => {
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
      if (!flow.work) {
        toast.info('Please select work!!');
      } else {
        toast.info('Please add users!!');
      }
    }
  };
  const handleDelete = (index) => {
    const updatedWorkFlow = [...selectedDepartment.workFlow];
    updatedWorkFlow.splice(index, 1);
    setSelectedDepartment({
      ...selectedDepartment,
      workFlow: updatedWorkFlow.map((step, i) => ({ ...step, step: i + 1 })),
    });
  };
  const deleteStepUser = (index) => {
    const updatedUsersOnStep = usersOnStep.filter((_, i) => i !== index);
    setUsersOnStep(updatedUsersOnStep);
  };

  // working here
  useEffect(() => {
    fetchBranches();
    getDepartments();
    getBranches();
    getWorks();
    setFlow((prevFlow) => ({
      ...prevFlow,
      step: selectedDepartment?.workFlow?.length + 1,
    }));
  }, []);
  const [isDynamicFlow, setIsDynamicFlow] = useState(false);
  const handleDynamicFlowChange = (value) => {
    setIsDynamicFlow(value);
    setProcessType('intra');
    setHeadofficeInclude();
  };

  // multi user add dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const onUserDialogClose = () => {
    setUserDialogOpen(false);
  };
  return (
    <>
      {loading ? (
        <ComponentLoader />
      ) : (
        <Stack flexDirection="row">
          <div
            style={{
              width: '100%',
              backgroundColor: 'white',
              padding: '5px',
            }}
          >
            <Stepper activeStep={activeStep} alternativeLabel>
              <Step>
                <StepLabel>Provide Process Details</StepLabel>
                {activeStep != 0 ? (
                  <Stack alignItems="center">
                    <Button size="small" onClick={handlePreviousClick}>
                      Previous
                    </Button>
                  </Stack>
                ) : null}
              </Step>
              {isDynamicFlow ? (
                <Step>
                  <StepLabel>Workflow</StepLabel>
                </Step>
              ) : null}
              <Step>
                <StepLabel>Initiate Process</StepLabel>
                {(isDynamicFlow ? activeStep == 1 : null) ? (
                  <Stack alignItems="center">
                    <Button size="small" onClick={handleNextClick}>
                      Next
                    </Button>
                  </Stack>
                ) : null}
              </Step>
            </Stepper>
            {activeStep === 0 ? (
              <>
                {!loading && (
                  <Stack
                    mt={2}
                    sx={{
                      maxWidth: 'fit-content',
                      mx: 'auto',
                    }}
                  >
                    <div style={{ marginBottom: '25px' }}>
                      <Typography
                        variant="body1"
                        component="span"
                        gutterBottom
                        sx={{
                          textAlign: 'center',
                          width: 350,
                          height: 50,
                          fontWeight: 400,
                          margin: '10px',
                        }}
                      >
                        1. Select Deparment to initiate process
                      </Typography>
                      <div className={styles.departmentList}>
                        <Select
                          value={departmentSelection}
                          size="small"
                          sx={{ maxWidth: '400px', backgroundColor: 'white' }}
                          onChange={(e) => {
                            setSelectedDepartment(e.target?.value);
                            setDepartmentSelection(e.target?.value?.department);
                          }}
                          displayEmpty
                          renderValue={(selected) =>
                            selected === '' ? 'Select Department' : selected
                          }
                        >
                          {departments.map((department) => (
                            <MenuItem
                              key={department.department}
                              value={department}
                            >
                              {department.department}
                            </MenuItem>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div style={{ marginBottom: '25px' }}>
                      <Typography
                        variant="body1"
                        component="span"
                        gutterBottom
                        sx={{
                          textAlign: 'center',
                          width: 350,
                          height: 50,
                          fontWeight: 400,

                          margin: '10px',
                        }}
                      >
                        Is this dynamic workflow?
                      </Typography>
                      <div className={styles.processType}>
                        <Button
                          variant="outlined"
                          onClick={() => handleDynamicFlowChange(true)}
                          size="medium"
                          sx={{
                            bgcolor:
                              isDynamicFlow === true ? 'lightblue' : 'white',
                            '&:hover': {
                              bgcolor: '#0000FF11',
                            },
                            width: '197px',
                            display: 'flex',
                            justifyContent: 'flex-start',
                          }}
                        >
                          {isDynamicFlow === true ? (
                            <IconGradienter
                              style={{ marginRight: '5px' }}
                              size={17}
                            />
                          ) : (
                            <IconCircle
                              style={{ marginRight: '7px' }}
                              size={15}
                            />
                          )}
                          <p style={{ fontSize: '11px' }}>Yes</p>
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleDynamicFlowChange(false)}
                          size="medium"
                          sx={{
                            bgcolor:
                              isDynamicFlow === false ? 'lightblue' : 'white',
                            '&:hover': {
                              bgcolor: '#0000FF11',
                            },
                            width: '197px',
                            display: 'flex',
                            justifyContent: 'flex-start',
                          }}
                        >
                          {isDynamicFlow === false ? (
                            <IconGradienter
                              style={{ marginRight: '5px' }}
                              size={17}
                            />
                          ) : (
                            <IconCircle
                              style={{ marginRight: '7px' }}
                              size={15}
                            />
                          )}
                          <p style={{ fontSize: '11px' }}>No</p>
                        </Button>
                      </div>
                    </div>
                    {!isDynamicFlow ? (
                      <>
                        <div style={{ marginBottom: '25px' }}>
                          <Typography
                            variant="body1"
                            component="span"
                            gutterBottom
                            sx={{
                              textAlign: 'center',
                              width: 350,
                              height: 50,
                              fontWeight: 400,

                              margin: '10px',
                            }}
                          >
                            2. Select Type of process to initiate
                          </Typography>
                          <div className={styles.processType}>
                            <Button
                              variant="outlined"
                              onClick={() => {
                                setProcessType('intra');
                                setConnectors([]);
                                setSelectedDepartments([]);
                                setSelectedHeadDepartments([]);
                              }}
                              size="medium"
                              sx={{
                                bgcolor:
                                  processType === 'intra'
                                    ? 'lightblue'
                                    : 'white',
                                '&:hover': {
                                  bgcolor: '#0000FF11',
                                },
                                width: '197px',
                                display: 'flex',
                                justifyContent: 'flex-start',
                              }}
                            >
                              {processType === 'intra' ? (
                                <IconGradienter
                                  style={{ marginRight: '5px' }}
                                  size={17}
                                />
                              ) : (
                                <IconCircle
                                  style={{ marginRight: '7px' }}
                                  size={15}
                                />
                              )}
                              <p style={{ fontSize: '11px' }}>Intra Branch</p>
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => setProcessType('inter')}
                              size="medium"
                              sx={{
                                bgcolor:
                                  processType === 'inter'
                                    ? 'lightblue'
                                    : 'white',
                                '&:hover': {
                                  bgcolor: '#0000FF11',
                                },
                                width: '197px',
                                display: 'flex',
                                justifyContent: 'flex-start',
                              }}
                            >
                              {processType === 'inter' ? (
                                <IconGradienter
                                  style={{ marginRight: '5px' }}
                                  size={17}
                                />
                              ) : (
                                <IconCircle
                                  style={{ marginRight: '7px' }}
                                  size={15}
                                />
                              )}
                              <p style={{ fontSize: '11px' }}>Inter Branch</p>
                            </Button>
                          </div>
                        </div>
                        {processType === 'inter' && !depBelongsToHeadoffice && (
                          <>
                            <div style={{ marginBottom: '25px' }}>
                              <Typography
                                variant="body1"
                                component="span"
                                gutterBottom
                                sx={{
                                  width: 350,
                                  height: 50,
                                  fontWeight: 400,
                                  margin: '10px',
                                }}
                              >
                                3. Is head-office included in process ?
                              </Typography>
                              <div className={styles.headOfficeInclude}>
                                <Button
                                  variant="outlined"
                                  onClick={() => {
                                    setHeadofficeInclude(true);
                                    setSelectedBranches([]);
                                  }}
                                  size="medium"
                                  sx={{
                                    bgcolor: headofficeInclude
                                      ? 'lightblue'
                                      : 'white',
                                    '&:hover': {
                                      bgcolor: '#0000FF11',
                                    },
                                    display: 'flex',
                                    width: '197px',
                                    justifyContent: 'flex-start',
                                  }}
                                >
                                  {headofficeInclude ? (
                                    <IconGradienter
                                      style={{ marginRight: '5px' }}
                                      size={17}
                                    />
                                  ) : (
                                    <IconCircle
                                      style={{ marginRight: '7px' }}
                                      size={15}
                                    />
                                  )}
                                  <p style={{ fontSize: '11px' }}>Yes</p>
                                </Button>
                                <Button
                                  variant="outlined"
                                  onClick={() => {
                                    setHeadofficeInclude(false);
                                    setManagerDep(null);
                                  }}
                                  size="medium"
                                  sx={{
                                    bgcolor: !headofficeInclude
                                      ? 'lightblue'
                                      : 'white',
                                    '&:hover': {
                                      bgcolor: '#0000FF11',
                                    },
                                    width: '197px',
                                    display: 'flex',
                                    justifyContent: 'flex-start',
                                  }}
                                >
                                  {!headofficeInclude ? (
                                    <IconGradienter
                                      style={{ marginRight: '5px' }}
                                      size={17}
                                    />
                                  ) : (
                                    <IconCircle
                                      style={{ marginRight: '7px' }}
                                      size={15}
                                    />
                                  )}
                                  <p style={{ fontSize: '11px' }}>No</p>
                                </Button>
                              </div>
                            </div>
                            {headofficeInclude ? (
                              <div style={{ marginBottom: '25px' }}>
                                <Typography
                                  variant="body1"
                                  component="span"
                                  gutterBottom
                                  sx={{
                                    textAlign: 'center',
                                    width: 350,
                                    height: 50,
                                    fontWeight: 400,
                                    margin: '10px',
                                  }}
                                >
                                  4. Select headoffice department
                                </Typography>
                                <div className={styles.managerDep}>
                                  <Autocomplete
                                    disablePortal
                                    id="combo-box-department"
                                    size="small"
                                    onChange={handleChangeManagerDep}
                                    options={headOfficeDepartments || []}
                                    value={
                                      headOfficeDepartments?.filter(
                                        (item) => item.name === managerDep,
                                      )[0] || null
                                    }
                                    getOptionLabel={(option) => option.name}
                                    renderOption={(props, option) => (
                                      <Box component="li" {...props}>
                                        {option.name}
                                      </Box>
                                    )}
                                    sx={{
                                      maxWidth: 400,
                                      backgroundColor: 'white',
                                    }}
                                    renderInput={(params) => (
                                      <TextField {...params} />
                                    )}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginBottom: '25px' }}>
                                <Typography
                                  variant="body1"
                                  component="span"
                                  gutterBottom
                                  sx={{
                                    textAlign: 'center',
                                    width: 350,
                                    height: 50,
                                    fontWeight: 400,
                                    margin: '10px',
                                  }}
                                >
                                  4. Select receiver branches
                                </Typography>
                                <div className={styles.receiverBranches}>
                                  <Autocomplete
                                    multiple
                                    sx={{
                                      maxWidth: '400px',
                                      backgroundColor: 'white',
                                    }}
                                    size="small"
                                    id="checkboxes-tags-demo"
                                    options={branches
                                      ?.filter(
                                        (item) =>
                                          item.name !== 'headOffice' &&
                                          item.departments.length > 0,
                                      )
                                      ?.filter(
                                        (item) =>
                                          !departmentSelection.includes(
                                            item.name,
                                          ),
                                      )
                                      ?.filter(
                                        (item) => item.departments.length >= 0,
                                      )
                                      ?.map((branch) => branch.name)}
                                    disableCloseOnSelect
                                    getOptionLabel={(option) => option}
                                    renderOption={(
                                      props,
                                      option,
                                      { selected },
                                    ) => (
                                      <li {...props}>
                                        <Checkbox
                                          icon={
                                            <CheckboxOutlineBlankIcon fontSize="small" />
                                          }
                                          checkedIcon={
                                            <CheckboxIcon fontSize="small" />
                                          }
                                          style={{ marginRight: 8 }}
                                          checked={selected}
                                        />
                                        <ListItemText primary={option} />
                                      </li>
                                    )}
                                    fullWidth
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        variant="outlined"
                                      />
                                    )}
                                    value={selectedBranches}
                                    onChange={handleCommanBranchChange}
                                    renderTags={(value, getTagProps) =>
                                      value.map((option, index) => (
                                        <Chip
                                          variant="outlined"
                                          label={option}
                                          {...getTagProps({ index })}
                                        />
                                      ))
                                    }
                                  />
                                  <FormControlLabel
                                    sx={{
                                      justifyContent: 'flex-end',
                                      maxWidth: '400px',
                                    }}
                                    control={
                                      <Checkbox
                                        size="small"
                                        checked={selectAllCheckBranches}
                                        // disabled={!selectedBranch}
                                        onChange={handleSelectAllBranches}
                                        name="selectAllBranches"
                                      />
                                    }
                                    label="Select all branches"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {processType === 'inter' && depBelongsToHeadoffice && (
                          <div style={{ marginBottom: '25px' }}>
                            <Typography
                              variant="body1"
                              component="span"
                              gutterBottom
                              sx={{
                                width: 350,
                                height: 50,
                                fontWeight: 400,
                                margin: '10px',
                              }}
                            >
                              3. Select receiver departments
                            </Typography>
                            <div className={styles.receiverBranches}>
                              <p>Headoffice Departments :</p>
                              <Autocomplete
                                multiple
                                size="small"
                                sx={{ maxWidth: '400px' }}
                                id="checkboxes-tags-demo"
                                options={headOfficeDepartments
                                  ?.filter(
                                    (dep) => dep.name !== departmentSelection,
                                  )
                                  ?.map((dep) => dep.name)}
                                disableCloseOnSelect
                                getOptionLabel={(option) => option}
                                renderOption={(props, option, { selected }) => (
                                  <li {...props}>
                                    <Checkbox
                                      icon={
                                        <CheckboxOutlineBlankIcon fontSize="small" />
                                      }
                                      checkedIcon={
                                        <CheckboxIcon fontSize="small" />
                                      }
                                      style={{ marginRight: 8 }}
                                      checked={selected}
                                    />
                                    <ListItemText primary={option} />
                                  </li>
                                )}
                                fullWidth
                                renderInput={(params) => (
                                  <TextField {...params} variant="outlined" />
                                )}
                                value={selectedHeadDepartments}
                                onChange={handleHeadDepartmentsSelect}
                                renderTags={(value, getTagProps) =>
                                  value.map((option, index) => (
                                    <Chip
                                      variant="outlined"
                                      label={option}
                                      {...getTagProps({ index })}
                                    />
                                  ))
                                }
                              />
                              <FormControlLabel
                                sx={{
                                  justifyContent: 'flex-end',
                                  maxWidth: '400px',
                                }}
                                control={
                                  <Checkbox
                                    checked={selectAllCheckHeadDepartments}
                                    size="small"
                                    // disabled={!selectedBranch}
                                    onChange={handleSelectAllHeadDepartments}
                                    name="selectAllDepartments"
                                  />
                                }
                                label="Select all departments"
                              />
                              <p>Normal branches :</p>
                              <Autocomplete
                                multiple
                                size="small"
                                sx={{ maxWidth: '400px' }}
                                id="checkboxes-tags-demo"
                                options={branches
                                  ?.filter(
                                    (item) =>
                                      !departmentSelection.includes(item.name),
                                  )
                                  ?.filter(
                                    (item) => item.departments.length > 0,
                                  )
                                  ?.map((branch) => branch.name)}
                                disableCloseOnSelect
                                getOptionLabel={(option) => option}
                                renderOption={(props, option, { selected }) => (
                                  <li {...props}>
                                    <Checkbox
                                      icon={
                                        <CheckboxOutlineBlankIcon fontSize="small" />
                                      }
                                      checkedIcon={
                                        <CheckboxIcon fontSize="small" />
                                      }
                                      style={{ marginRight: 8 }}
                                      checked={selected}
                                    />
                                    <ListItemText primary={option} />
                                  </li>
                                )}
                                fullWidth
                                renderInput={(params) => (
                                  <TextField {...params} variant="outlined" />
                                )}
                                value={selectedDepartments}
                                onChange={handleDepartmentsSelect}
                                renderTags={(value, getTagProps) =>
                                  value.map((option, index) => (
                                    <Chip
                                      variant="outlined"
                                      label={option}
                                      {...getTagProps({ index })}
                                    />
                                  ))
                                }
                              />

                              <FormControlLabel
                                sx={{
                                  justifyContent: 'flex-end',
                                  maxWidth: '400px',
                                }}
                                control={
                                  <Checkbox
                                    checked={selectAllCheckDepartments}
                                    size="small"
                                    // disabled={!selectedBranch}
                                    onChange={handleSelectAllDepartments}
                                    name="selectAllDepartments"
                                  />
                                }
                                label="Select Branches"
                              />
                            </div>
                          </div>
                        )}
                        {/* buttons according to selections */}
                      </>
                    ) : null}
                    {(processType === 'intra' || isDynamicFlow) && (
                      <Stack alignItems="center">
                        <Button
                          variant="contained"
                          onClick={() => handleProceed('1')}
                          sx={{ width: 'fit-content', minWidth: '200px' }}
                        >
                          Proceed
                        </Button>
                      </Stack>
                    )}
                    {processType === 'inter' && depBelongsToHeadoffice && (
                      <Stack alignItems="center">
                        <Button
                          variant="contained"
                          onClick={() => handleProceed('2')}
                          sx={{ width: 'fit-content', minWidth: '200px' }}
                        >
                          Proceed
                        </Button>
                      </Stack>
                    )}
                    {processType === 'inter' && !depBelongsToHeadoffice && (
                      <Stack alignItems="center" spacing={2}>
                        {headofficeInclude && (
                          <Button
                            variant="contained"
                            onClick={() => handleProceed('3')}
                            sx={{ width: 'fit-content', minWidth: '200px' }}
                          >
                            Proceed
                          </Button>
                        )}
                        {!headofficeInclude && (
                          <Button
                            variant="contained"
                            onClick={handleProceed}
                            sx={{ width: 'fit-content', minWidth: '200px' }}
                          >
                            Proceed
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>
                )}
              </>
            ) : null}

            {(isDynamicFlow ? activeStep === 1 : activeStep == null) ? (
              <>
                <Grid2 container spacing={3} p={2}>
                  <Grid2 item size={{ xs: 6 }}>
                    <Typography variant="body1">
                      {/* {newWork ? "name of work" : "Work"}: */}
                      Work
                    </Typography>
                    <Box
                      sx={{ display: 'flex', flexDirection: 'row', gap: '3px' }}
                    >
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
                        value={
                          +flow.step
                            ? +flow.step
                            : selectedDepartment.workFlow.length + 1
                        }
                      >
                        {Array.from(
                          { length: selectedDepartment?.workFlow?.length + 1 },
                          (_, index) => (
                            <MenuItem key={index} value={index + 1}>
                              {index + 1}
                            </MenuItem>
                          ),
                        )}
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
                                    <Button
                                      onClick={() => deleteStepUser(index)}
                                    >
                                      <FaRegTrashAlt color="red" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4}>
                                  Please add users
                                </TableCell>
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
                      {/* {usersOnStep.length && flow.work && flow.step ? ( */}
                      <Button
                        variant="contained"
                        onClick={handleWorkFlow}
                        // sx={{ backgroundColor: '#40A2E3' }}
                      >
                        Add Step
                      </Button>
                      {/* ) : null} */}
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
                  {selectedDepartment?.workFlow?.map((item, index) => (
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
                                  ? item.users
                                      .map((user) => user.user)
                                      .join(', ')
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
                <Button
                  variant="contained"
                  onClick={handleNextClick}
                  sx={{ display: 'block', mx: 'auto' }}
                >
                  Process
                </Button>
              </>
            ) : null}
            {(isDynamicFlow ? activeStep === 2 : activeStep == 1) ? (
              <InitiatProcess
                workFlow={workFlow}
                setWorkFlow={setWorkFlow}
                connectors={connectors}
                setConnectors={setConnectors}
                isHeadofficeIncluded={headofficeInclude}
                selectedDepartment={selectedDepartment}
                initiatorDepartment={departmentSelection}
                setSelectedDepartment={setSelectedDepartment}
                interBranch={processType === 'intra' ? false : true}
              />
            ) : null}
          </div>
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
        </Stack>
      )}
    </>
  );
}
