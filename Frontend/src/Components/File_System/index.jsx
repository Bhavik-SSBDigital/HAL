import React, { useEffect, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    IconButton,
    Card,
    CardContent,
    Stack,
    Grid2,
    Tooltip,
} from "@mui/material";
import {
    Folder,
    Delete,
    InsertDriveFile,
    CloudUpload,
    Download,
} from "@mui/icons-material";
import { IconChevronRight, IconSmartHome } from "@tabler/icons-react";
import axios from "axios";
import sessionData from "../../store";
import FileIcon from "../Common/FileIcon";
import moment from "moment";
import { DataGrid } from "@mui/x-data-grid";
import { Link, useNavigate } from "react-router-dom";
import styles from './FileSystem.module.css'

export default function FileSystem() {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const { path, setPath } = sessionData();
    const [folders, setFolders] = useState([]);
    const [uploadPermission, setUploadPermission] = useState();
    const [openDialog, setOpenDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const directories = folders?.filter((item) => item.type == "folder");
    const files = folders?.filter((item) => item.type == "file");

    const handleCreateFolder = () => {
        setFolders([...folders, { name: newFolderName, files: [] }]);
        setNewFolderName("");
        setOpenDialog(false);
    };

    const getFoldersFiles = async (pathValue) => {
        const url = backendUrl + "/accessFolder";
        try {
            const res = await axios.post(
                url,
                {
                    path: pathValue,
                },
                {
                    headers: {
                        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzM0NDcwOCwiZXhwIjoxNzU4ODgwNzA4fQ.R3QEM3pzBdG8Y1zrG48EKjy3k14aKEmmw479xSJXScI`,
                    },
                }
            );
            setFolders(res.data.children || []);
            console.log(res.data.children);
            setUploadPermission(res.data.isUploadable);
        } catch (error) {
            console.log(error?.error);
        }
    };
    const handleOpenFolder = (folderName) => {
        const newPath = `${path}/${folderName}`;
        setPath(newPath);
        getFoldersFiles(newPath);
    };

    const getFolders = async () => {
        const url = `${backendUrl}/getProjects`;
        try {
            const res = await axios.post(url, null, {
                headers: {
                    Authorization:
                        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzM0NDcwOCwiZXhwIjoxNzU4ODgwNzA4fQ.R3QEM3pzBdG8Y1zrG48EKjy3k14aKEmmw479xSJXScI",
                },
            });
            setFolders(res.data.children);
        } catch (error) {
            console.log(error?.message);
        }
    };
    // files manage
    const columns = [
        {
            field: "name",
            headerName: "File Name",
            flex: 1,
            renderCell: (params) => (
                <Typography
                    variant="body2"
                    display="flex"
                    alignItems="center"
                    my="auto"
                    sx={{ display: "flex", height: "100%", alignItems: "center" }}
                >
                    <FileIcon name={params.value} sx={{ mr: 1 }} />
                    {params.value}
                </Typography>
            ),
        },
        {
            field: "size",
            headerName: "Size",
            flex: 0.5,
            valueGetter: (value) => formatFileSize(value),
        },
        {
            field: "createdOn",
            headerName: "Created On",
            flex: 0.5,
            valueGetter: (value) => moment(value).format("DD-MM-YYYY HH:MM"),
        },
        {
            field: "actions",
            headerName: "Actions",
            sortable: false,
            flex: 0.5,
            renderCell: (params) => (
                <>
                    {params.row.isDownloadable && (
                        <IconButton
                            onClick={() => {
                                // Implement download functionality
                                console.log(`Downloading file: ${params.row.name}`);
                            }}
                        >
                            <Download />
                        </IconButton>
                    )}
                    <IconButton
                        onClick={() => {
                            // Implement delete functionality
                            console.log(`Deleting file: ${params.row.name}`);
                        }}
                    >
                        <Delete />
                    </IconButton>
                </>
            ),
        },
    ];
    const handleDeleteFile = (folderName, fileName) => {
        setFolders(
            folders.map((folder) => {
                if (folder.name === folderName) {
                    return {
                        ...folder,
                        files: folder.files.filter((file) => file !== fileName),
                    };
                }
                return folder;
            })
        );
    };
    const formatFileSize = (size) => {
        console.log(size);
        // Utility function to format file size in a more readable form
        const units = ["B", "KB", "MB", "GB", "TB"];
        let unitIndex = 0;
        let formattedSize = size;

        while (formattedSize >= 1024 && unitIndex < units.length - 1) {
            formattedSize /= 1024;
            unitIndex++;
        }

        return `${formattedSize.toFixed(2)} ${units[unitIndex]}`;
    };

    useEffect(() => {
        if (path !== "..") {
            getFoldersFiles(path)
        }
        else {
            getFolders();
        }
    }, [path]);

    // navigation bar
    const navigate = useNavigate();
    const pathValue = path;
    const handlePathClick = (index) => {
        const pathSegments = pathValue.split("/");
        if (index >= 0 && index < pathSegments.length) {
            const newPathSegments = pathSegments.slice(0, index + 1);
            const newPath = newPathSegments.join("/");
            sessionStorage.setItem("path", newPath);
            // console.log("New path:", newPath);
            setPath(newPath);
            if (newPath === "..") {
                // sessionStorage.setItem('path', newPath);
                navigate("/files");
            }
        } else {
            console.error("Invalid index:", index);
        }
    };
    function truncateFileName(fileName, maxLength = 10) {
        if (fileName.length <= maxLength) {
            return fileName;
        } else {
            const truncatedName = fileName.substring(0, maxLength - 3); // Subtracting 3 for the ellipsis
            return truncatedName + "...";
        }
    }
    return (
        <Box sx={{ flexGrow: 1, p: 2, minHeight: "calc(100vh - 80px)" }}>
            <div className={styles.navigationContainer} >
                {pathValue.split("/").map((item, index) => {
                    return (
                        <>
                            {index > 0 && (
                                <IconChevronRight size={20} color="gray" style={{ margin: "0 5px" }} />
                            )}
                            <Tooltip title={item.length >= 10 ? item === ".." ? "/" : item : null}>
                                <Link underline="hover" color="inherit"
                                    onClick={() => handlePathClick(index)}
                                    style={{ minWidth: "20px" }}
                                >
                                    {item === ".." ? <IconSmartHome /> : truncateFileName(item)}
                                </Link>
                            </Tooltip>
                        </>
                    )
                })}
            </div>
            {/* Header with User Info */}

            {directories.length ? (
                <>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            ml: "2px",
                            alignItems: "center",
                            mb: 2,
                        }}
                    >
                        <Typography variant="h6" fontWeight={600}>
                            Folders
                        </Typography>
                    </Box>
                    <Grid2 container spacing={2} mb={4}>
                        {directories.map((folder, index) => (
                            <Grid2 item size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={index}>
                                <Card
                                    className="cardDesign"
                                    sx={{ p: "12px !important" }}
                                    onClick={() => handleOpenFolder(folder.name)}
                                >
                                    <Grid2 container>
                                        <Grid2 item>
                                            <Stack
                                                sx={{
                                                    backgroundColor: "#F3F4F6",
                                                    width: "55px",
                                                    height: "50px",
                                                    borderRadius: "8px",
                                                }}
                                                justifyContent="center"
                                                alignItems="center"
                                            >
                                                <Folder
                                                    fontSize="large"
                                                    sx={{ color: "#6C63FF", fontSize: "40px" }}
                                                />
                                            </Stack>
                                        </Grid2>
                                        <Grid2 item sx={{ ml: 1 }}>
                                            <CardContent sx={{ p: 0, pb: "0px !important" }}>
                                                <Typography variant="body1" fontWeight={600}>
                                                    {folder.name}
                                                </Typography>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="subtitle2">
                                                        2320 Items | 1.60 GB
                                                    </Typography>
                                                </Stack>
                                            </CardContent>
                                        </Grid2>
                                    </Grid2>
                                </Card>
                            </Grid2>
                        ))}
                    </Grid2>{" "}
                </>
            ) : null}

            {files?.length ? (
                <Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            ml: "2px",
                            alignItems: "center",
                            mb: 2,
                        }}
                    >
                        <Typography variant="h6" fontWeight={600}>
                            Files
                        </Typography>
                    </Box>
                    {/* <Button
                        startIcon={<CloudUpload />}
                        variant="contained"
                        color="primary"
                        sx={{ my: "5px", ml: "auto", display: 'flex' }}
                    >
                        Upload File
                    </Button> */}

                    <div className="cardDesign" style={{ padding: "0px !important" }}>
                        <DataGrid
                            rows={files}
                            columns={columns}
                            pageSize={5}
                            rowsPerPageOptions={[5, 10, 20]}
                            getRowId={(row) => row.id} // Define the unique id for each row
                            disableSelectionOnClick
                            autoHeight
                        />
                    </div>
                </Box>
            ) : null}

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder Name"
                        fullWidth
                        variant="outlined"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateFolder} variant="contained">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
