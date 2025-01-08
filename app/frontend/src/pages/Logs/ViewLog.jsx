import React, { useEffect, useState } from 'react';
import styles from './ViewLog.module.css';
import { ImageConfig } from '../../config/ImageConfig';
import {
  Typography,
  Table,
  TableContainer,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Button,
  MenuList,
  Tooltip,
  Dialog,
  DialogTitle,
  TableHead,
  Grid2,
  DialogContent,
  Divider,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import moment from 'moment';
import axios from 'axios';
import {
  IconBan,
  IconDownload,
  IconEye,
  IconSquareRoundedX,
} from '@tabler/icons-react';
import { download } from '../../components/drop-file-input/FileUploadDownload';
import View from '../view/View';
import { toast } from 'react-toastify';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import ShowWorkflow from '../../components/Workflow/ShowWorkflow';

export default function ViewLog(props) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const encodedData = params.get('data');
  const ID = JSON.parse(decodeURIComponent(encodedData));
  const [Data, setData] = useState();
  const [loading, setLoading] = useState(true);
  const [itemName, setItemName] = useState('');
  const [anchorEl1, setAnchorEl1] = useState(null);
  const [anchorEl2, setAnchorEl2] = useState(null);
  const [fileView, setFileView] = useState();

  const getFilePath = (path) => {
    const x_file_path = '..' + path.substring(19);

    // Finding the index of the last occurrence of '/'
    const lastIndex = x_file_path.lastIndexOf('/');

    // Extracting the substring before the last '/'
    const result =
      lastIndex !== -1 ? x_file_path.substring(0, lastIndex) : x_file_path;

    return result; // Output: ../EST
  };
  const handleClose = () => {
    setAnchorEl1(null);
  };
  const [filePath, setFilePath] = useState();
  const [signedBy, setSignedBy] = useState([]);
  const handleClick1 = (event, name, path, sign) => {
    setItemName(name);
    setAnchorEl1(event.currentTarget);
    setFilePath(path);
    setSignedBy(sign);
  };
  const handleCloseSignedBymenu = () => {
    setAnchorEl2(null);
  };
  const handleOpenSignedByMenu = (e) => {
    setAnchorEl2(e.currentTarget);
  };
  const handleView = async (path, name) => {
    setLoading(true);
    try {
      const filePath = getFilePath(path);
      const fileData = await download(name, filePath, true);
      if (fileData) {
        setFileView({ url: fileData.data, type: fileData.fileType });
        setLoading(false);
      } else {
        console.error('Invalid fileData:', fileData);
        alert('Invalid file data.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Unable to view the file.');
      setLoading(false);
    }
    handleClose();
  };
  const handleViewClose = () => {
    setFileView(null);
  };
  const handleDownload = (path, name) => {
    const filePath = getFilePath(path);
    try {
      download(name, filePath);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('download error');
    }
    handleClose();
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
  useEffect(() => {
    const fetchLogDetails = async () => {
      const url = backendUrl + `/getUserLog/${ID}`;
      const res = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      if (res.status === 200) {
        setData(res.data.log);
      }
      setLoading(false);
    };
    fetchLogDetails();
  }, []);
  const navigate = useNavigate();
  const redirectToTimeline = (processName) => {
    const url = `/dashboard/timeLine?data=${processName}`;
    navigate(url);
  };

  const [rejectMenuOpen, setRejectMenuOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const handleOpenRejectMenu = (reason) => {
    console.log(reason);
    setRejectMenuOpen(true);
    setRejectReason(reason);
  };

  const InfoRow = ({ label, value }) => (
    <Grid2
      item
      size={{ xs: 12, sm: 4, md: 3 }}
      //   minWidth={'fit-content'}
      sx={{
        padding: '15px',
        backgroundColor: '#f9f9f9', // Subtle background
        borderRadius: '8px',
        border: '1px solid lightgray',
        borderTop: '3px solid var(--border-color)',
        // width: '100%',
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
  const details = [
    { label: 'Process Name', value: Data?.processName },
    {
      label: 'Time',
      value: moment(Data?.time).format('DD-MM-YYYY, h:mm:ss a'),
    },
    { label: 'Reverted', value: Data?.reverted ? 'Yes' : 'No' },
    {
      label: 'Your Details',
      value: (
        <>
          <b>Work:</b> {Data?.currentStep?.work}
          <br />
          <b>User:</b> {Data?.currentStep?.user}
          <br />
          <b>Role:</b> {Data?.currentStep?.role}
          <br />
          <b>Step Number:</b> {Data?.currentStep?.step}
        </>
      ),
    },
    {
      label: 'Next Step',
      value:
        Data?.nextStep?.work === 'N/A' ? (
          'NO NEXT STEP'
        ) : (
          <>
            <b>Work:</b> {Data?.nextStep?.work}
            <br />
            <b>Users and Roles:</b>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {Data?.nextStep?.users.map((user, index) => (
                <div
                  key={index}
                  style={{
                    marginRight: '20px',
                    marginBottom: '10px',
                  }}
                >
                  (<b>{user.user}:</b> {user.role})
                </div>
              ))}
            </div>
            <b>Step Number:</b> {Data?.nextStep?.step || 'NO NEXT STEP'}
          </>
        ),
    },
    {
      label: 'Workflow Updated?',
      value: (
        <>
          {Data?.didChangeWorkFlow ? (
            <>
              Yes
              <Button
                variant="contained"
                sx={{ ml: 'auto', display: 'block' }}
                onClick={() => {
                  setOpenWorkflowDialog(true);
                  setWorkFlow({
                    prev: Data?.workflowChanges?.previous,
                    updated: Data?.workflowChanges?.updated,
                  });
                }}
              >
                View
              </Button>
            </>
          ) : (
            'No'
          )}
        </>
      ),
    },
    {
      label: 'Process Status',
      value: Data?.reverted ? (
        <span style={{ color: 'red' }}>You have reverted the process</span>
      ) : Data?.nextStep?.work !== 'N/A' ? (
        <span style={{ color: 'forestgreen' }}>
          You have forwarded process to next step for {Data?.nextStep?.work}
        </span>
      ) : (
        <span
          style={{ fontSize: 17, fontWeight: 600, color: 'var(--themeColor)' }}
        >
          Process is completed / ended
        </span>
      ),
    },
  ];

  //   workflow show
  const [openWorkflowDialog, setOpenWorkflowDialog] = useState(false);
  const [workFlow, setWorkFlow] = useState({ prev: [], updated: [] });
  return (
    <>
      {loading ? (
        <ComponentLoader />
      ) : (
        <Stack flexDirection="row">
          <div
            style={{
              width: '100%',
              padding: '15px',
              maxHeight: 'fit-content',
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '10px',
              border: '1px solid lightgray',
              boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
            }}
          >
            {Data && (
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

                {/* Display Uploaded Documents */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    mt: 2,
                    borderRadius: '8px',
                  }}
                >
                  Uploaded Documents :
                </Typography>
                <Box sx={{ width: '99%', overflow: 'auto' }}>
                  {Data?.documents.filter((file) => file?.isUploaded).length >
                  0 ? (
                    <TableContainer
                      sx={{
                        border: '1px solid',
                        borderRadius: '8px',
                        padding: '10px',
                        overflow: 'hidden',
                      }}
                    >
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <strong>File Name</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Uploaded On</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Preview</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Actions</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Data?.documents.map((file) =>
                            file?.isUploaded ? (
                              <TableRow key={file?.details?._id}>
                                {/* File Name Column */}
                                <TableCell>
                                  <Tooltip
                                    title={file.details.name}
                                    enterDelay={900}
                                  >
                                    <Typography variant="body2">
                                      {file?.details?.name.length <= 20
                                        ? file.details.name
                                        : truncateFileName(file.details.name)}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>

                                {/* Uploaded On Column */}
                                <TableCell>
                                  {moment(file?.details?.createdOn).format(
                                    'DD-MMM-YYYY hh:mm A',
                                  )}
                                </TableCell>

                                {/* Preview Column */}
                                <TableCell>
                                  <img
                                    style={{ width: '50px', height: '50px' }}
                                    src={
                                      ImageConfig[
                                        file?.details?.name
                                          ?.split('.')
                                          .pop()
                                          .toLowerCase()
                                      ] || ImageConfig['default']
                                    }
                                    alt="file preview"
                                  />
                                </TableCell>

                                {/* Actions Column */}
                                <TableCell>
                                  <IconButton
                                    onClick={(e) =>
                                      handleClick1(
                                        e,
                                        file?.details?.name,
                                        file?.details?.path,
                                      )
                                    }
                                  >
                                    <MoreVertIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ) : null,
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography
                      sx={{
                        fontWeight: 700,
                        mt: 1,
                        textAlign: 'center',
                        color: 'gray',
                        border: '1px solid',
                        borderRadius: '8px',
                        padding: '10px',
                      }}
                    >
                      No Documents Uploaded
                    </Typography>
                  )}
                </Box>

                {/* Display Singed Documents */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    mt: 2,
                    borderRadius: '8px',
                  }}
                >
                  Signed Documents :
                </Typography>
                <Box sx={{ width: '99%', overflow: 'auto' }}>
                  {Data?.documents.filter((file) => file?.isSigned).length >
                  0 ? (
                    <TableContainer
                      sx={{
                        border: '1px solid',
                        borderRadius: '8px',
                        padding: '10px',
                        overflow: 'hidden',
                      }}
                    >
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>File Name</TableCell>
                            <TableCell>Signed On</TableCell>
                            <TableCell>Preview</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Data?.documents.map((file) =>
                            file?.isSigned ? (
                              <TableRow key={file?.details?._id}>
                                <TableCell>
                                  <Tooltip
                                    title={file.details.name}
                                    enterDelay={900}
                                  >
                                    <Typography variant="body2">
                                      {file?.details?.name.length <= 20
                                        ? file.details.name
                                        : truncateFileName(file.details.name)}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  {moment(file?.details?.createdOn).format(
                                    'DD-MMM-YYYY hh:mm A',
                                  )}
                                </TableCell>
                                <TableCell>
                                  <img
                                    style={{ width: '50px', height: '50px' }}
                                    src={
                                      ImageConfig[
                                        file?.details?.name
                                          ?.split('.')
                                          .pop()
                                          .toLowerCase()
                                      ] || ImageConfig['default']
                                    }
                                    alt="file preview"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    onClick={() =>
                                      console.log('Signed button clicked')
                                    }
                                    style={{ color: 'green' }}
                                  >
                                    Signed
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <IconButton
                                    onClick={(e) =>
                                      handleClick1(
                                        e,
                                        file?.details?.name,
                                        file?.details?.path,
                                      )
                                    }
                                  >
                                    <MoreVertIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ) : null,
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography
                      sx={{
                        fontWeight: 700,
                        mt: 1,
                        textAlign: 'center',
                        border: '1px solid',
                        borderRadius: '8px',
                        padding: '10px',
                      }}
                    >
                      No Documents Signed
                    </Typography>
                  )}
                </Box>

                {/* Display Rejected Documents */}
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    mt: 2,
                    borderRadius: '8px',
                  }}
                >
                  Rejected Documents :
                </Typography>
                <Box sx={{ width: '99%', overflow: 'auto' }}>
                  {Data?.documents.filter((file) => file?.isRejected).length >
                  0 ? (
                    <TableContainer
                      sx={{
                        border: '1px solid',
                        borderRadius: '8px',
                        padding: '10px',
                        overflow: 'hidden',
                      }}
                    >
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <strong>File Name</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Rejected On</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Preview</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Reason</strong>
                            </TableCell>
                            <TableCell>
                              <strong>Actions</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Data?.documents.map((file) =>
                            file?.isRejected ? (
                              <TableRow key={file?.details?._id}>
                                {/* File Name Column */}
                                <TableCell>
                                  <Tooltip
                                    title={file.details.name}
                                    enterDelay={900}
                                  >
                                    <Typography variant="body2">
                                      {file?.details?.name.length <= 20
                                        ? file.details.name
                                        : truncateFileName(file.details.name)}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>

                                {/* Rejected On Column */}
                                <TableCell>
                                  {moment(file?.details?.createdOn).format(
                                    'DD-MMM-YYYY hh:mm A',
                                  )}
                                </TableCell>

                                {/* Preview Column */}
                                <TableCell>
                                  <img
                                    style={{ width: '50px', height: '50px' }}
                                    src={
                                      ImageConfig[
                                        file?.details?.name
                                          ?.split('.')
                                          .pop()
                                          .toLowerCase()
                                      ] || ImageConfig['default']
                                    }
                                    alt="file preview"
                                  />
                                </TableCell>

                                {/* Reason Column */}
                                <TableCell>
                                  <Button
                                    onClick={() =>
                                      handleOpenRejectMenu(file?.reason)
                                    }
                                    sx={{ color: 'red', textTransform: 'none' }}
                                  >
                                    View Reason
                                  </Button>
                                </TableCell>

                                {/* Actions Column */}
                                <TableCell>
                                  <IconButton
                                    onClick={(e) =>
                                      handleClick1(
                                        e,
                                        file?.details?.name,
                                        file?.details?.path,
                                      )
                                    }
                                  >
                                    <MoreVertIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ) : null,
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography
                      sx={{
                        fontWeight: 700,
                        mt: 1,
                        textAlign: 'center',
                        color: 'gray',
                        border: '1px solid',
                        borderRadius: '8px',
                        padding: '10px',
                      }}
                    >
                      No Documents Rejected
                    </Typography>
                  )}
                </Box>

                <Button
                  variant="contained"
                  sx={{ minWidth: 220, mx: 'auto', display: 'block', mt: 4 }}
                  onClick={() => redirectToTimeline(Data?.processName)}
                >
                  View Timeline
                </Button>
              </Box>
            )}
            {/* <Menu
                        anchorEl={anchorEl2}
                        open={Boolean(anchorEl2)}
                        onClose={handleCloseSignedBymenu}
                        PaperProps={{ elevation: 2 }}
                    >
                        <MenuList
                            sx={{ padding: "5px", maxHeight: "200px", overflow: "auto" }}
                        >
                            <h4 style={{ textAlign: "center" }}>SIGNATURES :</h4>
                            {signedBy?.map((item) => (
                                <>
                                    <MenuItem key={item.username} onClick={handleCloseSignedBymenu}>
                                        {item.username}
                                    </MenuItem>
                                </>
                            ))}
                        </MenuList>
                    </Menu> */}
            <Menu
              anchorEl={anchorEl1}
              open={Boolean(anchorEl1)}
              onClose={handleClose}
              PaperProps={{ elevation: 2 }}
            >
              <MenuItem
                disabled={itemName?.split('.').pop().trim() === 'zip'}
                sx={{ gap: '5px' }}
                onClick={() => {
                  handleView(filePath, itemName);
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
                  handleDownload(filePath, itemName);
                  handleClose();
                }}
              >
                <IconDownload />
                Download
              </MenuItem>
              {/* <hr /> */}
            </Menu>
            {loading && (
              <div
                style={{
                  // height: "100%",
                  // width: "100%",
                  // display: "flex",
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <CircularProgress color="inherit" size={30} />
              </div>
            )}
            {fileView && (
              <View
                docu={fileView}
                setFileView={setFileView}
                handleViewClose={handleViewClose}
              />
            )}
          </div>
          <Dialog
            anchorEl={rejectMenuOpen}
            open={Boolean(rejectMenuOpen)}
            onClose={() => setRejectMenuOpen(false)}
          >
            <DialogTitle
              sx={{
                fontWeight: 700,
                background: 'var(--themeColor)',
                margin: '5px',
                color: 'white',
              }}
            >
              FILE REJECT REASON
            </DialogTitle>
            <div
              style={{
                padding: '15px',
                maxWidth: '300px',
                maxHeight: '150px',
                overflow: 'auto',
              }}
            >
              <strong>Reason:</strong> {rejectReason}
            </div>
          </Dialog>
        </Stack>
      )}

      <Dialog
        fullWidth
        maxWidth="xl"
        open={openWorkflowDialog}
        onClose={() => setOpenWorkflowDialog(false)}
      >
        <DialogContent>
          <IconButton
            onClick={() => setOpenWorkflowDialog(false)}
            sx={{ position: 'absolute', top: '5px', right: '5px' }}
          >
            <IconSquareRoundedX />
          </IconButton>
          <Typography variant="h6">Previous Workflow :</Typography>
          <ShowWorkflow workFlow={workFlow.prev} />
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6">Updated Workflow :</Typography>
          <ShowWorkflow workFlow={workFlow.updated} />
        </DialogContent>
      </Dialog>
    </>
  );
}
