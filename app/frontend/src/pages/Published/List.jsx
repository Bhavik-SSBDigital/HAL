import React, { useEffect, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "react-query";
import {
    Box,
    CircularProgress,
    Fab,
    Pagination,
    Paper,
    Stack,
    TextField,
} from "@mui/material";
import styles from './List.module.css';
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import moment from "moment";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import sessionData from "../../Store";
import { toast } from "react-toastify";
import ComponentLoader from "../../common/Loader/ComponentLoader";

export default function List() {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [departments, setDepartments] = useState([]);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);

    const fetchProcesses = async ({ pageParam = 0 }) => {
        const url = backendUrl + "/getProcessesForUser";
        const res = await axios.post(
            url,
            {
                startingIndex: pageParam * 10,
                pageSize: 10,
                forPublishedProcesses: true,
            },
            {
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
                },
            }
        );

        if (res.status === 200) {
            return res.data;
        } else {
            throw new Error("Unable to fetch process for user");
        }
    };

    const {
        data,
        error,
        isLoading,
        isFetching,
        fetchNextPage,
        hasNextPage,
    } = useInfiniteQuery(
        "publishedProcesses",
        fetchProcesses,
        {
            getNextPageParam: (lastPage, allPages) => {
                return lastPage.remaining ? allPages.length : undefined;
            },
            onError: (error) => {
                toast.error(error.message);
            },
            cacheTime: 12000,
            staleTime: 12000,
        }
    );

    const filteredData = data?.pages.flatMap(page => page.processes).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleChangePage = (newPage) => {
        setPage(newPage);
        fetchNextPage();
    };

    useEffect(() => {
        setPage(0); // Reset page number when search term changes
    }, [searchTerm]);
    const handleView = (id) => {
        navigate(`/processes/work/view?data=${encodeURIComponent(id)}&published=true`);
    };
    return (
        <>
            {isFetching || isLoading ? <ComponentLoader /> : (
                <>
                    <TextField
                        label="Search"
                        variant="outlined"
                        value={searchTerm}
                        size="small"
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ backgroundColor: "white", mb: '2px' }}
                    />
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Serial No</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Process Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Create Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>View Details</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData.length ? filteredData
                                    ?.slice(page * 10, (page + 1) * 10)
                                    ?.map((row, index) => (
                                        <TableRow key={index} className={styles.tableRow}>
                                            <TableCell className={styles.cell}>{index + 1 + page * 10}</TableCell>
                                            <TableCell className={styles.cell}>{row.name}</TableCell>
                                            <TableCell className={styles.cell}>{moment(row.createdAt).format("DD-MMM-YYYY hh:mm A")}</TableCell>
                                            <TableCell className={styles.cell}><Button onClick={() => handleView(row?._id)}>View</Button></TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell rowSpan={4}>No Data</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Stack justifyContent="flex-end" mt={1} flexDirection="row" alignItems="center">
                        {/* <Button disabled={page === 0 || isFetching} onClick={() => handleChangePage(page - 1)}>Prev</Button>
                        <h3>{page + 1}</h3>
                        <Button disabled={!data?.pages[page]?.remaining || isFetching} onClick={() => handleChangePage(page + 1)}>Next</Button> */}
                        <Pagination page={page + 1} onChange={(event, page) => handleChangePage(page - 1)} count={data?.pages[0]?.totalNumberOfPages} variant="outlined" shape="rounded" />
                    </Stack>
                </>
            )}
        </>
    );
}
