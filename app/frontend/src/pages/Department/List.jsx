import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Modal,
  Paper,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
// import Sidedrawer from "../drawer/Sidedrawer";
import axios from 'axios';
import styles from './List.module.css';
import { Link, useNavigate } from 'react-router-dom';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { IconArrowRight } from '@tabler/icons-react';
import { toast } from 'react-toastify';
// import useStoreData, { sessionData } from "../../Store";

// accordian
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ComponentLoader from '../../common/Loader/ComponentLoader';

export default function List(props) {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  // const { setEditObject } = sessionData();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState();
  const [departments, setDepartments] = useState([]);
  //   const [searchTerm, setSearchTerm] = useState("");
  const fetchDepartments = async () => {
    const url = backendUrl + '/getDepartments';
    try {
      const response = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      if (response.status === 200) {
        setIsLoading(false);
        setDepartments(response.data.departments);
      }
    } catch (error) {
      setIsLoading(false);
      setError(error);
      // alert("Unable to fetch departments..");
    }
  };
  // const handleDelete = (index) => {
  //   const updatedWorkFlow = [...departments.workFlow];
  //   updatedWorkFlow.splice(index, 1);
  //   setDepartments({ ...departments, workFlow: updatedWorkFlow });
  // };
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState();
  const deleteModalOpen = () => {
    setModalOpen(true);
  };
  const deleteModalClose = () => {
    setDeleteItemId('');
    setModalOpen(false);
  };
  const [deleteDepLoading, setDeleteDepLoading] = useState(false);

  const deleteModalContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <p style={{ fontSize: '18px', marginBottom: '10px' }}>
        ARE YOU SURE YOU WANT TO DELETE DEPARTMENT?
      </p>
      <Stack flexDirection="row" gap={3}>
        <Button
          variant="contained"
          size="small"
          color={deleteDepLoading ? 'inherit' : 'error'}
          disabled={deleteDepLoading}
          onClick={() => handleDepDelete(deleteItemId)}
          sx={{
            // backgroundColor: 'red',
            // color: 'white',
            '&:hover': {
              backgroundColor: '#ff0000',
            },
          }}
        >
          {deleteDepLoading ? <CircularProgress size={20} /> : 'Yes'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          disabled={deleteDepLoading}
          onClick={deleteModalClose}
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
  const handleDepDelete = async (id) => {
    setDeleteDepLoading(true);
    const url = backendUrl + `/deleteDepartment/${id}`;
    const accessToken = sessionStorage.getItem('accessToken');

    try {
      const response = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 200) {
        setDepartments((prev) => prev.filter((item) => item._id !== id));
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error('Error deleting department');
    }
    deleteModalClose();
    setDeleteDepLoading(false);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const filteredData = departments.filter((item) =>
    item.department.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  function formatUserNames(users) {
    if (users.length === 0) {
      return 'No users';
    } else if (users.length === 1) {
      return users[0].user;
    } else {
      return `${users[0].user}, ...`;
    }
  }
  function truncateUsername(username, maxLength = 12) {
    if (!username || typeof username !== 'string') return '';

    // Check if truncation is needed
    if (username.length <= maxLength) {
      return username;
    }

    // Truncate and append "..."
    return `${username.substring(0, maxLength)}...`;
  }

  const renderWorkFlow = () => {
    return (
      <div className={styles.DocList}>
        {filteredData.length > 0 ? (
          filteredData.map((i, inn) => (
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel${inn}-content`}
                id={`panel${inn}-content`}
              >
                <Stack
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ width: '100%' }}
                >
                  <Typography variant="body1">{i?.department}</Typography>
                  {/* {!i.editable && ( */}
                  <div>
                    <IconButton
                      onClick={() => handleEdit(i)}
                      // disabled={!i.editable}
                    >
                      <IconEdit color={i.editable ? '#2860e0' : '#2860e0'} />
                    </IconButton>
                    <IconButton
                      // disabled={!i.editable}
                      onClick={() => {
                        setDeleteItemId(i._id);
                        setModalOpen(true);
                      }}
                    >
                      <IconTrash color={i.editable ? 'red' : 'red'} />
                    </IconButton>
                  </div>
                  {/* )} */}
                </Stack>
              </AccordionSummary>
              {/* <AccordionDetails>hello</AccordionDetails> */}
              <AccordionDetails>
                <p style={{ textAlign: 'center', marginBottom: '30px' }}>
                  Head : {i?.head}
                </p>
                <Stack
                  flexDirection="row"
                  flexWrap="wrap"
                  rowGap={3}
                  columnGap={1}
                  justifyContent="center"
                  sx={{ marginBottom: '40px', marginTop: '10px' }}
                >
                  {i.workFlow.map((item, index) => (
                    <>
                      <Paper
                        key={index + 1}
                        elevation={3}
                        sx={{
                          position: 'relative',
                          width: { xs: 190, md: 250 },
                          borderRadius: '15px',
                          backgroundColor: 'white',
                        }}
                      >
                        <h3 className={styles.workflowIndex}>{index + 1}</h3>
                        {/* <Divider sx={{ my: 1 }} /> */}
                        <div className={styles.workflowContent}>
                          <div className={styles.workFlowElements}>
                            <p style={{ width: '60px' }}>
                              <strong>Work :</strong>
                            </p>
                            {/* <p style={{ margin: "0 6px" }}>:</p> */}
                            <p>{item.work}</p>
                          </div>
                          <div className={styles.workFlowElements}>
                            <p style={{ width: '60px' }}>
                              <strong>Users :</strong>
                            </p>
                            <p style={{ whiteSpace: 'pre-line' }}>
                              {item?.users?.length
                                ? item.users.map((user, index) => (
                                    <Tooltip
                                      key={index}
                                      title={
                                        user.user.length > 12 ? user.user : ''
                                      }
                                    >
                                      <span>{truncateUsername(user.user)}</span>
                                    </Tooltip>
                                  ))
                                : '---'}
                            </p>
                          </div>
                        </div>
                      </Paper>
                    </>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Stack
            sx={{ height: '100%' }}
            justifyContent="center"
            alignItems="center"
          >
            <h3>No item found</h3>
          </Stack>
        )}
      </div>
    );
  };
  const navigate = useNavigate();
  const handleEdit = (row) => {
    // setEditObject(row);
    navigate(`/departments/edit/${row._id}`);
  };
  useEffect(() => {
    fetchDepartments();
  }, []);
  return (
    <>
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <Stack flexDirection="row">
          <div
            className={styles.padding}
            style={{
              width: '100%',
              maxHeight: 'fit-content',
              position: 'relative',
              overflow: 'auto',
            }}
          >
            {!isLoading && (
              <Stack
                flexWrap="wrap"
                gap={1}
                alignItems="center"
                justifyContent={
                  departments.length === 0 ? 'flex-end' : 'space-between'
                }
                flexDirection="row"
                sx={{ marginY: '10px' }}
              >
                {departments.length > 0 && (
                  <Box
                    sx={{ width: { lg: '250px', sm: '200px', xs: '170px' } }}
                  >
                    <TextField
                      label="Search"
                      variant="outlined"
                      size="small"
                      value={searchTerm}
                      sx={{ backgroundColor: 'white' }}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </Box>
                )}
                {!error && (
                  <Link to="/departments/createNew">
                    <Button
                      variant="contained"
                      sx={{ borderRadius: '9px' }}
                      // color="warning"
                      size="medium"
                    >
                      Create Department
                    </Button>
                  </Link>
                )}
              </Stack>
            )}
            {isModalOpen && (
              <Modal
                open={isModalOpen}
                // onClose={deleteModalClose}
                className="create-folder-modal"
              >
                <div
                  style={{ gap: '10px', position: 'relative' }}
                  className="create-folder-modal-content-container"
                >
                  {deleteModalContent}
                </div>
              </Modal>
            )}
            {!isLoading && departments.length > 0 && renderWorkFlow()}
            {/* </Paper> */}
            {isLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                }}
              >
                <CircularProgress color="inherit" size={30} />
              </div>
            )}
            {!isLoading && departments.length === 0 && (
              <div
                className={styles.card}
                style={{ height: 'calc(100vh - 200px)' }}
              >
                <Typography variant="h6">
                  No departments created till now
                </Typography>
              </div>
            )}
          </div>
        </Stack>
      )}
    </>
  );
}
