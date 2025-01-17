import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { toast } from 'react-toastify';
import sessionData from '../../Store';
import styles from './Monitor.module.css';
import ComponentLoader from '../../common/Loader/ComponentLoader';

const Monitor = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setWork } = sessionData();
  const [filteredData, setFilteredData] = useState([]);

  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchProcesses = async (page) => {
    try {
      const url = `${backendUrl}/getProcessesForUser`;
      const res = await axios.post(
        url,
        {
          startingIndex: page * rowsPerPage,
          pageSize: rowsPerPage,
          forMonitoring: true,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
        },
      );

      if (res.status === 200) {
        return res.data;
      } else {
        throw new Error('Unable to fetch processes for user');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const { data, isLoading, isFetching } = useQuery(
    ['pendingProcesses', 'monitor', page],
    () => fetchProcesses(page),
    {
      staleTime: 60000,
      cacheTime: 60000,
      keepPreviousData: true,
      // refetchOnMount: true,
      // refetchOnWindowFocus: true,
    },
  );

  const handleView = (id, workflow) => {
    navigate(
      `/monitor/view?data=${encodeURIComponent(
        id,
      )}&workflow=${encodeURIComponent(workflow)}`,
    );
    // setWork(workflow);
  };

  useEffect(() => {
    const filteredDataResult = data?.processes?.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredData(filteredDataResult);
  }, [searchTerm]);
  useEffect(() => {
    setFilteredData(data?.processes);
  }, [data]);

  return (
    <>
      {isFetching || isLoading ? (
        <ComponentLoader />
      ) : (
        <Stack flexDirection="row">
          <div className={styles.padding}>
            <Stack alignItems="flex-end" my="5px">
              <Box>
                <TextField
                  label="Search"
                  size="small"
                  variant="outlined"
                  value={searchTerm}
                  sx={{ backgroundColor: 'white' }}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoading || isFetching}
                />
              </Box>
            </Stack>
            <TableContainer component={Paper} className={styles.tableContainer}>
              <Table className={styles.table}>
                <TableHead className={styles.tableHeader}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Serial No</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Process Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Create Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData?.length ? (
                    filteredData.map((row, index) => (
                      <TableRow key={index} className={styles.tableRow}>
                        <TableCell className={styles.cell}>
                          {index + 1}
                        </TableCell>
                        <TableCell className={styles.cell}>
                          {row.name}
                        </TableCell>
                        <TableCell className={styles.cell}>
                          {moment(row.createdAt).format('DD-MMM-YYYY hh:mm A')}
                        </TableCell>
                        <TableCell className={styles.cell}>
                          <Button
                            onClick={() =>
                              handleView(row._id, row.workFlowToBeFollowed)
                            }
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className={styles.tableRow}>
                      <TableCell colSpan={4} className={styles.cell}>
                        No processes to watch
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack
              justifyContent="flex-end"
              gap={1}
              flexDirection="row"
              alignItems="center"
            >
              <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
                Prev
              </Button>
              <h3>{page + 1}</h3>
              <Button
                disabled={!data?.remaining}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </Stack>
          </div>
        </Stack>
      )}
    </>
  );
};

export default Monitor;
