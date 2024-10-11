import React, { useEffect, useState } from "react";
import {
    Table,
    TableContainer,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    Button,
    IconButton,
    Typography,
    Box,
    Stack,
    TablePagination,
    TextField,
    TableSortLabel,
    Modal,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
// import Sidedrawer from "../drawer/Sidedrawer";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { CircularProgress } from "@mui/material";
import moment from "moment";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import { toast } from "react-toastify";
import ComponentLoader from "../../common/Loader/ComponentLoader";
// import useStoreData, { sessionData } from "../../Store";

const Users = ({ data, setData, searchTerm, setSearchTerm }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const styles = {}
    // const { setEditObject } = sessionData();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState("asc");
    const navigate = useNavigate();
    const columns = [
        // { id: "_id", label: "No" },
        { id: "username", label: "Username" },
        { id: "branch", label: "Branch" },
        { id: "role", label: "Role" },
        { id: "email", label: "Email" },
        { id: "status", label: "Status" },
        { id: "createdAt", label: "Created Date" },
        { id: "edit", label: "Edit" },
        { id: "delete", label: "Delete" },
    ];

    const handleEdit = (row) => {
        // setEditObject(row);
        // const editObject = JSON.stringify(row);
        navigate(`/users/edit/${row._id}`);
    };
    const [isModalOpen, setModalOpen] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState();
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
                ARE YOU SURE YOU WANT TO DELETE USER?
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
                    onClick={deleteModalClose}
                    disabled={deleteLoading}
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
        try {
            const url = backendUrl + `/deleteUser/${id}`;
            const accessToken = sessionStorage.getItem("accessToken");
            const { status } = await axios.post(url, null, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (status === 200) {
                setData((prev) => {
                    return prev.filter((item) => item._id !== id);
                });
                toast.success("User is deleted");
            }
        } catch (error) {
            toast.error("Error deleting user");
        } finally {
            deleteModalClose();
        }
        setDeleteLoading(false);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    // Define the columns you want to make sortable
    const sortableColumns = [
        "username",
        "branch",
        "role",
        "email",
        "status",
        "createdAt",
    ];
    const getSortedData = () => {
        if (orderBy === null) {
            return data;
        }

        return [...data].sort((a, b) => {
            const aValue = a[orderBy];
            const bValue = b[orderBy];

            if (sortableColumns.includes(orderBy)) {
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

            if (orderBy === "createdAt") {
                const momentA = moment(aValue);
                const momentB = moment(bValue);

                return order === "asc" ? momentA - momentB : momentB - momentA;
            }

            return 0;
        });
    };

    const filteredData = getSortedData().filter((row) => {
        // Filter the data based on the search term
        return (
            row.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
            moment(row.createdAt)
                .format("DD-MMM-YYYY hh:mm A")
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
        );
    });

    return (
        <>
            {/* <Stack
                alignItems="center"
                sx={{
                    // background: "linear-gradient(270deg, #1344ef, #36b3d6)",
                    // mx: 1,
                    borderRadius: "10px",
                    // width: { xs: "300px" },
                    // mx: "auto",
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
                    Users
                </Typography>
            </Stack> */}
            <Box>
                <Stack
                    alignContent="flex-end"
                    flexWrap="wrap"
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="flex-end"
                    marginBottom={1}
                    marginTop={1}
                >
                    <Box sx={{ width: { lg: "250px", sm: "200px", xs: "170px" } }}>
                        <TextField
                            label="Search"
                            variant="outlined"
                            size="small"
                            sx={{ background: "white" }}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(0);
                            }}
                        />
                    </Box>
                    <Link to="/users/createNew">
                        <Button
                            variant="contained"
                            sx={{ borderRadius: "9px" }}
                        // color="warning"
                        >
                            ADD USER
                        </Button>
                    </Link>
                </Stack>
                <TableContainer component={Paper} className={styles.tableContainer}>
                    <Table className={styles.table}>
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        sx={{ fontWeight: 700 }}
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
                            {filteredData.length > 0 ? (
                                filteredData
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((row, index) => (
                                        <TableRow key={row._id} className={styles.tableRow}>
                                            {/* <TableCell>{index + 1}</TableCell> */}
                                            <TableCell>{row.username}</TableCell>
                                            <TableCell>{row.branch}</TableCell>
                                            <TableCell>{row.role}</TableCell>
                                            <TableCell>{row.email}</TableCell>
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
                                                >
                                                    {row.status}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {moment(row.createdAt).format("DD-MMM-YYYY hh:mm A")}
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    className={styles.editButton}
                                                    onClick={() => handleEdit(row)}
                                                >
                                                    <IconEdit color="#2860e0" />
                                                </IconButton>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    className={styles.deleteButton}
                                                    onClick={() => {
                                                        setDeleteItemId(row._id);
                                                        setModalOpen(true);
                                                    }}
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
                    count={filteredData.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                />
                {isModalOpen && (
                    <Modal
                        open={isModalOpen}
                        onClose={deleteModalClose}
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

function List() {
    const styles = {};
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    // const { setEditObject } = sessionData();
    const [data, setData] = useState([]);
    const url = backendUrl + "/getUsers";
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(""); // Initialize searchTerm state

    const fetchData = async () => {
        try {
            const accessToken = sessionStorage.getItem("accessToken");
            const { data, status } = await axios.post(url, null, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (status === 200) {
                setData(data.users);
                setIsLoading(false);
            }
        } catch (error) {
            // Handle the error and show an alert
            console.error("Error:", error);
            setIsLoading(false);
            // alert('Unable to fetch data. Please try again.');
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
                        // backgroundColor: "whitesmoke
                        maxHeight: "fit-content",
                        position: "relative",
                        // padding: "20px",
                        // backgroundColor: "white",
                        overflow: "auto",
                    }}
                >
                    {/* <Paper
          elevation={3}
          sx={{ margin: "5px", maxHeight: "fit-content", minHeight: "99%" }}
        > */}
                    <Users
                        data={data}
                        setData={setData}
                        searchTerm={searchTerm} // Pass searchTerm to Users component
                        setSearchTerm={setSearchTerm} // Pass setSearchTerm to Users component
                    />
                    {/* </Paper> */}
                    {isLoading && (
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%,-50%)",
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
