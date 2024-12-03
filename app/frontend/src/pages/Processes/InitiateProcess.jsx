import * as React from 'react';
import {
  Box,
  Button,
  Fab,
  Grid,
  Paper,
  Stack,
  TextField,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Modal,
  FormControlLabel,
  Radio,
  MenuItem,
  CircularProgress,
  Select,
  Alert,
  AlertTitle,
  Chip,
  Grid2,
} from '@mui/material';
import styles from './InitiateProcess.module.css';
import * as Yup from 'yup';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Typography } from '@mui/material';
import { useState } from 'react';
import { useRef } from 'react';
import {
  download,
  upload,
} from '../../components/drop-file-input/FileUploadDownload';
import { useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { InfoOutlined } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { IconTrash } from '@tabler/icons-react';
import View from '../view/View';

const schema = Yup.object().shape({
  maxReceiverStepNumber: Yup.number()
    .typeError('Step number must be a number')
    .required('Step number is required'),
});

export default function LabelBottomNavigation(props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      maxReceiverStepNumber: props?.selectedDepartment?.workFlow?.length,
      selectedOption: 'no',
      selectedStep: null,
      remarks: '',
    },
  });
  const [selectedOption, maxReceiverStepNumber] = watch([
    'selectedOption',
    'maxReceiverStepNumber',
  ]);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const meetingId = queryParams.get('meetingId');

  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [workNameError, setWorkNameError] = useState('');
  const [cabinetNoError, setCabinetNoError] = useState('');
  const [fileInputError, setFileInputError] = useState('');
  const [workName, setWorkName] = useState('');
  const [cabinetNo, setCabinetNo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOpen1, setModalOpen1] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const urlData = params.get('data');
  const decodedObject = decodeURIComponent(urlData);
  const [pathList, setPathList] = useState([]);
  const [remarks, setRemarks] = useState();
  const [initiateProcessLoading, setInitiateProcessLoading] = useState(false);
  const [pathDetails, setPathDetails] = useState({ path: '', folderName: '' });
  var path;
  const [path2, setPath2] = useState();
  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type !== 'application/pdf') {
      toast.info('Only pdf is allowed');
      fileInputRef.current.value = null;
    } else {
      setSelectedFile(selected);
      setFileInputError('');
    }
  };

  const navigate = useNavigate();

  const addProcess = async (
    finalData,
    departmentPath,
    rem,
    selectedStep,
    maxReceiverStepNumber,
  ) => {
    try {
      const url = backendUrl + '/addProcess';
      const res = await axios.post(
        url,
        {
          workFlow: props.workFlow,
          maxReceiverStepNumber,
          connectors: props.connectors,
          isInterBranchProcess: props.interBranch,
          remarks: remarks ? remarks : rem,
          documents: finalData,
          initiatorDepartment: props.initiatorDepartment,
          ...(props.isDynamicFlow
            ? { steps: props.selectedDepartment.workFlow }
            : {}),
          ...(meetingId ? { meetingId: meetingId } : {}),
          documentsPath: departmentPath,
          isHeadofficeIncluded: props.isHeadofficeIncluded,
          departmentName: props.selectedDepartment.department,
          ...(selectedStep ? { nextStepNumber: selectedStep } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );
      if (res.status === 200) {
        toast.success('Process is initiated');
        navigate('/processes/work');
        props.setWorkFlow('');
        props.setConnectors([]);
        props.setSelectedDepartment({});
      }
    } catch (error) {
      toast.error('Unable to initiate process');
    }
    setInitiateProcessLoading(false);
    modalClose();
    modalClose1();
  };

  const createFolder = async (department) => {
    try {
      let folderPath = `${pathDetails.path}/${pathDetails.folderName}`;
      const response = await axios.post(
        backendUrl + '/createFolder',
        {
          path: folderPath,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );
      return folderPath;
    } catch (error) {
      console.error('unable to create folder at given path');
    }
  };

  const [finalData, setFinalData] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const uploadDoc = async () => {
    setUploadLoading(false);
    // Clear previous errors
    setWorkNameError('');
    setCabinetNoError('');
    setFileInputError('');

    // Validate inputs
    if (workName.trim() === '') {
      setWorkNameError('Work Name is required');
      setUploadLoading(false); // Stop loading

      return;
    }
    if (cabinetNo.trim() === '') {
      setCabinetNoError('Cabinet Number is required');
      setUploadLoading(false); // Stop loading
      return;
    }
    if (!fileInputRef?.current?.files?.length) {
      setFileInputError('Please select a file');
      fileInputRef.current.value = null;
      setUploadLoading(false); // Stop loading
      return;
    }

    try {
      // Prepare necessary variables
      let department;
      const { branch, department: deptName } = props.selectedDepartment;

      if (branch === 'headOffice') {
        const [, outputString] = deptName.split('headOffice_');
        department = outputString;
      } else {
        department = branch;
      }

      // Determine the path
      path = `../${department}`;
      let ResPath;
      if (pathDetails.path && pathDetails.folderName) {
        path = await createFolder();
      } else if (pathDetails.path) {
        path = pathDetails.path;
      }
      setPath2(path);
      // API call to generate document name
      const url = `${backendUrl}/getProcessDocumentName`;
      const response = await axios.post(
        url,
        {
          department,
          workName,
          cabinetNo,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );

      if (response.status !== 200) {
        toast.error('Unable to generate document name');
        return;
      }

      // Upload the file
      const ext = selectedFile.name.split('.').pop();
      const uploadResult = await upload(
        [selectedFile],
        path,
        () => {}, // Dummy callback
        `${response.data.name}.${ext}`,
        true,
      );

      if (uploadResult?.[0]) {
        const uploadedData = uploadResult[0];

        // Update finalData
        setFinalData((prevData) => [
          ...prevData,
          {
            workName,
            path,
            name: `${response.data.name}.${ext}`,
            cabinetNo,
            documentId: uploadedData,
          },
        ]);

        // Reset form
        setWorkName('');
        setCabinetNo('');
        setSelectedFile(null);
        fileInputRef.current.value = null;
        toast.success('Document uploaded successfully');
      } else {
        throw new Error('File upload failed');
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Error uploading document',
      );
    } finally {
      setUploadLoading(false); // Stop loading
    }
  };

  const handleInitiat = async (data) => {
    setInitiateProcessLoading(true);
    await addProcess(
      finalData,
      path2,
      data.remarks,
      data.selectedStep,
      data.maxReceiverStepNumber,
    );
  };
  // modal for skip
  const openModal = () => {
    setModalOpen(true);
  };
  const openModal1 = () => {
    setModalOpen1(true);
  };
  const modalClose = () => {
    setModalOpen(false);
    setRemarks('');
  };
  const modalClose1 = () => {
    setModalOpen1(false);
    setRemarks('');
  };

  const handleDeleteFile = (index) => {
    if (index >= 0 && index < finalData.length) {
      const updatedFileData = [...finalData];
      updatedFileData.splice(index, 1);
      setFinalData(updatedFileData);
    } else {
      console.log('Invalid index provided');
    }
  };
  const handlePathDetailsChange = (e) => {
    setPathDetails({
      ...pathDetails,
      [e.target.name]: e.target.value,
    });
  };
  useEffect(() => {
    const getPath = async () => {
      try {
        let department;
        if (props.selectedDepartment.branch === 'headOffice') {
          const [, outputString] =
            props.selectedDepartment.department.split('headOffice_');
          department = outputString;
        } else {
          department = props.selectedDepartment.branch;
        }
        const getPathUrl = backendUrl + '/getDocumentChildren';
        const res = await axios.post(
          getPathUrl,
          {
            path: `../${department}`,
          },
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
            },
          },
        );
        setPathList(res.data.children);
      } catch (error) {
        console.log(error?.response?.data?.message || error?.message);
      }
    };
    getPath();
  }, []);
  const username = sessionStorage.getItem('username');

  // view file
  const [fileView, setFileView] = useState();
  const handleView = async (path, name, id) => {
    try {
      const fileData = await download(name, path, true);
      if (fileData) {
        setFileView({
          url: fileData.data,
          type: fileData.fileType,
          fileId: id,
        });
      } else {
        console.error('Invalid fileData:', fileData);
        toast.error('Invalid file data.');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Unable to view the file.');
    }
  };
  const handleViewClose = () => {
    setFileView(null);
  };
  return (
    <Stack>
      <div style={{ width: '100%' }}>
        <Stack alignItems="center" sx={{ margin: '5px', gap: '1px' }}>
          <Box
            sx={{
              padding: '5px',
              width: '100%',
              maxWidth: '600px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Grid2 container spacing={1}>
              <Grid2 item size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="File Path"
                  disabled={uploadLoading}
                  name="path"
                  select
                  value={pathDetails.path}
                  onChange={(e) => handlePathDetailsChange(e)}
                  sx={{ mb: 2, backgroundColor: 'white' }}
                >
                  {pathList?.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid2>
              <Grid2 item size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Folder Name"
                  name="folderName"
                  value={pathDetails.folderName}
                  disabled={!pathDetails.path || uploadLoading}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const isValidInput = /^[a-zA-Z0-9_\-()\[\]\s]*$/.test(
                      inputValue,
                    );

                    if (isValidInput || inputValue === '') {
                      handlePathDetailsChange(e);
                    }
                  }}
                  // helperText="Field must contain only letters, numbers, and spaces."
                  sx={{ mb: 2, backgroundColor: 'white' }}
                />
              </Grid2>
              <Grid2 item size={{ xs: 12 }}>
                <h4 style={{ textAlign: 'center', color: 'red' }}>
                  The documents save location is{' '}
                  {pathDetails.path
                    ? pathDetails.folderName
                      ? `${pathDetails.path}/${pathDetails.folderName}`
                      : `${pathDetails.path}`
                    : `/${
                        props?.selectedDepartment?.branch?.toLowerCase() ===
                        'headoffice'
                          ? props?.selectedDepartment?.department?.split('_')[1]
                          : props?.selectedDepartment?.branch
                      }`}
                </h4>
              </Grid2>
            </Grid2>
            <Typography variant="h6" sx={{ mb: 0.5, textAlign: 'center' }}>
              Add Files
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              label="Work Name"
              disabled={uploadLoading}
              value={workName}
              error={!!workNameError}
              // helperText={workNameError}
              onChange={(e) => {
                const inputValue = e.target.value;
                const isValidInput = /^[a-zA-Z0-9\s]*$/.test(inputValue);

                if (isValidInput || inputValue === '') {
                  setWorkName(inputValue);
                }
              }}
              // helperText="Field must contain only letters, numbers, and spaces."
              sx={{ mb: 2, backgroundColor: 'white' }}
            />
            <TextField
              fullWidth
              variant="outlined"
              label="Cabinet Number"
              type="number"
              value={cabinetNo}
              error={!!cabinetNoError}
              disabled={uploadLoading}
              inputProps={{ min: 1 }}
              onKeyDown={(e) => {
                (e.key === 'e' ||
                  e.key === 'E' ||
                  e.key === '-' ||
                  e.key === '+') &&
                  e.preventDefault();
              }}
              // helperText={cabinetNoError}
              onChange={(e) => setCabinetNo(e.target.value)}
              sx={{ mb: 2, backgroundColor: 'white' }}
            />
            {/* Hidden file input */}
            <input
              type="file"
              id="fileInput"
              accept=".pdf" // Restrict to only accept PDF files
              onChange={handleFileSelect}
              disabled={uploadLoading}
              style={{
                border: `1px solid ${!fileInputError ? 'lightgray' : 'red'}`,
                padding: '10px',
                borderRadius: '3px',
              }}
              ref={fileInputRef}
            />
            <Typography variant="body2" color="error">
              {fileInputError}
            </Typography>
            <div style={{ padding: '10px', width: '100%' }}>
              <Alert severity="error" icon={<InfoOutlined />}>
                <AlertTitle>{'Note'}</AlertTitle>
                <Typography sx={{ my: 0.4 }}>
                  Only the following file types are allowed for upload :
                </Typography>
                <Box>
                  <Chip
                    label={'PDF'}
                    color="error"
                    // variant="outlined"
                    sx={{
                      padding: 0,
                      height: '22px',
                      mr: 0.6,
                      my: 0.4,
                    }}
                  />
                </Box>
              </Alert>
            </div>
            <Box sx={{ alignSelf: 'center' }}>
              <Button
                disabled={uploadLoading}
                variant="outlined"
                onClick={uploadDoc}
                sx={{ mt: 2 }}
              >
                {uploadLoading ? <CircularProgress size={22} /> : 'Upload File'}
              </Button>
            </Box>
          </Box>
          <TableContainer
            component={Paper}
            elevation={3}
            className={styles.tableContainer}
          >
            <Table>
              <TableHead>
                <TableRow className={styles.tableRow}>
                  <TableCell className={styles.tableHeaderCell}>
                    File Name
                  </TableCell>
                  <TableCell className={styles.tableHeaderCell}>Path</TableCell>
                  <TableCell className={styles.tableHeaderCell}>
                    Work Name
                  </TableCell>
                  <TableCell className={styles.tableHeaderCell}>
                    Cabinet Name
                  </TableCell>
                  <TableCell className={styles.tableHeaderCell}>View</TableCell>
                  <TableCell className={styles.tableHeaderCell}>
                    Remove
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {finalData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  finalData.map((file, index) => (
                    <TableRow key={index}>
                      <TableCell>{file?.name}</TableCell>
                      <TableCell>{file?.path}</TableCell>
                      <TableCell>{file?.workName}</TableCell>
                      <TableCell>{file?.cabinetNo}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() =>
                            handleView(file?.path, file?.name, file?.documentId)
                          }
                        >
                          View
                        </Button>
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleDeleteFile(index)}>
                          <IconTrash color="red" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Modal open={modalOpen} className="create-folder-modal">
            <form
              onSubmit={handleSubmit(handleInitiat)}
              style={{ gap: '10px', position: 'relative' }}
              className="create-folder-modal-content-container"
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    color: 'white',
                    marginBottom: '10px',
                    background: 'var(--themeColor)',
                    width: '100%',
                    textAlign: 'center',
                    borderRadius: '5px',
                  }}
                >
                  Workflow Step Skip
                </Typography>
                <Typography variant="h6">
                  Select step where you want to complete process
                </Typography>
                <Controller
                  name="maxReceiverStepNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      {...field}
                      size="small"
                      fullWidth
                      error={!!errors?.maxReceiverStepNumber}
                      helperText={errors?.maxReceiverStepNumber?.message}
                      sx={{ minWidth: '150px', color: '#333', mb: 2 }}
                    >
                      {props.selectedDepartment.workFlow
                        .filter(
                          (item) =>
                            !item.users.some((user) => user.user === username),
                        )
                        .map((item) => (
                          <MenuItem key={item.step} value={item.step}>
                            <b
                              style={{ marginRight: '3px', marginLeft: '3px' }}
                            >
                              {item.users.map((user) => user.user).join(',')}
                            </b>{' '}
                            |{' '}
                            <b
                              style={{ marginRight: '3px', marginLeft: '3px' }}
                            >
                              {item.work}
                            </b>{' '}
                            | (step - {item.step})
                          </MenuItem>
                        ))}
                    </TextField>
                  )}
                />
                <p style={{ fontSize: '18px', marginBottom: '10px' }}>
                  Do you want to skip any step from workflow?
                </p>
                <Stack
                  flexDirection="row"
                  gap={4}
                  sx={{ marginBottom: '10px' }}
                >
                  <Controller
                    name="selectedOption"
                    control={control}
                    render={({ field }) => (
                      <>
                        <FormControlLabel
                          control={
                            <Radio
                              {...field}
                              checked={field.value === 'yes'}
                              value="yes"
                            />
                          }
                          label="Yes"
                        />
                        <FormControlLabel
                          control={
                            <Radio
                              {...field}
                              checked={field.value === 'no'}
                              value="no"
                            />
                          }
                          label="No"
                        />
                      </>
                    )}
                  />
                </Stack>
                {selectedOption === 'yes' && (
                  <Stack width="100%" spacing={3} sx={{ marginBottom: '20px' }}>
                    <Typography sx={{ color: '#333' }}>
                      Step Number to forward process:
                    </Typography>
                    <Controller
                      name="selectedStep"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          size="small"
                          sx={{ minWidth: '150px', color: '#333' }}
                        >
                          {props.selectedDepartment.workFlow
                            .filter(
                              (item) =>
                                !item.users.some(
                                  (user) => user.user === username,
                                ),
                            )
                            .filter((item) =>
                              maxReceiverStepNumber
                                ? item.step <= maxReceiverStepNumber
                                : item,
                            )
                            .map((item) => (
                              <MenuItem key={item.step} value={item.step}>
                                Forward to{' '}
                                <b
                                  style={{
                                    marginRight: '3px',
                                    marginLeft: '3px',
                                  }}
                                >
                                  {item.users
                                    .map((user) => user.user)
                                    .join(',')}
                                </b>{' '}
                                for work{' '}
                                <b
                                  style={{
                                    marginRight: '3px',
                                    marginLeft: '3px',
                                  }}
                                >
                                  {item.work}
                                </b>{' '}
                                (step - {item.step})
                              </MenuItem>
                            ))}
                        </Select>
                      )}
                    />
                  </Stack>
                )}
                <Stack
                  direction="column"
                  alignItems="flex-start"
                  spacing={2}
                  width="100%"
                  sx={{ marginBottom: '20px' }}
                >
                  <Typography sx={{ color: '#333', textAlign: 'start' }}>
                    Remarks:
                  </Typography>
                  <Controller
                    name="remarks"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        variant="outlined"
                        size="small"
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Enter remarks"
                      />
                    )}
                  />
                </Stack>
                <Stack gap={1} flexDirection="row">
                  <Button
                    variant="contained"
                    disabled={initiateProcessLoading}
                    color={initiateProcessLoading ? 'inherit' : 'primary'}
                    type="submit"
                  >
                    {initiateProcessLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      'Initiate'
                    )}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={modalClose}
                    color="error"
                    disabled={initiateProcessLoading}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Box>
            </form>
          </Modal>
          <Modal open={modalOpen1} className="create-folder-modal">
            <div
              style={{ gap: '10px', position: 'relative' }}
              className="create-folder-modal-content-container"
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '300px',
                }}
              >
                <Stack
                  direction="column"
                  alignItems="flex-start"
                  spacing={2}
                  width="100%"
                  sx={{ marginBottom: '20px' }}
                >
                  <Typography
                    variant="h6"
                    sx={{ color: '#333', textAlign: 'start' }}
                  >
                    Remarks:
                  </Typography>
                  <TextField
                    variant="outlined"
                    size="small"
                    multiline
                    rows={2}
                    fullWidth
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </Stack>
                <Stack gap={1} flexDirection="row">
                  <Button
                    variant="contained"
                    onClick={handleInitiat}
                    disabled={initiateProcessLoading}
                    color={initiateProcessLoading ? 'inherit' : 'primary'}
                  >
                    {initiateProcessLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      'Initiate'
                    )}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={modalClose1}
                    color="error"
                    disabled={initiateProcessLoading}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Box>
            </div>
          </Modal>
          {finalData.length > 0 && (
            <Button
              variant="contained"
              onClick={
                props.interBranch && !props.isHeadofficeIncluded
                  ? openModal1
                  : openModal
              }
              disabled={initiateProcessLoading}
              sx={{ marginTop: '15px' }}
            >
              {/*  */}
              {props.interBranch && !props.isHeadofficeIncluded ? (
                initiateProcessLoading ? (
                  <CircularProgress size={20} />
                ) : (
                  'Next'
                )
              ) : (
                'Next'
              )}
            </Button>
          )}
        </Stack>
        {/* </Paper> */}
      </div>
      {fileView && (
        <View
          docu={fileView}
          workflow={props.selectedDepartment.workFlow}
          setFileView={setFileView}
          handleViewClose={handleViewClose}
          // maxReceiverStepNumber={processData?.maxReceiverStepNumber}
          processId={''}
          currentStep={1}
        />
      )}
    </Stack>
  );
}
