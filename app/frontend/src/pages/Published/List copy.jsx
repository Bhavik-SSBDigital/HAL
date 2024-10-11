import React, { useEffect, useState } from "react";
import styles from "./List.module.css";
import { useQuery, useQueryClient } from "react-query";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import sessionData from "../../Store";
import { Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import ComponentLoader from "../../common/Loader/ComponentLoader";

export default function Works(props) {
    const queryClient = new useQueryClient();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const { setWork } = sessionData();
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0);

    // Fetching published processes
    const [enablePublishedFetch, setEnablePublishedFetch] = useState(true);

    const fetchPublishedProcesses = async () => {
        try {
            const url = backendUrl + "/getProcessesForUser";
            const res = await axios.post(
                url,
                {
                    startingIndex: page * 10,
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
                throw new Error("Unable to fetch published processes");
            }
        } catch (error) {
            throw new Error("Network error");
        }
    };

    const { data, error, isLoading, isFetching } = useQuery(["publishedProcesses", "true", page], fetchPublishedProcesses, {
        onSuccess: (data) => {
            console.log("got published processes")
        },
        onError: (error) => {
            toast.error(error.message);
        },
        retry: 1,
        enabled: enablePublishedFetch,
        initialData: { processes: [], remaining: false },
        staleTime: 60000,
        cacheTime: 60000,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
    });

    const [filteredMessages, setFilteredMessages] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const filteredMessagesResult = data?.processes?.filter((item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredMessages(filteredMessagesResult);
    }, [searchTerm]);

    const handleChangePage = async (event, newPage) => {
        setPage(newPage);
    };

    return (
        <>
            {isFetching || isLoading ? <ComponentLoader /> : <>
                <TableContainer
                    component={Paper}
                    className={styles.tableContainer}
                >
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
                            {filteredMessages
                                ?.filter((row) => row.isPending === true)
                                ?.map((row, index) => (
                                    <TableRow key={index} className={styles.tableRow}>
                                        <TableCell className={styles.cell}>
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className={styles.cell}>
                                            {row.name}
                                        </TableCell>
                                        <TableCell className={styles.cell}>
                                            {moment(row.createdAt).format(
                                                "DD-MMM-YYYY hh:mm A"
                                            )}
                                        </TableCell>
                                        <TableCell className={styles.cell}>
                                            <Button
                                                onClick={() => {
                                                    handleView(row._id);
                                                }}
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}

                            {filteredMessages?.filter((row) => row.isPending === true)
                                ?.length === 0 && (
                                    <TableRow className={styles.tableRow}>
                                        <TableCell colSpan={4} className={styles.cell}>
                                            No received published processes
                                        </TableCell>
                                    </TableRow>
                                )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Stack justifyContent="flex-end" gap={1} flexDirection="row" alignItems="center">
                    <Button disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
                    <h3>{page + 1}</h3>
                    <Button disabled={!data?.remaining} onClick={() => setPage(page + 1)}>Next</Button>
                </Stack></>}
        </>
    );
}
