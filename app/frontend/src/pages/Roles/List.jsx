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
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { CircularProgress } from "@mui/material";
import moment from "moment";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import { toast } from "react-toastify";
import ComponentLoader from "../../common/Loader/ComponentLoader";
// import useStoreData, { sessionData } from "../../Store";

const Roles = ({ setIsLoading, isLoading, roles, setRoles }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const styles = {};
    // const { setEditObject } = sessionData();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const url = backendUrl + "/getRoles";


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
                ARE YOU SURE YOU WANT TO DELETE ROLE?
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
        try {
            const url = backendUrl + `/deleteRole/${id}`;
            const accessToken = sessionStorage.getItem("accessToken");
            const { status } = await axios.post(url, null, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (status === 200) {
                setRoles((prev) => {
                    return prev.filter((item) => item._id !== id);
                });
                toast.success("Role deleted");
            }
        } catch (error) {
            toast.error("Error deleting role");
        } finally {
            setDeleteLoading(false);
            deleteModalClose();
        }
    };


    const navigate = useNavigate();
    const handleEdit = (row) => {
        navigate(`/roles/edit/${row._id}`);
    };

    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState("asc");

    const columns = [
        { id: "_id", label: "No" },
        { id: "role", label: "Role Name" },
        { id: "branch", label: "Branch" },
        { id: "createdAt", label: "Created At" },
        { id: "updatedAt", label: "Updated At" },
        { id: "status", label: "Status" },
        { id: "edit", label: "Edit" },
        { id: "delete", label: "Delete" },
    ];

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const sortableColumns = [
        "role",
        "branch",
        "createdAt",
        "updatedAt",
        "status",
    ];

    const getSortedData = () => {
        if (orderBy === null) {
            return roles;
        }

        return [...roles].sort((a, b) => {
            const aValue = a[orderBy];
            const bValue = b[orderBy];

            if (orderBy === "role") {
                // Check if the values are defined before using localeCompare
                if (aValue && bValue) {
                    return order === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                } else {
                    // Handle undefined values by treating them as equal
                    return 0;
                }
            }

            if (sortableColumns.includes(orderBy)) {
                if (typeof aValue === "string" && typeof bValue === "string") {
                    return order === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                } else {
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
        return (
            row.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.branch.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    return (
        <>
            {/* <Stack
                alignItems="center"
                sx={{
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
                        width: 270,
                        height: 35,
                        fontWeight: 700,
                        borderRadius: "10px",
                        m: "5px",
                        // color: "lightblue",
                    }}
                >
                    Roles
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
                            sx={{ background: "white" }}
                            size="small"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(0);
                            }}
                        />
                    </Box>
                    <Link to="/roles/createNew">
                        <Button
                            variant="contained"
                            sx={{ borderRadius: "9px" }}
                        // color="warning"
                        >
                            ADD ROLE
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
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{row.role}</TableCell>
                                            <TableCell>{row.branch}</TableCell>
                                            <TableCell>
                                                {row.createdAt
                                                    ? moment(row.createdAt).format("DD-MMM-YYYY hh:mm A")
                                                    : "NO DATA"}
                                            </TableCell>
                                            <TableCell>
                                                {row.updatedAt
                                                    ? moment(row.updatedAt).format("DD-MMM-YYYY hh:mm A")
                                                    : "NO DATA"}
                                            </TableCell>
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
                                                    {row.status ? row.status : "NO DATA"}
                                                </Typography>
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
                                    <TableCell colSpan={6}>NO DATA</TableCell>
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
            </Box>
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
        </>
    );
};

function List() {
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const url = backendUrl + "/getRoles";
    const fetchData = async () => {
        try {
            const accessToken = sessionStorage.getItem("accessToken");
            const { data, status } = await axios.post(url, null, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (status) {
                setRoles(data.roles);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Error:", error);
            setIsLoading(false);
            // alert("Unable to fetch roles. Please try again.");
        }
    };
    useEffect(() => {
        fetchData();
        // setEditObject({});
    }, []);
    const styles = {}
    return (
        <>
            {isLoading ? <ComponentLoader /> : <Stack flexDirection="row">
                <div
                    className={styles.padding}
                    style={{
                        width: "100%",
                        maxHeight: "fit-content",
                        position: "relative",
                        overflow: "auto",
                    }}
                >
                    <Roles roles={roles} setRoles={setRoles} setIsLoading={setIsLoading} isLoading={isLoading} />
                </div>
            </Stack>}
        </>
    );
}

export default List;
