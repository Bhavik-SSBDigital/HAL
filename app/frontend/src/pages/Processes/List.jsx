import React, { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from 'react-query';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import styles from './List.module.css';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import moment from 'moment';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import sessionData from '../../Store';
import { toast } from 'react-toastify';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { IconSquareRoundedX } from '@tabler/icons-react';

export default function List() {
  const { setWork, pickedProcesses, setNotifications, notifications } =
    sessionData();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);

  const fetchProcesses = async ({ pageParam = 0 }) => {
    const url = backendUrl + '/getProcessesForUser';
    try {
      const res = await axios.post(
        url,
        {
          startingIndex: 0,
          pageSize: 10,
          forPublishedProcesses: false,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );

      return res.data;
    } catch (error) {
      toast.error('Unable to fetch process for user');
    }

    // if (res.status === 200) {
    //     return res.data;
    // } else {
    //     throw new Error("Unable to fetch process for user");
    // }
  };
  const { data, error, isLoading, isFetching } = useQuery(
    'pendingProcesses',
    fetchProcesses,
    {
      cacheTime: 12000,
      staleTime: 12000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  const filteredData = data?.processes?.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleView = (id, workflow, work) => {
    console.log(work);
    // setWork(work);
    navigate(
      `/processes/work/view?data=${encodeURIComponent(
        id,
      )}&workflow=${encodeURIComponent(workflow)}`,
    );
    handleRemoveNotification(id);
  };

  const handleRemoveNotification = async (id) => {
    try {
      const url = backendUrl + `/removeProcessNotification/${id}`;
      await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      const updatedNotifications = notifications?.filter(
        (item) => item.processId !== id,
      );
      setNotifications(updatedNotifications);
    } catch (error) {
      console.error('error', error);
    }
  };

  const handlePlus = () => {
    navigate('/processes/initiate');
  };

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  useEffect(() => {
    setPage(0); // Reset page number when search term changes
  }, [searchTerm]);

  useEffect(() => {
    if (pickedProcesses) {
      console.log(pickedProcesses, '1');
      queryClient.removeQueries('pendingProcesses');
    }
  }, [pickedProcesses]);

  // view file list
  const [filesList, setFilesList] = useState([]);
  const [fileListOpen, setFileListOpen] = useState(false);
  const handleViewFileList = (files) => {
    setFileListOpen(true);
    setFilesList(files);
  };

  const getWorkName = (filenames) => {
    // Step 1: Extract the word after the first underscore
    const extractedWords = filenames.map((filename) => {
      const parts = filename.split('_');
      return parts[1]; // Get the word after the first underscore
    });

    // Step 2: Filter unique names using a Set
    const uniqueNames = [...new Set(extractedWords)];

    return uniqueNames;
  };
  return (
    <>
      {isLoading || isFetching ? (
        <ComponentLoader />
      ) : (
        <>
          <TextField
            label="Search"
            variant="outlined"
            value={searchTerm}
            size="small"
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ backgroundColor: 'white', mb: '2px' }}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Serial No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Process Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Create Time</TableCell>
                  {/* <TableCell sx={{ fontWeight: 700 }}>File Name</TableCell> */}
                  <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData?.length ? (
                  filteredData
                    ?.filter((item) => !pickedProcesses?.includes(item?._id))
                    ?.slice(page * 10, (page + 1) * 10)
                    ?.map((row, index) => (
                      <TableRow key={index} className={styles.tableRow}>
                        <TableCell className={styles.cell}>
                          {index + 1 + page * 10}
                        </TableCell>
                        <TableCell className={styles.cell}>
                          {row.name}
                        </TableCell>
                        <TableCell className={styles.cell}>
                          {moment(row.createdAt).format('DD-MMM-YYYY hh:mm A')}
                        </TableCell>
                        {/* <TableCell className={styles.cell}>
                          {getWorkName(row.files).map((fileName, index1) => (
                            <Typography key={index1}>- {fileName}</Typography>
                          ))}
                          {row?.files?.length > 4 && (
                            <Button
                              onClick={() => handleViewFileList(row.files)}
                              size="small"
                            >
                              View More
                            </Button>
                          )}
                        </TableCell> */}

                        <TableCell className={styles.cell}>
                          <Button
                            onClick={() =>
                              handleView(
                                row._id,
                                row.workFlowToBeFollowed,
                                row?.work,
                              )
                            }
                          >
                            View Details
                          </Button>
                          {/* <Button onClick={() => handleViewFileList(row.files)}>
                                                            View Files
                                                        </Button> */}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell rowSpan={4}>No Data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack
            justifyContent="flex-end"
            mt={1}
            flexDirection="row"
            alignItems="center"
          >
            <Pagination
              page={page + 1}
              onChange={(event, page) => handleChangePage(page - 1)}
              count={Math.ceil((filteredData?.length || 0) / 10)}
              variant="outlined"
              shape="rounded"
            />
          </Stack>
          <Dialog
            open={fileListOpen}
            sx={{ backdropFilter: 'blur(4px)' }}
            onClose={() => setFileListOpen(false)}
          >
            <DialogTitle
              sx={{ fontWeight: 700, position: 'relative' }}
              textAlign="center"
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Process Files
              </Typography>
              <IconButton
                onClick={() => setFileListOpen(false)}
                sx={{ position: 'absolute', right: '5px', top: '0px' }}
              >
                <IconSquareRoundedX />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <TableContainer
                sx={{ minWidth: 300, border: '1px solid lightgray' }}
              >
                <Table>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '16px' }}>
                      SR_No
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '16px' }}>
                      File Name
                    </TableCell>
                  </TableRow>
                  {filesList?.length ? (
                    filesList.map((file, index) => (
                      <TableRow>
                        <React.Fragment key={index}>
                          <TableCell>{index}</TableCell>
                          <TableCell>{file}</TableCell>
                        </React.Fragment>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2}>No files available</TableCell>
                    </TableRow>
                  )}
                </Table>
              </TableContainer>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
