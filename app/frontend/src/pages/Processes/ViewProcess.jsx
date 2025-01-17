import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Grid,
  TextField,
  Modal,
  Radio,
  FormControlLabel,
  Select,
  TableCell,
  TableBody,
  TableHead,
  Table,
  TableContainer,
  TableRow,
  Autocomplete,
  Checkbox,
  Chip,
  ListItemText,
  MenuList,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogActions,
  FormControl,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  DialogContent,
  Grid2,
  Drawer,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import CheckboxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckboxIcon from '@mui/icons-material/CheckBox';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './View.module.css';
import { ImageConfig } from '../../config/ImageConfig';
import moment from 'moment';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  download,
  upload,
} from '../../components/drop-file-input/FileUploadDownload';
import View from '../view/View';
import { Button } from '@mui/material';
import { useRef } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  IconBan,
  IconCircleDashedX,
  IconDownload,
  IconEye,
  IconFileOff,
  IconReplace,
  IconSquareLetterX,
  IconSquareRoundedX,
  IconUpload,
  IconWritingSign,
  IconX,
} from '@tabler/icons-react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { InfoOutlined, Tune } from '@mui/icons-material';
import { toast } from 'react-toastify';
import sessionData from '../../Store';
import { useQueryClient } from 'react-query';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { useForm } from 'react-hook-form';
import Replacements from './Components/Replacements';
import TopLoader from '../../common/Loader/TopLoader';
import Workflow from '../../components/Workflow';

export default function ViewProcess(props) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [processData, setProcessData] = useState();
  const token = sessionStorage.getItem('accessToken');
  const initiator = sessionStorage.getItem('initiator') == 'true';

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50vw',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 3,
  };

  // replace document in process react hook form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();
  const fileRef = useRef(null);
  const onSubmit = async (data) => {
    const branch = processData.documentsPath.split('/');
    try {
      const urlForDocName = backendUrl + '/getProcessDocumentName';
      const uploadUrl = backendUrl + '/uploadDocumentsInProcess';
      let res = await axios.post(
        urlForDocName,
        {
          department: branch[1],
          workName: data.workName,
          cabinetNo: data.cabinetNo,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const dummy = () => {};

      let ext = data.fileInput[0].name.split('.').pop();
      let fileUploaded = await upload(
        [data.fileInput[0]],
        `${processData.documentsPath}`,
        dummy,
        `${res.data.name}.${ext}`,
        true,
      );
      const response = await axios.post(
        uploadUrl,
        {
          processId: viewId,
          documents: [
            {
              cabinetNo: data.cabinetNo,
              workName: data.workName,
              ref: fileToBeOperated?.details?._id,
              documentId: fileUploaded[0],
            },
          ],
          workFlowToBeFollowed: workFlowToBeFollowed,
          isInterBranchProcess: processData.isInterBranchProcess,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setProcessData((prev) => ({
        ...prev,
        isRevertable: response?.data?.isRevertable,
        isForwardable: response?.data?.isForwardable,
        documents: response?.data?.documents,
        replacementsWithRef: response?.data?.replacementsWithRef,
      }));
      toast.success(response?.data?.message);
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
    console.log('Uploaded File:', data.file[0]);
    alert('File uploaded successfully!');
  };
  // replace
  const [openReplaceDialog, setOpenReplaceDialog] = useState(false);
  const handleOpenReplaceDialog = () => {
    setOpenReplaceDialog(true);
    handleClose();
  };
  const onClose = () => {
    setOpenReplaceDialog(false);
    fileRef.current = null;
    reset();
  };
  // ----------------------
  const { pickedProcesses } = sessionData();
  const [work, setWork] = useState('e-sign');
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const receivedData = params.get('data');
  const viewId = decodeURIComponent(receivedData);
  const workflowFollow = params.get('workflow');
  const published = params.get('published');
  const workFlowToBeFollowed = decodeURIComponent(workflowFollow);
  const navigate = useNavigate();
  const publishCheck = processData?.workFlow[processData?.lastStepDone];
  const lastWork = processData?.workFlow[processData?.lastStepDone - 1];
  const username = sessionStorage.getItem('username');
  const [operable, setOperable] = useState(true);
  const [fileView, setFileView] = useState();
  const [itemName, setItemName] = useState('');
  const [anchorEl1, setAnchorEl1] = useState(null);
  const [anchorEl2, setAnchorEl2] = useState(null);
  const [anchorEl3, setAnchorEl3] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openComman, setOpenComman] = useState(false);
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState({});
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [remarks, setRemarks] = useState();
  useEffect(() => {
    setRemarks(processData?.remarks);
  }, [processData?.remarks]);
  const [reasonOfRejection, setReasonOfRejection] = useState();
  // const [rejectFileId, setRejectFileId] = useState();
  const [workNameError, setWorkNameError] = useState('');
  const [cabinetNoError, setCabinetNoError] = useState('');
  const [fileInputError, setFileInputError] = useState('');
  const [fileData, setFileData] = useState([]);
  const [workName, setWorkName] = useState('');
  const [cabinetNo, setCabinetNo] = useState('');
  const [forwardProcessLoading, setForwardProcessLoading] = useState(false);
  const [rejectProcessLoading, setRejectProcessLoading] = useState(false);
  const [reUploadLoading, setreUploadLoading] = useState(false);
  const [openC, setOpenC] = useState(false);
  const [openE, setOpenE] = useState(false);
  const [fileToBeOperated, setFileToBeOperated] = useState({
    signedBy: [],
  });
  const [signedBy, setSignedBy] = useState([]);

  // view functionality
  const handleClick1 = (event, name, item) => {
    setItemName(name);
    setAnchorEl1(event.currentTarget);
  };
  const handleClick2 = (event, name, item) => {
    setItemName(name);
    setAnchorEl3(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl1(null);
  };
  const sampleDocMenuClose = () => {
    setAnchorEl3(null);
  };
  const handleCloseSignedBymenu = () => {
    setAnchorEl2(null);
  };
  const handleOpenSignedByMenu = (e) => {
    setAnchorEl2(e.currentTarget);
  };
  const [rejectedMenu, setRejectedMenu] = useState(null);
  const [file, setFile] = useState([]);
  const handleOpenRejectedMenu = (e) => {
    setRejectedMenu(e.currentTarget);
  };
  const handleViewClose = () => {
    setFileView(null);
  };
  const handleDownload = (path, name) => {
    try {
      download(name, path);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('An error occurred while downloading the file.');
    }
    handleClose();
  };
  const handleUpload = async () => {
    let newDoc = [];
    setreUploadLoading(true);
    const url = backendUrl + '/getProcessDocumentName';
    const filelist = fileData.map((item) => item.file);
    const dummy = () => {};
    let finalData = [];
    try {
      const branch = processData.documentsPath.split('/');

      let path = processData.documentsPath;
      for (let i = 0; i < fileData.length; i++) {
        let res = await axios.post(
          url,
          {
            department: branch[1],
            workName: fileData[i].workName,
            cabinetNo: fileData[i].cabinetNo,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const currentTime = new Date();
        newDoc.push({
          workName: fileData[i].workName,
          cabinetNo: fileData[i].cabinetNo,
          signedBy: [],
          details: { name: res.data.name + '.pdf', createdOn: currentTime },
        });
        let ext = filelist[i].name.split('.').pop();
        let data = await upload(
          [filelist[i]],
          `${path}`,
          dummy,
          `${res.data.name}.${ext}`,
          true,
        );
        data = data[0];
        if (data && typeof fileData[i] === 'object') {
          const updatedFileItem = {
            ...fileData[i],
            documentId: data,
          };
          delete updatedFileItem.file;
          finalData.push(updatedFileItem);
        } else {
          console.log('Error: data.id or filelist[i] is missing or invalid.');
        }
      }
      // await addProcess(finalData, path); call uploadDocumentsInProcess
      setFileData([]);
    } catch (error) {
      toast.error('unable to upload documents');
      setreUploadLoading(false);
      return;
    }
    try {
      const url = backendUrl + '/uploadDocumentsInProcess';
      const res = await axios.post(
        url,
        {
          processId: viewId,
          documents: finalData,
          workFlowToBeFollowed: workFlowToBeFollowed,
          isInterBranchProcess: processData.isInterBranchProcess,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.status === 200) {
        processData.documents.push(...newDoc);
        setProcessData((prev) => ({
          ...prev,
          isRevertable: res?.data?.isRevertable,
          isForwardable: res?.data?.isForwardable,
        }));
        toast.success('Documents is uploaded');
      }
    } catch (error) {
      console.error('error', error);
    }
    setreUploadLoading(false);
  };

  const handleView = async (path, name, id) => {
    setLoading(true);
    try {
      const fileData = await download(name, path, true);
      if (fileData) {
        const signed = processData?.documents
          ?.find((item) => item.details._id == fileToBeOperated?.details?._id)
          ?.signedBy?.map((sign) => sign.username)
          .includes(username);
        console.log(signed);
        setFileView({
          url: fileData.data,
          type: fileData.fileType,
          fileId: fileToBeOperated?.details?._id,
          signed,
        });
        setLoading(false);
      } else {
        console.error('Invalid fileData:', fileData);
        toast.error('Invalid file data.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Unable to view the file.');
      setLoading(false);
    }
    handleClose();
  };

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const completeModalClose = () => {
    setIsCompleteModalOpen(false);
  };
  const [completeProcessLoading, setCompleteProcessLoading] = useState(false);
  const completeModalContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <p style={{ fontSize: '18px', marginBottom: '10px' }}>
        ARE YOU SURE YOU WANT TO COMPLETE THIS PROCESS?
      </p>
      <Stack flexDirection="row" gap={3}>
        <Button
          variant="contained"
          size="small"
          color={completeProcessLoading ? 'inherit' : 'error'}
          onClick={() => handleForward(true)}
          disabled={completeProcessLoading}
          sx={{
            // backgroundColor: 'red',
            // color: 'white',
            '&:hover': {
              backgroundColor: '#ff0000',
            },
          }}
        >
          {completeProcessLoading ? <CircularProgress size={20} /> : 'Yes'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={completeModalClose}
          disabled={completeProcessLoading}
          sx={{
            backgroundColor: '#007bff',
            color: 'white',
            '&:hover': {
              backgroundColor: '#0056b3',
            },
          }}
        >
          No
        </Button>
      </Stack>
    </Box>
  );

  // modal functionality
  const modalOpen = (name) => {
    if (name === 'head') {
      setOpen(true);
    } else {
      setOpenComman(true);
    }
  };
  const modalClose = () => {
    setSelectedDepartments([]);
    setSelectedBranch();
    setSelectedRoles([]);
    setOpen(false);
  };
  const closeCommanModal = () => {
    setSelectedBranches([]);
    setSelectedRoles([]);
    setOpenComman(false);
  };

  // publish functionality
  const handleChange = (event, value) => {
    setSelectedDepartments(value);
  };
  const [selectAllCheck, setSelectAllCheck] = useState(false);
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDepartments(
        selectedBranch.departments
          .filter((item) => !processData.name.includes(item.name))
          .map((item) => item.name),
      );
      setSelectAllCheck(true);
    } else {
      setSelectedDepartments([]);
      setSelectAllCheck(false);
    }
  };
  const handleRoleChange = (newValue) => {
    setSelectedRoles(newValue);
  };

  const handleBranchChange = (e) => {
    const branch = branches.find((item) => item.name === e.target.value);
    setSelectedBranch(branch);
    // setSelectedBranches(e.target.value);
  };
  const handleCommanBranchChange = (e, value) => {
    setSelectedBranches(value);
  };
  const [selectAllCheckBranches, setSelectAllCheckBranches] = useState(false);
  const [headOfficeName, setHeadOfficeName] = useState(false);
  const getHeadOfficeName = async () => {
    const url = backendUrl + '/getHeadOfficeName';
    try {
      const response = await axios.get(url);
      setHeadOfficeName(response?.data?.branchName);
    } catch (error) {
      console.log(error?.response?.data?.message || error?.message);
    }
  };
  useEffect(() => {
    getHeadOfficeName();
  }, []);
  const handleSelectAllBranches = (e) => {
    if (e.target.checked) {
      const nonHeadOfficeBranches = branches
        .filter((item) => item.name !== headOfficeName)
        .filter((item) => !processData.name.includes(item.name))
        .map((item) => item.name);
      setSelectedBranches(nonHeadOfficeBranches);
      setSelectAllCheckBranches(true);
    } else {
      setSelectedBranches([]);
      setSelectAllCheckBranches(false);
    }
  };
  const [publishLoading, setPublishLoading] = useState(false);
  const handlePublish = async (name) => {
    setPublishLoading(true);
    let message = '';

    if (name === 'head') {
      if (
        selectedBranch &&
        Object.keys(selectedBranch).length === 0 &&
        selectedDepartments.length === 0 &&
        selectedRoles.length === 0
      ) {
        message = 'Please select inputs';
        setPublishLoading(false);
      } else if (
        selectedRoles.length === 0 &&
        selectedDepartments.length === 0
      ) {
        message = 'Please select roles & departments';
        setPublishLoading(false);
      } else if (selectedDepartments.length === 0) {
        message = 'Please select departments';
        setPublishLoading(false);
      } else if (selectedRoles.length === 0) {
        message = 'Please select roles';
        setPublishLoading(false);
      }
    } else {
      if (selectedBranches.length === 0 && selectedRoles.length === 0) {
        message = 'Please select inputs';
        setPublishLoading(false);
      } else if (selectedBranches.length === 0) {
        message = 'Please select branch';
        setPublishLoading(false);
      } else if (selectedRoles.length === 0) {
        message = 'Please select roles';
        setPublishLoading(false);
      }
    }
    if (message) {
      toast.info(message);
      return; // Stop further execution if there's a message
    }
    try {
      const url = backendUrl + '/publishProcess';
      const response = await axios.post(
        url,
        name === 'head'
          ? {
              processId: viewId,
              roles: selectedRoles,
              departments: selectedDepartments,
            }
          : {
              processId: viewId,
              roles: selectedRoles,
              branches: selectedBranches,
            },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 200) {
        toast.success('Process is published');
        closeCommanModal();
        modalClose();
      } else {
        toast.error('Unable to publish');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while publishing');
    }
    setPublishLoading(false);
  };
  const queryClient = useQueryClient();
  const handleForward = async (completeBefore) => {
    setCompleteProcessLoading(true);
    setForwardProcessLoading(true);
    try {
      const forwardUrl = backendUrl + '/forwardProcess';
      const response = await axios.post(
        forwardUrl,
        {
          processId: viewId,
          currentStep: processData.currentStepNumber,
          ...(selectedStep ? { nextStepNumber: selectedStep } : {}),
          completeBeforeLastStep: completeBefore ? true : false,
          remarks: remarks,
          workFlowToBeFollowed: workFlowToBeFollowed,
          isInterBranchProcess: processData.isInterBranchProcess,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 200) {
        toast.success('Process is forwarded');
        queryClient.removeQueries('pendingProcesses');
        navigate('/processes/work');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Cannot forward !!');
    } finally {
      setIsModalOpen(false);
      setCompleteProcessLoading(false);
      setForwardProcessLoading(false);
    }
  };
  const currentUserData = processData?.workflow?.users?.find(
    (item) => item?.user === username,
  );

  const rejectProcess = async () => {
    setRejectProcessLoading(true);
    try {
      const url = backendUrl + '/revertProcess';
      const res = await axios.post(
        url,
        {
          processId: viewId,
          currentStep: processData?.currentStepNumber,
          remarks: remarks,
          workFlowToBeFollowed: workFlowToBeFollowed,
          isInterBranchProcess: processData.isInterBranchProcess,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.status === 200) {
        toast.success('Process is rejected');
        queryClient.removeQueries('pendingProcesses');
        navigate('/processes/work');
      }
    } catch (error) {
      toast.error('unable to reject process');
    } finally {
      setRejectProcessLoading(false);
      setRejectModalOpen(false);
    }
  };
  // modal for skip
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectFileModalOpen, setRejectFileModalOpen] = useState(false);
  const [commanLoading, setCommanLoading] = useState(false);
  const [selectedStep, setSelectedStep] = useState('');
  const openModal = () => {
    setIsModalOpen(true);
  };
  const handleModalClose = () => {
    setRemarks('');
    setIsModalOpen(false);
  };
  const openRejectModal = () => {
    setRejectModalOpen(true);
  };
  const CloseRejectModal = () => {
    setRemarks('');
    setRejectModalOpen(false);
  };
  const openRejectFileModal = () => {
    setRejectFileModalOpen(true);
  };
  const CloseRejectFileModal = () => {
    setReasonOfRejection('');
    setRejectFileModalOpen(false);
  };
  const [selectedOption, setSelectedOption] = useState('no');
  const handleOptionChange = (event) => {
    setSelectedOption('');
    setSelectedOption(event.target.value);
  };
  // Default step number
  const handleStepChange = (event) => {
    setSelectedStep(event.target.value);
  };
  //
  // upload files
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  // const filelist = fileData.map((item) => item.file);
  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type !== 'application/pdf') {
      toast.info('Only pdf is allowed');
      fileInputRef.current.value = '';
    } else {
      setSelectedFile(selected);
    }
  };
  const handleFileAdd = () => {
    setWorkNameError('');
    setCabinetNoError('');
    setFileInputError('');

    if (workName.trim() === '') {
      setWorkNameError('Work Name is required');
    }

    if (cabinetNo.trim() === '') {
      setCabinetNoError('Cabinet Number is required');
    }

    if (!fileInputRef?.current?.files?.length) {
      setFileInputError('Please select a file');
    }
    if (workName && cabinetNo && selectedFile) {
      const newFile = {
        file: selectedFile,
        workName: workName,
        cabinetNo: cabinetNo,
      };
      setFileData([...fileData, newFile]);
      setWorkName('');
      setCabinetNo('');
      setSelectedFile(null);
      fileInputRef.current.value = '';
    }
  };

  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signRemarks, setSignRemarks] = useState('');
  const handleSign = async (processId, fileId) => {
    setCommanLoading((value) => !value);
    const signUrl = backendUrl + '/signDocument';
    try {
      const res = await axios.post(
        signUrl,
        {
          processId: processId,
          documentId: fileId,
          workFlowToBeFollowed,
          remarks: signRemarks,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.status === 200) {
        toast.success('Document signed');
        setSignModalOpen(false);
        setSignRemarks('');
        setProcessData((prevProcessData) => {
          // create a copy of the previous state
          const updatedProcessData = {
            ...prevProcessData,
            hasUserDoneAnythingAfterReceivingProcess: true,
            isForwardable: res?.data?.isForwardable,
          };

          // Find the document to update
          const documents = updatedProcessData.documents.map((file) => {
            if (file.details._id === fileId) {
              // Update the signedBy array
              return {
                ...file,
                signedBy: [
                  ...file.signedBy,
                  { username: sessionStorage.getItem('username') },
                ],
              };
            }
            return file;
          });

          // Update the documents array in the state
          updatedProcessData.documents = documents;

          // Return the updated state
          return updatedProcessData;
        });
        setCommanLoading((value) => !value);
      }
    } catch (error) {
      console.log('error', error);
      toast.error(error.response.data.message);
      setCommanLoading(false);
    }
  };
  const handleRejectFile = async (processId, fileId) => {
    setCommanLoading(true);
    const rejectUrl = backendUrl + '/rejectDocument';
    try {
      const res = await axios.post(
        rejectUrl,
        {
          processId: processId,
          documentId: fileId,
          reason: reasonOfRejection,
          workFlowToBeFollowed,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.status === 200) {
        toast.success('Document is rejected');
        setProcessData((prevProcessData) => {
          const updatedProcessData = {
            ...prevProcessData,
            hasUserDoneAnythingAfterReceivingProcess: true,
            isRevertable: res?.data?.isRevertable,
          };

          const documents = updatedProcessData.documents.map((file) => {
            if (file.details._id === fileToBeOperated.details._id) {
              // Update the signedBy array
              return {
                ...file,
                rejection: {
                  reason: reasonOfRejection,
                  step: { user: username },
                },
              };
            }
            return file;
          });

          // Update the documents array in the state
          updatedProcessData.documents = documents;

          // Return the updated state
          return updatedProcessData;
        });
      }
    } catch (error) {
      toast.error('not able to reject document');
    }
    CloseRejectFileModal();
    setReasonOfRejection('');
    setCommanLoading(false);
  };
  // remove sign, rejection
  const handleSignRevoke = async () => {
    setCommanLoading(true);
    const url = backendUrl + '/revokeSign';
    try {
      const res = await axios.post(
        url,
        {
          processId: processData?._id,
          documentId: fileToBeOperated.details._id,
          workFlowToBeFollowed,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.status === 200) {
        toast.success(res?.data?.message || 'Success');
        setProcessData((prevProcessData) => {
          // create a copy of the previous state
          const updatedProcessData = {
            ...prevProcessData,
            hasUserDoneAnythingAfterReceivingProcess: true,
            isForwardable: res?.data?.isForwardable,
            isRevertable: res?.data?.isRevertable,
          };

          // Find the document to update
          const documents = updatedProcessData.documents.map((file) => {
            if (file.details._id === fileToBeOperated?.details?._id) {
              // Update the signedBy array
              return {
                ...file,
                signedBy: [
                  ...file.signedBy?.filter(
                    (user) => user.username !== username,
                  ),
                ],
              };
            }
            return file;
          });

          // Update the documents array in the state
          updatedProcessData.documents = documents;

          // Return the updated state
          return updatedProcessData;
        });
      }
    } catch (error) {
      console.log('error', error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setCommanLoading(false);
    }
  };
  const handleRejectFileRevoke = async () => {
    setCommanLoading(true);
    const url = backendUrl + '/revokeRejection';
    try {
      const res = await axios.post(
        url,
        {
          processId: processData?._id,
          documentId: fileToBeOperated.details._id,
          workFlowToBeFollowed,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.status === 200) {
        toast.success(res?.data?.message);
        setProcessData((prevProcessData) => {
          const updatedProcessData = {
            ...prevProcessData,
            hasUserDoneAnythingAfterReceivingProcess: true,
            isForwardable: res?.data?.isForwardable,
            isRevertable: res?.data?.isRevertable,
          };

          const documents = updatedProcessData.documents.map((file) => {
            if (file.details._id === fileToBeOperated.details._id) {
              // Update the signedBy array
              return {
                ...file,
                rejection: undefined,
              };
            }
            return file;
          });

          // Update the documents array in the state
          updatedProcessData.documents = documents;

          // Return the updated state
          return updatedProcessData;
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setCommanLoading(false);
    }
  };
  const revokeOperable = (action) => {
    const operatingFile = processData?.documents?.find(
      (doc) => doc?.details?._id == fileToBeOperated?.details?._id,
    );
    if (action === 'sign') {
      return !operatingFile?.signedBy
        ?.map((item) => item?.username)
        ?.includes(sessionStorage.getItem('username'));
    } else if (action === 'reject') {
      return !operatingFile?.rejection;
    } else {
      return false;
    }
  };
  const handleDeleteFile = (index) => {
    if (index >= 0 && index < fileData.length) {
      const updatedFileData = [...fileData];
      updatedFileData.splice(index, 1);
      setFileData(updatedFileData);
    } else {
      console.log('Invalid index provided');
    }
  };
  const truncateFileName = (fname, maxLength = 25) => {
    if (fname.length <= maxLength) {
      return fname;
    } else {
      const [baseName, extension] = fname.split('.').reduce(
        (result, part, index, array) => {
          if (index === array.length - 1) {
            result[1] = part;
          } else {
            result[0] += part;
          }
          return result;
        },
        ['', ''],
      );
      const truncatedName = `${baseName.slice(0, 15)}...${baseName.slice(-2)}`;
      return `${truncatedName}.${extension}`;
    }
  };
  const handleSignClick = async () => {
    // const clickedFile = processData.documents[i];
    await handleSign(processData._id, fileToBeOperated.details._id);
    handleClose();
  };
  const checkFileIsOperable = () => {
    return (
      fileToBeOperated.signedBy
        .map((item) => item.username)
        .includes(username) || fileToBeOperated.rejection
    );
  };

  const [works, setWorks] = useState([]);
  const [selectedWork, setSelectedWork] = useState('');
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
  const handleWorkChange = (e) => {
    setSelectedWork(e.target.value);
  };
  const [sendLoading, setSendLoading] = useState(false);

  const sendToClerk = async () => {
    setSendLoading(true);
    if (selectedWork === '') {
      toast.info('please select work');
      setSendLoading(false);
      return;
    }
    const clerkUrl = backendUrl + `/sendToClerk/${viewId}`;
    try {
      const res = await axios.post(
        clerkUrl,
        {
          work: selectedWork,
          workFlowToBeFollowed: workFlowToBeFollowed,
          remarks,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.status === 200) {
        toast.success('Sent to clerk');
        // setWork('');
        setSendLoading(false);
        queryClient.removeQueries('pendingProcesses');
        setOpenC(false);
        navigate('/processes/work');
      }
    } catch (error) {
      toast.error(error);
      setSendLoading(false);
      setOpenC(false);
    }
  };
  const [approveLoading, setApproveLoading] = useState(false);
  const handleApprove = async () => {
    setApproveLoading(true);
    const appUrl = backendUrl + `/approveProcess/${viewId}`;
    try {
      const res = await axios.post(
        appUrl,
        { workFlowToBeFollowed, currentStep: processData.currentStepNumber },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.status === 200) {
        toast.success('Approved');
        queryClient.removeQueries('pendingProcesses');
        navigate('/processes/work');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setApproveLoading(false);
    }
  };
  const fetchViewData = async () => {
    let shouldNavigate = false;
    try {
      const url = backendUrl + `/getProcess/${viewId}`;
      const res = await axios.post(
        url,
        { workFlowToBeFollowed },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setProcessData(res.data.process);
    } catch (error) {
      shouldNavigate = true;
    }
    setLoading(false);
    if (shouldNavigate) {
      navigate('/processes/work');
      toast.error('Unable to fetch process data');
    }
  };
  useEffect(() => {
    const fetchBranches = async () => {
      const url = backendUrl + '/getBranchesWithDepartments';
      try {
        const { data } = await axios.post(url, null, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setBranches(data.branches);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    const fetchRoles = async () => {
      const url = backendUrl + '/getRoleNames';
      try {
        const res = await axios.post(url, null, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setRoleList(res.data.roles);
      } catch (error) {
        console.error('error');
      }
    };

    fetchViewData();
    fetchBranches();
    fetchRoles();
    getWorks();
  }, []);
  useEffect(() => {
    setLoading(true);
    fetchViewData();
  }, [viewId]);

  const Divider = () => (
    <hr style={{ margin: '5px 0', borderWidth: '0.1px solid' }} />
  );
  const handleEndProcess = async () => {
    setEndProcessLoading(true);
    const endUrl = backendUrl + `/endProcess/${viewId}`;
    try {
      const res = await axios.post(
        endUrl,
        { work },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.status === 200) {
        toast.success('Process ended successfully');
        queryClient.removeQueries('pendingProcesses');
        navigate('/processes/work');
      }
    } catch (error) {
      toast.error(error.response.data.message);
    }
    setEndProcessLoading(false);
  };
  const [endProcessLoading, setEndProcessLoading] = useState(false);
  const deleteModalContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: '20px',
      }}
    >
      <Stack flexDirection="row" gap={3}>
        <Button
          variant="contained"
          size="small"
          color={endProcessLoading ? 'inherit' : 'error'}
          disabled={endProcessLoading}
          onClick={handleEndProcess}
          sx={{
            '&:hover': {
              backgroundColor: '#ff0000',
            },
          }}
        >
          {endProcessLoading ? <CircularProgress size={20} /> : 'Yes'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          disabled={endProcessLoading}
          onClick={() => setOpenE(false)}
          sx={{
            backgroundColor: '#007bff',
            color: 'white',
            '&:hover': {
              backgroundColor: '#0056b3',
            },
          }}
        >
          No
        </Button>
      </Stack>
    </Box>
  );
  const [pickProcessLoading, setPickProcessLoading] = useState(false);
  const pickProcess = async () => {
    setPickProcessLoading(true);
    const url = backendUrl + `/pickProcess/${processData._id}`;
    try {
      const res = await axios.post(
        url,
        { workFlowToBeFollowed },
        {
          headers: {
            Authorization: `bearer ${token}`,
          },
        },
      );
      setProcessData((prev) => {
        return {
          ...prev,
          currentActorUser: username,
        };
      });
      // console.log(res);
    } catch (error) {
      console.log(error.message);
    } finally {
      setPickProcessLoading(false);
    }
  };
  useEffect(() => {
    if (pickedProcesses.includes(processData?._id)) {
      navigate('/processes/work');
      toast.info('Process is picked by other user');
    }
  }, [pickedProcesses]);
  const redirectToTimeline = (processName) => {
    const url = `/dashboard/timeLine?data=${processName}`;
    console.log('first');
    navigate(url);
  };
  // condition variables
  const upload_Work = processData?.workFlow[processData?.currentStepNumber - 1];
  const userNotFirstInWorkflow = !processData?.workFlow[0]?.users
    .map((userObj) => userObj.user)
    .includes(username);
  const userNotLastInWorkflow = !processData?.workFlow[
    processData.workFlow.length - 1
  ]?.users
    .map((userObj) => userObj.user)
    .includes(username);
  const userIsLastInWorkflow = processData?.workFlow[
    processData.workFlow.length - 1
  ]?.users
    .map((userObj) => userObj.user)
    .includes(username);

  const disableNext = () => {
    console.log('disabled');
    if (
      processData?.workFlow[processData?.currentStepNumber - 1]?.work !==
      'e-sign'
    ) {
      return false;
    }

    let check = false;
    processData?.documents?.some((document) => {
      const { signedBy, details, rejection } = document;

      // Rejection check: Disable Next if the document is rejected by the current user and not in prevlogs
      const isRejectedByCurrentUser =
        rejection &&
        rejection?.step?.step === processData?.currentStepNumber &&
        rejection?.step?.user === username &&
        !processData?.rejectedDocIdsInPrevLogs?.includes(details._id);

      if (isRejectedByCurrentUser) {
        check = true; // Disable Next if the document is currently rejected by the current user
        return true; // Exit early, no need to check further
      }

      // Skip signing check if the document was previously rejected
      if (
        rejection &&
        processData?.rejectedDocIdsInPrevLogs?.includes(details._id)
      ) {
        return false;
      }

      // Check if the document is not signed by anyone yet
      if (signedBy.length === 0) {
        check = true; // Disable Next if the document is unsigned
        return true; // Exit early, no need to check further
      }

      // Check if the document is pending signing in the current step by any required user
      if (signedBy.includes(username)) {
        check = true; // Disable Next if the document is pending signature by any required user
        return true; // Exit early, no need to check further
      }

      return false;
    });

    return check;
  };

  const disableReject = () => {
    processData?.documents?.some((document) => {
      const { signedBy, details, rejection } = document;

      // Rejection check: Disable Next if the document is rejected by the current user and not in prevlogs
      const isRejectedByCurrentUser =
        rejection &&
        rejection?.step?.step === processData?.currentStepNumber &&
        rejection?.step?.user === username &&
        !processData?.rejectedDocIdsInPrevLogs?.includes(details._id);

      if (isRejectedByCurrentUser) {
        return true; // Exit early, no need to check further
      }
      return false;
    });
  };
  const [openFilesList, setOpneFilesList] = useState(false);
  const handleOpenFilesList = () => {
    setOpneFilesList(true);
  };
  const handleCloseFilesList = () => {
    setOpneFilesList(false);
  };

  //   details
  const details = [
    {
      label: 'Process Name',
      value: processData?.name,
    },
    // {
    //   label: 'File Name',
    //   value:
    //     processData?.documents?.length <= 4 ? (
    //       <Stack flexDirection="row" gap={1} flexWrap="wrap">
    //         {processData?.documents?.map((item, index) => {
    //           const name = item.details.name;
    //           const work = name.split('_')[1]; // Assuming work can be extracted here
    //           return (
    //             <Typography
    //               px={1}
    //               borderRadius={1}
    //               className={styles.workName}
    //               key={index}
    //               sx={{ border: '1px solid lightgray' }}
    //             >
    //               {work}
    //             </Typography>
    //           );
    //         })}
    //       </Stack>
    //     ) : (
    //       <Button onClick={handleOpenFilesList} size="small">
    //         View
    //       </Button>
    //     ),
    // },
    {
      label: 'Status',
      value: processData?.completed ? (
        <span style={{ color: 'green' }}>Completed</span>
      ) : (
        <span style={{ color: 'red' }}>Pending</span>
      ),
    },
    {
      label: 'Document Path',
      value: processData?.documentsPath,
    },
    {
      label: 'Created Date',
      value: moment(processData?.createdAt).format('DD-MM-YYYY hh:mm A'),
    },
    {
      label: 'Previous Step',
      value:
        processData?.lastStepDone === 0
          ? 'Process is just initiated'
          : `last step was ${lastWork?.work}`,
    },
    {
      label: 'Remarks',
      value: processData?.remarks ? processData?.remarks : 'No Remarks',
    },
  ];
  const InfoRow = ({ label, value }) => (
    <Grid2
      item
      size={{ xs: 12, sm: 4, md: 3 }}
      minWidth={'fit-content'}
      sx={{
        padding: '15px',
        backgroundColor: '#f9f9f9', // Subtle background
        borderRadius: '8px',
        border: '1px solid lightgray',
        borderTop: '3px solid var(--border-color)',
        width: '100%',
      }}
    >
      <Typography
        variant="body2"
        fontWeight="700"
        sx={{ color: '#333', marginBottom: '5px' }} // Key styling
      >
        {label}
      </Typography>
      <Typography variant="body1" sx={{ color: '#555' }}>
        {value}
      </Typography>
    </Grid2>
  );

  // workflow
  const initialUser = {
    department: '',
    branch: '',
    head: '',
    workFlow: processData?.workFlow || [],
  };
  const [formData, setFormData] = useState({ ...initialUser });
  const [flow, setFlow] = useState({ step: '' });
  useEffect(() => {
    setFlow((prevFlow) => ({
      ...prevFlow,
      step: processData?.workFlow?.length + 1,
    }));
  }, [processData?.workFlow]);
  const [usersOnStep, setUsersOnStep] = useState([]);
  const [workFlowDialogOpen, setWorkFlowDialogOpen] = useState(false);
  const handleWorkFlow = () => {
    if (formData.workFlow.length === 0) {
      setFinalBranch(formData.branch);
    }
    if (usersOnStep.length > 0) {
      console.log(formData);
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
            console.log(updatedWorkFlow, i);
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
  useEffect(() => {
    setFormData((prev) => ({ ...prev, workFlow: processData?.workFlow }));
  }, [processData?.workFlow]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const submitWorkflow = async () => {
    setSubmitLoading(true);
    const url = backendUrl + '/updateProcessWorkflow';
    try {
      const response = await axios.post(
        url,
        { processId: processData?._id, steps: formData?.workFlow },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success(response?.data?.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setSubmitLoading(false);
    }
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
              maxHeight: 'fit-content',
              position: 'relative',
              backgroundColor: ' white',
              borderRadius: '10px',
              border: '1px solid lightgray',
              boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
            }}
          >
            <Stack alignItems={'flex-end'} padding={1}>
              <TextField
                fullWidth
                value={work}
                sx={{
                  maxWidth: '150px',
                }}
                label="Select Work"
                onChange={(e) => setWork(e.target.value)}
                select
              >
                {works.map((item) => (
                  <MenuItem key={item.name} value={item.name}>
                    {item?.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {processData && (
              <>
                {processData?.samples?.length ? (
                  <Box sx={{ padding: '10px' }}>
                    <Accordion
                      sx={{
                        // border: "1px solid",
                        boxShadow:
                          'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="samples"
                        id="samples"
                      >
                        <h3>Sample Documents : </h3>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ width: '99%', overflow: 'auto' }}>
                          <Stack
                            flexDirection="row"
                            gap={1}
                            flexWrap="wrap"
                            justifyContent="center"
                          >
                            {processData?.samples?.map((file, index) => {
                              // const i = index;
                              const clickedFile = processData?.documents[index];
                              return (
                                <Box
                                  sx={{ padding: '10px' }}
                                  key={file?.details?._id}
                                >
                                  <Stack
                                    sx={{
                                      minHeight: 'fit-content',
                                      width: '250px',
                                      borderRadius: '15px',
                                      border: '1px solid lightgray',
                                      flex: '1 1 auto',
                                      margin: '10px',
                                      backgroundColor: 'white',
                                      boxShadow:
                                        '2px 2px 6px -1px rgba(0,0,0,0.2), 0px 0px 8px 0px rgba(0,0,0,-0.86), 0px 0px 6px 3px rgba(1,1,2,0.12)',
                                    }}
                                    // gap={2}
                                  >
                                    <Stack alignItems="flex-end">
                                      <IconButton
                                        onClick={(e) => {
                                          handleClick2(
                                            e,
                                            file?.details?.name,
                                            file,
                                          );
                                          setFileToBeOperated({
                                            ...file,
                                          });
                                        }}
                                      >
                                        <MoreVertIcon />
                                      </IconButton>
                                    </Stack>
                                    <div>
                                      <div className={styles.iconContainer}>
                                        <img
                                          style={{
                                            width: '70px',
                                            height: '70px',
                                          }}
                                          src={
                                            ImageConfig[
                                              file?.details?.name
                                                .split('.')
                                                .pop()
                                                .toLowerCase()
                                            ] || ImageConfig['default']
                                          }
                                          alt=""
                                        />
                                      </div>
                                      <div className={styles.fileNameContainer}>
                                        <Tooltip
                                          title={file.details.name}
                                          enterDelay={900}
                                        >
                                          <h4>
                                            {file?.details?.name <= 20
                                              ? file.details.name
                                              : truncateFileName(
                                                  file.details.name,
                                                )}
                                          </h4>
                                        </Tooltip>
                                      </div>
                                      <div className={styles.fileTimeContainer}>
                                        <p>
                                          -
                                          {moment(
                                            file?.details?.createdOn,
                                          ).format('DD-MMM-YYYY hh:mm A')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className={styles.filePartTwo}>
                                      {/* <p className={styles.fileElements}>
                                        <b>Work assigned</b> :{file?.workName}
                                      </p> */}
                                      <p className={styles.fileElements}>
                                        <b>Cabinet no</b> : {file?.cabinetNo}
                                      </p>
                                    </div>
                                  </Stack>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                ) : null}
                <Stack sx={{ padding: '5px' }}>
                  <Box>
                    <Grid2 container spacing={3} p={1}>
                      {details.map((detail, index) => (
                        <InfoRow
                          key={index}
                          label={detail.label}
                          value={detail.value}
                        />
                      ))}
                    </Grid2>

                    <Box sx={{ width: '99%', overflow: 'auto' }}>
                      <Stack
                        flexDirection="row"
                        gap={1}
                        flexWrap="wrap"
                        justifyContent="center"
                      >
                        {processData?.documents?.map((file, index) => {
                          const clickedFile = processData?.documents[index];
                          return (
                            <Box
                              sx={{ padding: '10px' }}
                              key={file?.details?._id}
                            >
                              <Stack
                                sx={{
                                  minHeight: 'fit-content',
                                  width: '270px',
                                  borderRadius: '15px',
                                  border: '1px solid lightgray',
                                  flex: '1 1 auto',
                                  margin: '10px',
                                  backgroundColor: 'white',
                                  boxShadow: 'rgba(0, 0, 0, 0.16) 0px 1px 4px',
                                }}
                              >
                                <div className={styles.filePartOne}>
                                  <div className={styles.fileHeading}>
                                    {published != 'true' && (
                                      <h5
                                        style={{
                                          height: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                        }}
                                      >
                                        {file?.signedBy
                                          .map((item) => item.username)
                                          .includes(username) ? (
                                          <Button color="success">
                                            Signed
                                          </Button>
                                        ) : (
                                          <Button color="error">
                                            Un-Signed
                                          </Button>
                                        )}
                                        {file?.rejection &&
                                        Object.keys(file.rejection).length >
                                          0 ? (
                                          <p
                                            style={{
                                              color: 'red',
                                              display: 'flex',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <Button
                                              onClick={(e) => {
                                                handleOpenRejectedMenu(e);
                                                setFile(file);
                                              }}
                                              startIcon={<IconBan />}
                                              sx={{ color: 'red' }}
                                            >
                                              Rejected
                                            </Button>
                                          </p>
                                        ) : (
                                          <Button
                                            onClick={(e) => {
                                              handleOpenSignedByMenu(e);
                                              setSignedBy(file.signedBy);
                                            }}
                                            style={{
                                              color: 'green',
                                              // zIndex: '999',
                                            }}
                                          >
                                            signed By
                                          </Button>
                                        )}
                                      </h5>
                                    )}
                                    <IconButton
                                      onClick={(e) => {
                                        handleClick1(
                                          e,
                                          file?.details?.name,
                                          file,
                                        );
                                        setFileToBeOperated({
                                          ...file,
                                        });
                                      }}
                                      // disabled={published == "true"}
                                    >
                                      <MoreVertIcon />
                                    </IconButton>
                                  </div>
                                </div>

                                <div>
                                  <div className={styles.iconContainer}>
                                    <img
                                      style={{
                                        width: '70px',
                                        height: '70px',
                                      }}
                                      src={
                                        ImageConfig[
                                          file?.details?.name
                                            .split('.')
                                            .pop()
                                            .toLowerCase()
                                        ] || ImageConfig['default']
                                      }
                                      alt=""
                                    />
                                  </div>
                                  <div className={styles.fileNameContainer}>
                                    <Tooltip
                                      title={file.details.name}
                                      enterDelay={900}
                                    >
                                      <h4>
                                        {file?.details?.name <= 20
                                          ? file.details.name
                                          : truncateFileName(file.details.name)}
                                      </h4>
                                    </Tooltip>
                                  </div>
                                  <div className={styles.fileTimeContainer}>
                                    <p>
                                      -{' '}
                                      {moment(file?.details?.createdOn).format(
                                        'DD-MMM-YYYY hh:mm A',
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className={styles.filePartTwo}>
                                  {/* <p className={styles.fileElements}>
                                    <b>Work assigned</b> :{file?.workName}
                                  </p> */}
                                  <p className={styles.fileElements}>
                                    <b>Cabinet no</b> : {file?.cabinetNo}
                                  </p>
                                </div>
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Box>
                  {processData?.replacementsWithRef.length ? (
                    <Replacements
                      data={processData?.replacementsWithRef}
                      handleView={handleView}
                    />
                  ) : null}
                  {(work === 'publish' || upload_Work?.work === 'publish') &&
                    !processData.isInterBranchProcess &&
                    !processData.isHead && (
                      <>
                        <Stack justifyContent="center" flexDirection="row">
                          <Button
                            onClick={() => modalOpen('head')}
                            variant="outlined"
                            disabled={completeProcessLoading}
                            sx={{ m: 1 }}
                          >
                            publish to headOffice
                          </Button>
                          <Button
                            onClick={() => modalOpen('comman')}
                            disabled={completeProcessLoading}
                            variant="outlined"
                            sx={{ m: 1 }}
                          >
                            publish to branches
                          </Button>
                        </Stack>
                      </>
                    )}
                  {(work === 'upload' ||
                    ((work === '' || work == undefined) &&
                      upload_Work?.work === 'upload')) &&
                    processData.currentActorUser == username &&
                    !processData?.isHead &&
                    !processData?.isToBeSentToClerk && (
                      <Box sx={{ padding: '5px' }}>
                        <Typography
                          variant="h5"
                          sx={{ textAlign: 'center', mb: 2 }}
                        >
                          Upload Section
                        </Typography>
                        <Stack
                          alignItems="center"
                          sx={{ margin: '5px', gap: '1px' }}
                        >
                          <Box
                            sx={{
                              padding: '5px',
                              width: '100%',
                              maxWidth: '600px',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            <Grid2
                              container
                              spacing={3}
                              sx={{ marginBottom: '20px' }}
                            ></Grid2>

                            <TextField
                              fullWidth
                              variant="outlined"
                              label="Work Name"
                              value={workName}
                              error={!!workNameError}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                const isValidInput = /^[a-zA-Z0-9\s]*$/.test(
                                  inputValue,
                                );

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
                              inputProps={{ min: 1 }}
                              onKeyDown={(e) => {
                                (e.key === 'e' ||
                                  e.key === 'E' ||
                                  e.key === '-' ||
                                  e.key === '+') &&
                                  e.preventDefault();
                              }}
                              onChange={(e) => setCabinetNo(e.target.value)}
                              sx={{ mb: 2, backgroundColor: 'white' }}
                            />
                            <Box>
                              <input
                                style={{
                                  border: '1px solid lightgray',
                                  width: '100%',
                                  padding: '10px',
                                }}
                                type="file"
                                onChange={handleFileSelect}
                                ref={fileInputRef}
                                accept=".pdf"
                              />
                            </Box>
                            <Typography variant="body2" color="error">
                              {fileInputError}
                            </Typography>
                            <div style={{ padding: '10px', width: '100%' }}>
                              <Alert severity="error" icon={<InfoOutlined />}>
                                <AlertTitle>{'Note'}</AlertTitle>
                                <Typography sx={{ my: 0.4 }}>
                                  Only the following file types are allowed for
                                  upload :
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
                                variant="outlined"
                                onClick={handleFileAdd}
                                sx={{ mt: 2 }}
                              >
                                Add File
                              </Button>
                            </Box>
                          </Box>
                          <TableContainer
                            component={Paper}
                            sx={{
                              boxShadow: 'rgba(0, 0, 0, 0.16) 0px 1px 4px',
                            }}
                            elevation={3}
                            className={styles.tableContainer}
                          >
                            <Table>
                              <TableHead>
                                <TableRow className={styles.tableRow}>
                                  <TableCell className={styles.tableHeaderCell}>
                                    File Name
                                  </TableCell>
                                  <TableCell className={styles.tableHeaderCell}>
                                    Work Name
                                  </TableCell>
                                  <TableCell className={styles.tableHeaderCell}>
                                    Cabinet Name
                                  </TableCell>
                                  <TableCell className={styles.tableHeaderCell}>
                                    Remove
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {fileData.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={4} align="center">
                                      No data available
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  fileData.map((file, index) => (
                                    <TableRow key={index}>
                                      <TableCell>{file.file.name}</TableCell>
                                      <TableCell>{file.workName}</TableCell>
                                      <TableCell>{file.cabinetNo}</TableCell>
                                      <TableCell>
                                        <IconButton
                                          onClick={() =>
                                            handleDeleteFile(index)
                                          }
                                        >
                                          <DeleteOutlineIcon />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          {fileData.length > 0 && (
                            <Stack margin={2}>
                              {/* cheche */}
                              <Button
                                variant="outlined"
                                onClick={handleUpload}
                                disabled={reUploadLoading}
                              >
                                {reUploadLoading ? (
                                  <CircularProgress size={25} />
                                ) : (
                                  <>
                                    <IconUpload
                                      size={20}
                                      style={{ marginRight: '3px' }}
                                    />
                                    <p>Upload</p>
                                  </>
                                )}
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      </Box>
                    )}
                  <Modal
                    open={isCompleteModalOpen}
                    className="create-folder-modal"
                  >
                    <div
                      style={{ gap: '10px', position: 'relative' }}
                      className="create-folder-modal-content-container"
                    >
                      {completeModalContent}
                    </div>
                  </Modal>
                  <Modal
                    open={rejectFileModalOpen}
                    // onClose={CloseRejectFileModal}
                    className={styles.modalDesign}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        position: 'relative',
                        padding: '15px',
                        borderRadius: '10px',
                        backgroundColor: '#fff',
                        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <Box
                        sx={{
                          background: '#4E327E',
                          padding: '5px',
                          mb: '10px',
                          borderRadius: '5px',
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ marginBottom: '10px', color: 'white' }}
                        >
                          Give reason why you want to reject this file!!!
                        </Typography>
                      </Box>
                      <Stack
                        alignItems="center"
                        justifyContent="center"
                        spacing={1}
                        sx={{
                          alignSelf: 'center',
                          marginBottom: '10px',
                          width: '100%',
                        }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Typography>Reason of rejection:</Typography>
                          <TextField
                            variant="outlined"
                            size="small"
                            fullWidth
                            onChange={(e) =>
                              setReasonOfRejection(e.target.value)
                            }
                          />
                        </Box>
                      </Stack>
                      <Stack flexDirection="row" gap={2}>
                        <Button
                          variant="contained"
                          color="error"
                          disabled={commanLoading}
                          onClick={() =>
                            reasonOfRejection
                              ? handleRejectFile(
                                  processData._id,
                                  fileToBeOperated?.details?._id,
                                )
                              : toast.warning('Provide remarks')
                          }
                        >
                          {commanLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            ' Reject File'
                          )}
                        </Button>
                        <Button
                          variant="contained"
                          disabled={commanLoading}
                          // color="error"
                          onClick={() => setRejectFileModalOpen(false)}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </Box>
                  </Modal>
                  <Modal open={isModalOpen} className="create-folder-modal">
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3px',
                        position: 'relative',
                        padding: '20px',
                        width: '400px',
                        borderRadius: '10px',
                        backgroundColor: '#f5f5f5', // Light gray background
                        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          color: 'white',
                          marginBottom: '10px',
                          borderRadius: '5px',
                          background: 'var(--themeColor)',
                          width: '100%',
                          textAlign: 'center',
                        }}
                      >
                        Workflow Skip Form
                      </Typography>
                      <Typography>Do you want to skip any step?</Typography>
                      <Stack
                        direction="row"
                        spacing={4}
                        sx={{ marginBottom: '20px' }}
                      >
                        <FormControlLabel
                          value="yes"
                          control={
                            <Radio
                              checked={selectedOption === 'yes'}
                              onChange={handleOptionChange}
                              value="yes"
                              name="radio-yes"
                            />
                          }
                          label={
                            <Typography sx={{ color: '#333' }}>Yes</Typography>
                          }
                        />
                        <FormControlLabel
                          value="no"
                          control={
                            <Radio
                              checked={selectedOption === 'no'}
                              onChange={handleOptionChange}
                              value="no"
                              name="radio-no"
                            />
                          }
                          label={
                            <Typography sx={{ color: '#333' }}>No</Typography>
                          }
                        />
                      </Stack>

                      {selectedOption === 'yes' && (
                        <Stack
                          width="100%"
                          spacing={3}
                          sx={{ marginBottom: '20px' }}
                        >
                          <Typography sx={{ color: '#333' }}>
                            Step Number to forward process:
                          </Typography>
                          <Select
                            value={selectedStep}
                            onChange={handleStepChange}
                            size="small"
                            sx={{ minWidth: '150px', color: '#333' }}
                          >
                            {processData?.workFlow
                              .filter(
                                (item) =>
                                  !item.users.some(
                                    (user) => user.user === username,
                                  ),
                              )
                              .filter((item) => item.step > publishCheck.step)
                              .filter(
                                (item) =>
                                  item.step <=
                                  processData?.maxReceiverStepNumber,
                              )
                              .map((item) => (
                                <MenuItem key={item.step} value={item.step}>
                                  forward to{' '}
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
                                  </b>
                                  (step - {item.step})
                                </MenuItem>
                              ))}
                          </Select>
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
                        <TextField
                          multiline
                          rows={3}
                          value={remarks}
                          variant="outlined"
                          size="small"
                          fullWidth
                          onChange={(e) => setRemarks(e.target.value)}
                        />
                      </Stack>
                      <Stack flexDirection="row" gap={1}>
                        <Button
                          variant="contained"
                          onClick={() => handleForward(false)}
                          disabled={forwardProcessLoading}
                          color={forwardProcessLoading ? 'inherit' : 'primary'}
                        >
                          {forwardProcessLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            'Forward'
                          )}
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleModalClose}
                          disabled={forwardProcessLoading}
                          color="error"
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </Box>
                  </Modal>
                  <Modal open={rejectModalOpen} className={styles.modalDesign}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        position: 'relative',
                        padding: '20px',
                        borderRadius: '10px',
                        backgroundColor: '#fff',
                        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <Box
                        sx={{
                          background: 'var(--themeColor)',
                          padding: '5px',
                          mb: '10px',
                          borderRadius: '5px',
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ marginBottom: '10px', color: 'white' }}
                        >
                          Give reason to reject this process!!
                        </Typography>
                      </Box>
                      <Stack
                        alignItems="flex-start"
                        justifyContent="center"
                        spacing={1}
                        sx={{
                          alignSelf: 'flex-start',
                          marginBottom: '10px',
                          width: '100%',
                        }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Typography>Remarks:</Typography>
                          <TextField
                            multiline
                            variant="outlined"
                            value={remarks}
                            size="large"
                            sx={{ width: '100%' }}
                            fullWidth
                            onChange={(e) => setRemarks(e.target.value)}
                          />
                        </Box>
                      </Stack>
                      <Stack flexDirection="row" gap={1}>
                        <Button
                          variant="contained"
                          color={rejectProcessLoading ? 'inherit' : 'error'}
                          onClick={() => {
                            // if (remarks) {
                            rejectProcess();
                            // } else {
                            //     toast.warning('Provide remarks');
                            // }
                          }}
                        >
                          {rejectProcessLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            'Reject'
                          )}
                        </Button>
                        <Button
                          variant="contained"
                          disabled={rejectProcessLoading}
                          onClick={CloseRejectModal}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </Box>
                  </Modal>
                  <Modal
                    open={open}
                    onClose={modalClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                  >
                    <Box sx={style}>
                      <Typography
                        variant="h6"
                        sx={{ textAlign: 'center', marginBottom: '10px' }}
                      >
                        PUBLISH DETAILS :
                      </Typography>
                      <Grid2
                        container
                        spacing={4}
                        sx={{ marginBottom: '10px' }}
                      >
                        <Grid2 item size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            select
                            label="Branch"
                            variant="outlined"
                            onChange={handleBranchChange}
                          >
                            {branches
                              .filter((item) => item.name === headOfficeName)
                              ?.map((branch) => (
                                <MenuItem
                                  value={branch.name}
                                  key={branch._id}
                                  style={{
                                    margin: '2px',
                                    backgroundColor:
                                      selectedBranch?.name?.includes(
                                        branch.name,
                                      )
                                        ? 'lightblue'
                                        : 'initial',
                                  }}
                                >
                                  {branch.name}
                                </MenuItem>
                              ))}
                          </TextField>
                        </Grid2>
                        <Grid2 item size={{ xs: 12 }}>
                          <Autocomplete
                            multiple
                            id="checkboxes-tags-demo"
                            options={(selectedBranch?.departments || [])
                              .filter(
                                (item) => !processData.name.includes(item.name),
                              )
                              .map((item) => item.name || [])}
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
                              <TextField
                                {...params}
                                label="Select Departments"
                                variant="outlined"
                              />
                            )}
                            value={selectedDepartments}
                            onChange={handleChange}
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
                            control={
                              <Checkbox
                                checked={selectAllCheck}
                                disabled={!selectedBranch}
                                onChange={handleSelectAll}
                                name="selectAllDepartments"
                              />
                            }
                            label="SELECT ALL DEPARTMENTS"
                          />
                        </Grid2>
                        <Grid2 item size={{ xs: 12 }}>
                          <Autocomplete
                            multiple
                            id="roles-autocomplete"
                            options={roleList}
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
                              <TextField
                                {...params}
                                label="Select Roles"
                                variant="outlined"
                              />
                            )}
                            value={selectedRoles}
                            onChange={(event, newValue) =>
                              handleRoleChange(newValue)
                            }
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
                        </Grid2>
                      </Grid2>
                      <Stack alignItems="center">
                        <Box>
                          <Button
                            variant="contained"
                            // color={publishLoading ? "primary" : "inherit"}
                            onClick={() => handlePublish('head')}
                          >
                            Publish
                          </Button>
                        </Box>
                      </Stack>
                    </Box>
                  </Modal>
                  <Modal
                    open={openComman}
                    onClose={closeCommanModal}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                  >
                    <Box sx={style}>
                      <Typography
                        variant="h6"
                        sx={{ textAlign: 'center', marginBottom: '10px' }}
                      >
                        PUBLISH DETAILS:
                      </Typography>
                      <Grid container spacing={4} sx={{ marginBottom: '10px' }}>
                        <Grid item xs={12}>
                          <Autocomplete
                            multiple
                            id="checkboxes-tags-demo"
                            options={branches
                              .filter((item) => item.name !== headOfficeName)
                              .filter(
                                (item) => !processData.name.includes(item.name),
                              )
                              .filter((item) => item.departments.length >= 0)
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
                              <TextField
                                {...params}
                                label="Select Branches"
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
                            control={
                              <Checkbox
                                checked={selectAllCheckBranches}
                                // disabled={!selectedBranch}
                                onChange={handleSelectAllBranches}
                                name="selectAllBranches"
                              />
                            }
                            label="SELECT ALL BRANCHES"
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Autocomplete
                            multiple
                            id="roles-autocomplete"
                            options={roleList}
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
                              <TextField
                                {...params}
                                label="Select Roles"
                                variant="outlined"
                              />
                            )}
                            value={selectedRoles}
                            onChange={(event, newValue) =>
                              handleRoleChange(newValue)
                            }
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
                        </Grid>
                      </Grid>
                      <Stack alignItems="center">
                        <Box>
                          <Button
                            variant="contained"
                            onClick={() => handlePublish('comman')}
                          >
                            publish
                          </Button>
                        </Box>
                      </Stack>
                    </Box>
                  </Modal>
                  <Menu
                    anchorEl={anchorEl2}
                    open={Boolean(anchorEl2)}
                    onClose={handleCloseSignedBymenu}
                    sx={{
                      '& .MuiMenu-paper': {
                        p: '10px !important',
                        maxHeight: '300px',
                        width: '200px',
                      },
                      '& ul': { p: '0px !important' },
                    }}
                  >
                    <Typography
                      textAlign="center"
                      variant="body1"
                      sx={{
                        background: 'var(--themeColor)',
                        color: 'white',
                        p: 1,
                      }}
                    >
                      USERNAMES
                    </Typography>
                    {signedBy?.length ? (
                      <Typography textAlign="center" variant="body2">
                        {signedBy.map((item) => item.username).join(', ')}
                      </Typography>
                    ) : (
                      <Typography
                        textAlign="center"
                        variant="body2"
                        color="red"
                      >
                        NO SIGNS
                      </Typography>
                    )}
                  </Menu>
                  <Menu
                    anchorEl={rejectedMenu}
                    open={Boolean(rejectedMenu)}
                    onClose={() => setRejectedMenu(false)}
                  >
                    <div
                      style={{
                        padding: '10px',
                        maxWidth: '300px',
                        maxHeight: '150px',
                        overflow: 'auto',
                      }}
                    >
                      <strong>Rejected By:</strong>{' '}
                      {file?.rejection?.step?.user}
                      <br />
                      <strong>Reason:</strong> {file?.rejection?.reason}
                    </div>
                  </Menu>
                  <Menu
                    anchorEl={anchorEl1}
                    open={Boolean(anchorEl1)}
                    onClose={handleClose}
                    PaperProps={{ elevation: 2 }}
                  >
                    <MenuItem
                      disabled={
                        itemName.split('.').pop().trim() === 'zip' ||
                        commanLoading
                      }
                      sx={{ gap: '5px' }}
                      onClick={() => {
                        handleView(fileToBeOperated?.details?.path, itemName);
                        handleClose();
                      }}
                    >
                      <IconEye />
                      View
                    </MenuItem>
                    <MenuItem
                      disabled={
                        itemName?.split('.').pop().trim() === 'zip' ||
                        commanLoading
                      }
                      sx={{ gap: '5px' }}
                      onClick={() => {
                        handleDownload(processData?.documentsPath, itemName);
                        handleClose();
                      }}
                    >
                      <IconDownload />
                      Download
                    </MenuItem>
                    {initiator && !processData?.completed ? (
                      <MenuItem
                        sx={{ gap: '5px' }}
                        onClick={() => {
                          handleOpenReplaceDialog();
                        }}
                        disabled={commanLoading}
                      >
                        <IconReplace />
                        Replace
                      </MenuItem>
                    ) : null}
                    {operable &&
                      username !== 'admin' &&
                      processData.currentActorUser === username && (
                        <div>
                          <MenuItem
                            sx={{ gap: '5px' }}
                            onClick={async () => {
                              // await handleSignClick();
                              setSignModalOpen(true);
                            }}
                            disabled={
                              checkFileIsOperable() ||
                              publishCheck?.work === 'upload' ||
                              commanLoading
                            }
                          >
                            <IconWritingSign />
                            Sign
                          </MenuItem>
                          <MenuItem
                            sx={{ gap: '5px' }}
                            onClick={() => {
                              handleClose();
                              openRejectFileModal();
                            }}
                            disabled={
                              checkFileIsOperable() ||
                              publishCheck?.work === 'upload' ||
                              commanLoading
                            }
                          >
                            <IconFileOff />
                            Reject
                          </MenuItem>
                          {/* revoke */}
                          <MenuItem
                            sx={{ gap: '5px' }}
                            onClick={async () => {
                              handleSignRevoke() || commanLoading;
                            }}
                            disabled={revokeOperable('sign')}
                          >
                            <IconWritingSign />
                            Sign Revoke
                          </MenuItem>
                          <MenuItem
                            sx={{ gap: '5px' }}
                            onClick={() => {
                              handleRejectFileRevoke() || commanLoading;
                            }}
                            disabled={revokeOperable('reject')}
                          >
                            <IconFileOff />
                            Reject Revoke
                          </MenuItem>
                        </div>
                      )}
                    {/* <hr /> */}
                  </Menu>
                  <Menu
                    anchorEl={anchorEl3}
                    open={Boolean(anchorEl3)}
                    onClose={sampleDocMenuClose}
                    PaperProps={{ elevation: 2 }}
                  >
                    <MenuItem
                      disabled={itemName.split('.').pop().trim() === 'zip'}
                      sx={{ gap: '5px' }}
                      onClick={() => {
                        handleView(fileToBeOperated?.details?.path, itemName);
                        handleClose();
                      }}
                    >
                      <IconEye />
                      View
                    </MenuItem>
                    <MenuItem
                      disabled={itemName?.split('.').pop().trim() === 'zip'}
                      sx={{ gap: '5px' }}
                      onClick={() => {
                        handleDownload(processData?.documentsPath, itemName);
                        handleClose();
                      }}
                    >
                      <IconDownload />
                      Download
                    </MenuItem>
                  </Menu>
                </Stack>
              </>
            )}
            <Dialog fullWidth open={signModalOpen} maxWidth="xs">
              <form>
                <DialogTitle
                  sx={{ background: 'var(--themeColor)', m: 1, color: 'white' }}
                >
                  Sign Remarks
                </DialogTitle>
                <DialogContent>
                  <TextField
                    onChange={(e) => setSignRemarks(e.target.value)}
                    fullWidth
                    required
                  />
                </DialogContent>
                <DialogActions>
                  <Button
                    disabled={commanLoading}
                    onClick={() => setSignModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={commanLoading}
                    variant="contained"
                    onClick={handleSignClick}
                  >
                    {commanLoading ? <CircularProgress size={22} /> : 'Submit'}
                  </Button>
                </DialogActions>
              </form>
            </Dialog>
            <Dialog open={openC}>
              <Typography
                variant="h6"
                sx={{
                  textAlign: 'center',
                  padding: '10px',
                  backgroundColor: 'var(--themeColor)',
                  color: 'white',
                  margin: '10px',
                  borderRadius: '5px',
                }}
              >
                Select work
              </Typography>
              <Box width={300} padding={1}>
                <Typography variant="body1">Work:</Typography>
                <FormControl fullWidth variant="outlined">
                  <Select
                    size="small"
                    name="work"
                    onChange={handleWorkChange}
                    value={selectedWork}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {works
                      ?.filter((item) => item.name !== 'e-sign')
                      ?.map((data) => (
                        <MenuItem key={data.name} value={data.name}>
                          {data.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <Typography variant="body1" mt={1}>
                  Remarks :
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  onChange={(e) => setRemarks(e.target.value)}
                />
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
                  color={!sendLoading ? 'primary' : 'inherit'}
                  sx={{ width: '100px' }}
                  onClick={() => {
                    sendToClerk(processData?.workFlowToBeFollowed);
                  }}
                >
                  {!sendLoading ? (
                    'SEND'
                  ) : (
                    <CircularProgress size={20}></CircularProgress>
                  )}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => setOpenC(false)}
                  disabled={sendLoading}
                  sx={{ width: '100px' }}
                >
                  Cancel
                </Button>
              </DialogActions>
            </Dialog>
            <Dialog open={openE}>
              <DialogTitle textAlign="center">
                Are you sure you want to end this process here?
              </DialogTitle>
              {deleteModalContent}
            </Dialog>
            {/* </Paper> */}
            {processData && published != 'true' && (
              <div
                style={{
                  width: '100%',
                  padding: '15px',
                }}
              >
                {processData.currentActorUser === username ||
                processData?.isToBeSentToClerk ||
                !processData?.isMultiUserStep ? (
                  <Stack
                    alignItems="center"
                    flexDirection="row"
                    gap={3}
                    flexWrap="wrap"
                    justifyContent="center"
                    sx={{ marginX: '10px' }}
                  >
                    {userNotFirstInWorkflow &&
                      !(
                        processData?.isHead && processData?.isToBeSentToClerk
                      ) &&
                      !processData?.completed && (
                        <Button
                          variant="contained"
                          color="error"
                          sx={{ width: '200px' }}
                          onClick={openRejectModal}
                          disabled={
                            // disableReject() ||
                            !processData?.isRevertable ||
                            completeProcessLoading ||
                            approveLoading
                          }
                        >
                          Reject_Process
                        </Button>
                      )}
                    {userNotLastInWorkflow &&
                      !processData?.isToBeSentToClerk &&
                      (processData.isInterBranchProcess
                        ? !processData.isHead
                        : true) &&
                      // work === "" &&
                      !processData.completed && (
                        <Button
                          variant="contained"
                          // sx={{ width: "110px" }}
                          disabled={!processData?.isForwardable}
                          sx={{ width: '200px' }}
                          onClick={openModal}
                        >
                          Next
                        </Button>
                      )}
                    {userIsLastInWorkflow &&
                      !processData.completed &&
                      (!processData.isInterBranchProcess ||
                        (processData.isInterBranchProcess &&
                          processData?.processWorkFlow ===
                            workFlowToBeFollowed &&
                          processData?.workFlow.some((step) =>
                            step.users.some(
                              (userObj) => userObj.user === username,
                            ),
                          ))) && (
                        <Button
                          variant="contained"
                          color="success"
                          disabled={completeProcessLoading}
                          // sx={{ width: "110px" }}
                          sx={{ width: '200px' }}
                          onClick={() => handleForward(false)}
                        >
                          {completeProcessLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            'Complete'
                          )}
                        </Button>
                      )}
                    {processData.isInterBranchProcess &&
                      processData?.isHead &&
                      processData?.processWorkFlow !== workFlowToBeFollowed && (
                        <Stack
                          gap={1}
                          flexDirection="row"
                          justifyContent="center"
                        >
                          <Button
                            disabled={
                              processData.isToBeSentToClerk
                                ? null
                                : approveLoading
                            }
                            onClick={() =>
                              processData.isToBeSentToClerk
                                ? setOpenC(true)
                                : handleApprove()
                            }
                            sx={{ width: '200px' }}
                            variant="contained"
                          >
                            {processData.isToBeSentToClerk ? (
                              'SEND TO CLERK'
                            ) : approveLoading ? (
                              <CircularProgress size={20} />
                            ) : (
                              'Approve'
                            )}
                          </Button>
                        </Stack>
                      )}
                    {processData.processWorkFlow === workflowFollow &&
                    userNotFirstInWorkflow ? (
                      <>
                        {!processData.completed &&
                          userNotLastInWorkflow &&
                          processData?.workFlow.some((step) =>
                            step.users.some(
                              (userObj) => userObj.user === username,
                            ),
                          ) && (
                            <Button
                              variant="contained"
                              color="success"
                              sx={{ width: '200px' }}
                              onClick={() => setIsCompleteModalOpen(true)}
                            >
                              complete process
                            </Button>
                          )}
                      </>
                    ) : null}
                    {processData?.completed && processData.isHead ? (
                      <Stack alignItems="center">
                        <Button
                          onClick={() => setOpenC(true)}
                          size="medium"
                          variant="contained"
                          sx={{ width: '200px' }}
                        >
                          SEND TO CLERK
                        </Button>
                      </Stack>
                    ) : null}
                    {processData?.completed && !processData?.isHead ? (
                      <Stack alignItems="center" m={2}>
                        <Button
                          onClick={() => setOpenE(true)}
                          size="medium"
                          variant="contained"
                          color="error"
                          sx={{ width: '200px' }}
                        >
                          END PROCESS
                        </Button>
                      </Stack>
                    ) : null}
                    <Button
                      variant="contained"
                      sx={{ minWidth: 200 }}
                      onClick={() => redirectToTimeline(processData?.name)}
                    >
                      View Timeline
                    </Button>
                    <Button
                      onClick={() => setWorkFlowDialogOpen((prev) => !prev)}
                      variant="contained"
                    >
                      Update Workflow
                    </Button>
                  </Stack>
                ) : (
                  <Stack alignItems="center">
                    <Button
                      variant="contained"
                      sx={{ width: '200px' }}
                      disabled={pickProcessLoading}
                      onClick={pickProcess}
                    >
                      {pickProcessLoading ? (
                        <CircularProgress size={24} />
                      ) : (
                        'Pick This Process'
                      )}
                    </Button>
                  </Stack>
                )}
              </div>
            )}
            <Drawer
              PaperProps={{
                sx: { padding: 2 }, // Adjust the value as per your needs (e.g., 1, 2, 3 for Material-UI spacing)
              }}
              anchor="right"
              open={workFlowDialogOpen}
              onClose={() =>
                submitLoading ? null : setWorkFlowDialogOpen(false)
              }
            >
              <IconButton
                onClick={() => setWorkFlowDialogOpen(false)}
                sx={{ position: 'absolute', right: '5px', top: '5px' }}
              >
                <IconCircleDashedX />
              </IconButton>
              <Typography variant="h6" textAlign={'center'}>
                Update Workflow
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
                maxStepNumberReached={processData?.maxStepNumberReached}
              />
              <Button
                disabled={submitLoading}
                variant="contained"
                onClick={submitWorkflow}
                sx={{ display: 'block', mx: 'auto', width: '250px' }}
              >
                {submitLoading ? <CircularProgress size={22} /> : 'Update'}
              </Button>
            </Drawer>
          </div>
          <Dialog
            maxWidth="md"
            fullWidth
            open={openFilesList}
            onClose={handleCloseFilesList}
          >
            <DialogTitle>Files</DialogTitle>
            <IconButton
              sx={{ position: 'absolute', right: '5px', top: '5px' }}
              onClick={handleCloseFilesList}
            >
              <IconSquareRoundedX />
            </IconButton>
            <DialogContent>
              <TableContainer
                sx={{
                  maxHeight: '400px',
                  overflow: 'auto',
                  border: '1px solid lightgray',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>File Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Work</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {processData?.documents?.length ? (
                      processData?.documents?.map((item, index) => {
                        const name = item.details.name;
                        return (
                          <TableRow key={index}>
                            <TableCell>{name}</TableCell>
                            <TableCell>{item.workName}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2}>No Data</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
          </Dialog>
          <Dialog open={openReplaceDialog}>
            <DialogTitle>Replace File</DialogTitle>
            <DialogContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                style={{ padding: '10px' }}
              >
                {/* Work Name */}
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Work Name"
                  {...register('workName', {
                    required: 'Work Name is required',
                    pattern: {
                      value: /^[a-zA-Z0-9\s]*$/,
                      message: 'Only letters, numbers, and spaces are allowed',
                    },
                  })}
                  error={!!errors.workName}
                  helperText={errors.workName?.message}
                  sx={{ mb: 2, backgroundColor: 'white' }}
                />

                {/* Cabinet Number */}
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Cabinet Number"
                  type="number"
                  {...register('cabinetNo', {
                    required: 'Cabinet Number is required',
                    min: {
                      value: 1,
                      message: 'Cabinet Number must be at least 1',
                    },
                  })}
                  error={!!errors.cabinetNo}
                  helperText={errors.cabinetNo?.message}
                  inputProps={{ min: 1 }}
                  onKeyDown={(e) => {
                    if (['e', 'E', '-', '+'].includes(e.key))
                      e.preventDefault();
                  }}
                  sx={{ mb: 2, backgroundColor: 'white' }}
                />

                {/* File Upload */}
                <Box>
                  <input
                    style={{
                      border: '1px solid lightgray',
                      width: '100%',
                      padding: '10px',
                    }}
                    type="file"
                    accept=".pdf"
                    {...register('fileInput')}
                    ref={(e) => {
                      fileRef.current = e; // Attach the ref
                      register('fileInput').ref(e); // Attach React Hook Form's ref
                    }}
                  />
                </Box>
                <Typography variant="body2" color="error">
                  {errors.fileInput?.message}
                </Typography>

                {/* Alert */}
                <div style={{ padding: '10px', width: '100%' }}>
                  <Alert severity="error" icon={<InfoOutlined />}>
                    <AlertTitle>Note</AlertTitle>
                    <Typography sx={{ my: 0.4 }}>
                      Only the following file types are allowed for upload:
                    </Typography>
                    <Box>
                      <Chip
                        label="PDF"
                        color="error"
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

                {/* Submit Buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '1em',
                  }}
                >
                  <Button
                    onClick={onClose}
                    disabled={isSubmitting}
                    variant="outlined"
                    style={{ marginRight: '1em' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={isSubmitting}
                    type="submit"
                    variant="contained"
                    color="primary"
                  >
                    Submit
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          {fileView && (
            <View
              docu={fileView}
              workflow={processData?.workFlow}
              setFileView={setFileView}
              handleViewClose={handleViewClose}
              maxReceiverStepNumber={processData?.maxReceiverStepNumber}
              processId={processData?._id}
              currentStep={processData?.currentStepNumber}
              controls={true}
            />
          )}
          {commanLoading ? <TopLoader /> : null}
        </Stack>
      )}
    </>
  );
}
