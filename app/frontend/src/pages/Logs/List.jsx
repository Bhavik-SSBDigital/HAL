import React, { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from 'react-query';
import {
    Box,
    CircularProgress,
    Pagination,
    Paper,
    Stack,
    TextField,
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

export default function List() {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [allLogs, setAllLogs] = useState([]);

    const fetchLogs = async ({ pageParam = 0 }) => {
        const url = backendUrl + '/getUserLogs';
        const res = await axios.post(
            url,
            { startingIndex: 0, pageSize: 10 },
            {
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
                },
            },
        );
        if (res.status === 200) {
            return res.data;
        } else {
            throw new Error('Unable to fetch logs for user');
        }
    };

    const { data, error, isLoading, isFetching, refetch } = useQuery(
        'userLogs',
        fetchLogs,
        {
            onError: (error) => {
                toast.error(error.message); // Error handling with toast
            },
            cacheTime: 12000,
            staleTime: 12000,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        }
    );

    const filteredData = data?.worksDone?.filter((item) =>
        item.processName.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    useEffect(() => {
        setPage(0);
    }, [searchTerm]);

    const handleLogView = (row) => {
        navigate(
            `/processes/logs/view?data=${encodeURIComponent(
                JSON.stringify(row._id),
            )}`,
        );
    };

    const handleChangePage = (newPage) => {
        setPage(newPage);
    };

    return (
        <>
            {isFetching || isLoading ? (
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
                        className={styles.searchInput}
                    />
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Serial No</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Process Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Your Work</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData?.length ? (
                                    filteredData
                                        ?.slice(page * 10, (page + 1) * 10)
                                        .map((row, index) => (
                                            <TableRow key={index} className={styles.tableRow}>
                                                <TableCell className={styles.cell}>
                                                    {page * 10 + index + 1}
                                                </TableCell>
                                                <TableCell className={styles.cell}>
                                                    {row.processName}
                                                </TableCell>
                                                <TableCell className={styles.cell}>
                                                    {moment(row.time).format('DD-MMM-YYYY hh:mm A')}
                                                </TableCell>
                                                <TableCell className={styles.cell}>
                                                    {row.currentStep.work}
                                                </TableCell>
                                                <TableCell className={styles.cell}>
                                                    <Button onClick={() => handleLogView(row)}>
                                                        View Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5}>No Data</TableCell>
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
                </>
            )}
        </>
    );
}
