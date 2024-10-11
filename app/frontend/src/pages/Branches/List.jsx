import React, { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import IconButton from "@mui/material/IconButton";
// import styles from "./Branches.module.css"; // Import your styles
// import Sidedrawer from "../drawer/Sidedrawer";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import {
    CircularProgress,
    Modal,
    Paper,
    TablePagination,
    TableSortLabel,
    TextField,
    Typography,
} from "@mui/material";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { Box, Button, Stack } from "@mui/material";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import ComponentLoader from "../../common/Loader/ComponentLoader";
// import useStoreData, { sessionData } from "../../Store";

const MyTable = ({ data, props, setData, searchTerm, setSearchTerm }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState(null);
    const [deleteItemId, setDeleteItemId] = useState();
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    // const { setEditObject } = sessionData();
    const [isModalOpen, setModalOpen] = useState(false);
    const deleteModalOpen = () => {
        setModalOpen(true);
    };
    const deleteModalClose = () => {
        setDeleteItemId("");
        setModalOpen(false);
    };
    const [deleteLoading, setDeleteLoading] = useState(false);
    const deleteModalContent = (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            <p style={{ fontSize: "18px", marginBottom: "10px" }}>
                ARE YOU SURE YOU WANT TO DELETE BRANCH?
            </p>
            <Stack flexDirection="row" gap={3}>
                <Button
                    variant="contained"
                    size="small"
                    disabled={deleteLoading}
                    color="error"
                    onClick={() => handleDelete(deleteItemId)}
                    sx={{
                        // backgroundColor: 'red',
                        // color: 'white',
                        "&:hover": {
                            backgroundColor: "#ff0000",
                        },
                    }}
                >
                    {deleteLoading ? <CircularProgress size={20} /> : "Yes"}
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    disabled={deleteLoading}
                    onClick={deleteModalClose}
                    sx={{
                        backgroundColor: "#007bff",
                        color: "white",
                        "&:hover": {
                            backgroundColor: "#0056b3",
                        },
                    }}
                >
                    No
                </Button>
            </Stack>
        </Box>
    );
    const handleDelete = async (id) => {
        setDeleteLoading(true);
        const url = backendUrl + `/deleteBranch/${id}`;
        const accessToken = sessionStorage.getItem("accessToken");
        try {
            const response = await axios.post(url, null, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.status === 200) {
                setData((prev) => prev.filter((item) => item._id !== id));
                toast.success("Branch deleted");
            }
        } catch (error) {
            console.error("Error deleting branch:", error);
            toast.error("Error deleting branch");
        }
        setDeleteItemId("");
        deleteModalClose();
        setDeleteLoading(false);
    };

    const navigate = useNavigate();
    const handleEdit = (row) => {
        // setEditObject(row);
        // sessionStorage.setItem("edit", JSON.stringify(row));

        // const editObject = JSON.stringify(row);
        navigate(`/branches/edit/${row._id}`);
    };

    const columns = [
        { id: "_id", label: "No" },
        { id: "name", label: "Branch Name" },
        { id: "code", label: "Branch Code" },
        { id: "status", label: "Status" },
        { id: "createdAt", label: "Created Date" },
        { id: "updatedAt", label: "Updated Date" },
        { id: "edit", label: "Edit" },
        { id: "delete", label: "Delete" },
    ];

    const getSortedData = () => {
        // Filter the data based on the search term
        const filteredData = data.filter((row) =>
            row.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (orderBy === null) {
            return filteredData;
        }

        return [...filteredData].sort((a, b) => {
            const aValue = a[orderBy];
            const bValue = b[orderBy];

            if (orderBy === "name" || orderBy === "code" || orderBy === "status") {
                // Check if the values are strings before using localeCompare
                if (typeof aValue === "string" && typeof bValue === "string") {
                    return order === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                } else {
                    // Handle non-string values by converting to strings for comparison
                    return order === "asc"
                        ? String(aValue).localeCompare(String(bValue))
                        : String(bValue).localeCompare(String(aValue));
                }
            }

            if (orderBy === "createdAt" || orderBy === "updatedAt") {
                return order === "asc"
                    ? moment(aValue).valueOf() - moment(bValue).valueOf()
                    : moment(bValue).valueOf() - moment(aValue).valueOf();
            }

            return 0;
        });
    };

    const sortedData = getSortedData();

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };
    const styles = {};
    return (
        <>
            {/* <Stack
                alignItems="center"
                sx={{
                    // background: "linear-gradient(270deg, #1344ef, #36b3d6)",
                    // mx: 1,
                    borderRadius: "10px",
                    width: { xs: "300px" },
                    mx: "auto",
                }}
            >
                <Typography
                    variant="h4"
                    component="span"
                    gutterBottom
                    sx={{
                        textAlign: "center",
                        // backgroundColor: "white",
                        width: 270,
                        height: 35,
                        fontWeight: 700,
                        borderRadius: "10px",
                        m: "5px",
                        // color: "lightblue",
                    }}
                >
                    Branches
                </Typography>
            </Stack> */}
            <Box sx={{ padding: "5px" }}>
                <Stack
                    alignContent="flex-end"
                    flexWrap="wrap"
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="flex-end"
                    gap={2}
                    marginBottom={1}
                    marginTop={1}
                >
                    <Box sx={{ width: { lg: "250px", sm: "200px", xs: "170px" } }}>
                        <TextField
                            label="Search"
                            size="small"
                            variant="outlined"
                            value={searchTerm}
                            sx={{ backgroundColor: "white" }}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(0);
                            }}
                        />
                    </Box>
                    <Link to="/branches/createNew">
                        <Button
                            variant="contained"
                            sx={{ borderRadius: "9px" }}
                        // color="warning"
                        >
                            ADD BRANCH
                        </Button>
                    </Link>
                </Stack>
                <TableContainer component={Paper}>
                    <Table className={styles.table}>
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell
                                        sx={{ fontWeight: 700 }}
                                        key={column.id}
                                        sortDirection={orderBy === column.id ? order : false}
                                        className={styles.tableHeader}
                                    >
                                        {column.id === "_id" || column.id === "action" ? (
                                            <span>{column.label}</span>
                                        ) : (
                                            <TableSortLabel
                                                active={orderBy === column.id}
                                                direction={orderBy === column.id ? order : "asc"}
                                                onClick={() => handleRequestSort(column.id)}
                                            >
                                                {column.label}
                                            </TableSortLabel>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedData.length > 0 ? (
                                sortedData
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((row, index) => (
                                        <TableRow key={index} className={styles.tableRow}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.code}</TableCell>
                                            <TableCell>
                                                <Typography
                                                    sx={{
                                                        backgroundColor:
                                                            row.status === "Active" ? "#13a126" : "red",
                                                        display: "inline-block",
                                                        padding: "1px 12px",
                                                        borderRadius: "50px",
                                                        color: "white",
                                                    }}
                                                    className={
                                                        row.status === "Active"
                                                            ? styles.activeStatus
                                                            : styles.inactiveStatus
                                                    }
                                                >
                                                    {row.status}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {moment(row.createdAt).format("DD-MMM-YYYY hh:mm A")}
                                            </TableCell>
                                            <TableCell>
                                                {row.updatedAt
                                                    ? moment(row.updatedAt).format("DD-MMM-YYYY hh:mm A")
                                                    : "NO DATA"}
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    onClick={() => handleEdit(row)}
                                                    className={styles.editButton}
                                                >
                                                    <IconEdit color="#2860e0" />
                                                </IconButton>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    onClick={() => {
                                                        setDeleteItemId(row._id);
                                                        setModalOpen(true);
                                                    }}
                                                    className={styles.deleteButton}
                                                >
                                                    <IconTrash color="red" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7}>NO DATA</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[10]}
                    component="div"
                    count={data.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                />
                {isModalOpen && (
                    <Modal
                        open={isModalOpen}
                        // onClose={deleteModalClose}
                        className="create-folder-modal"
                    >
                        <div
                            style={{ gap: "10px", position: "relative" }}
                            className="create-folder-modal-content-container"
                        >
                            {deleteModalContent}
                        </div>
                    </Modal>
                )}
            </Box>
        </>
    );
};

function List(props) {
    const styles = {};
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [data, setData] = useState([]);
    // const { setEditObject } = sessionData();
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(""); // Add searchTerm state
    const url = backendUrl + "/getAllBranches";

    const fetchData = async () => {
        const accessToken = sessionStorage.getItem("accessToken");

        try {
            const response = await axios.post(url, null, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.status === 200) {
                setIsLoading(false);
                setData(response.data.branches);
            }
        } catch (error) {
            // alert('unable to fetch data')
            setIsLoading(false);
            console.error("Error fetching branches:", error);
        }
    };

    useEffect(() => {
        fetchData();
        // setEditObject({});
    }, []);

    return (
        <>
            {isLoading ? <ComponentLoader /> : <Stack flexDirection="row">
                <div
                    className={styles.padding}
                    style={{
                        width: "100%",
                        position: "relative",
                        overflow: "auto",
                    }}
                >
                    <MyTable
                        data={data}
                        props={props}
                        setData={setData}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                    />

                    {isLoading && (
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%,-50%)",
                                zIndex: "9999",
                            }}
                        >
                            <CircularProgress color="inherit" size={30} />
                        </div>
                    )}
                </div>
            </Stack>}
        </>

    );
}

export default List;
