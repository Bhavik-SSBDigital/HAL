import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import moment from "moment";

const Branches = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const { register, handleSubmit, setValue, control, reset, formState: { errors } } = useForm();
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false); // Track edit mode 
    const [editId, setEditId] = useState(null); // Store the ID of the branch being edited
    const [branches, setBranches] = useState([]);
    const [deleteId, setDeleteId] = useState(null); // Store the ID of the branch to delete
    const [confirmOpen, setConfirmOpen] = useState(false); // Confirmation dialog state

    const handleOpen = () => {
        reset(); // Clear form on open
        setOpen(true);
        setEditMode(false); // Set mode to create by default
    };
    const handleClose = () => setOpen(false);
    const handleConfirmClose = () => setConfirmOpen(false); // Close confirmation dialog

    const onSubmit = async (formData) => {
        try {
            if (editMode) {
                // Edit existing branch
                await axios.post(`${backendUrl}/editBranch/${editId}`, formData, {
                    headers: { Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzMzMzI5MCwiZXhwIjoxNzU4ODY5MjkwfQ.n3JOBGqolQlOIFjd5E_olTtITakxPk_omzgLzC7QUbE` }, // Token placeholder
                });
                setBranches((prev) =>
                    prev.map((branch) =>
                        branch._id === editId ? { ...branch, ...formData } : branch
                    )
                );
            } else {
                // Create new branch
                const res = await axios.post(`${backendUrl}/createBranch`, formData, {
                    headers: { Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzMzMzI5MCwiZXhwIjoxNzU4ODY5MjkwfQ.n3JOBGqolQlOIFjd5E_olTtITakxPk_omzgLzC7QUbE` }, // Token placeholder
                });
                setBranches([...branches, { ...formData, _id: res.data._id }]); // Assuming the created branch is returned with _id
            }
            handleClose();
        } catch (error) {
            console.error("Error creating/editing branch", error);
        }
    };

    // Handle delete branch request
    const handleDelete = async () => {
        try {
            await axios.post(`${backendUrl}/deleteBranch/${deleteId}`, null, {
                headers: { Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzMzMzI5MCwiZXhwIjoxNzU4ODY5MjkwfQ.n3JOBGqolQlOIFjd5E_olTtITakxPk_omzgLzC7QUbE` }, // Token placeholder
            });
            setBranches(branches.filter(branch => branch._id !== deleteId)); // Remove deleted branch
            setConfirmOpen(false); // Close confirmation dialog
        } catch (error) {
            console.error("Error deleting branch", error);
        }
    };

    const columns = [
        { field: "code", headerName: "Code", width: 180 },
        { field: "name", headerName: "Name", width: 180 },
        { field: "status", headerName: "Status", width: 180 },
        {
            field: "createdAt",
            headerName: "Created Date",
            valueGetter: (value) => moment(value).format("DD-MM-YYYY hh:mm"),
            width: 180,
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 250,
            renderCell: (params) => (
                <>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleEdit(params.row)} // Trigger edit mode for the selected row
                    >
                        Edit
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        style={{ marginLeft: "10px" }}
                        onClick={() => handleDeleteConfirmation(params.row._id)} // Trigger delete confirmation
                    >
                        Delete
                    </Button>
                </>
            ),
        },
    ];

    const getBranches = async () => {
        try {
            const url = `${backendUrl}/getAllBranches`;
            const res = await axios.post(url, null, {
                headers: {
                    Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzMzMzI5MCwiZXhwIjoxNzU4ODY5MjkwfQ.n3JOBGqolQlOIFjd5E_olTtITakxPk_omzgLzC7QUbE`, // Token placeholder
                },
            });
            setBranches(res.data.branches);
        } catch (error) {
            console.error("Error fetching branches", error);
        }
    };

    const handleEdit = (branch) => {
        setEditId(branch._id); // Set the ID of the branch being edited
        setEditMode(true); // Enable edit mode
        setOpen(true); // Open the dialog

        // Pre-fill the form with the branch data
        setValue("code", branch.code);
        setValue("name", branch.name);
        setValue("status", branch.status);
    };

    const handleDeleteConfirmation = (id) => {
        setDeleteId(id); // Store the ID of the branch to delete
        setConfirmOpen(true); // Open the confirmation dialog
    };

    useEffect(() => {
        getBranches();
    }, []);

    return (
        <div className="cardDesign" style={{ marginTop: "5px", margin: "5px" }}>
            <Stack alignItems="flex-end" my={1}>
                <Button
                    variant="contained"
                    onClick={handleOpen}
                    sx={{ width: "200px" }}
                    color="primary"
                >
                    Create New Branch
                </Button>
            </Stack>
            <div style={{ width: "100%" }}>
                <DataGrid
                    rows={branches}
                    columns={columns}
                    getRowId={(row) => row._id}
                />
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <div style={{ padding: 20 }}>
                    <Typography variant="h5">
                        {editMode ? "Edit Branch" : "Create Branch"}
                    </Typography>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <TextField
                            label="Code"
                            fullWidth
                            margin="normal"
                            {...register("code", { required: true })}
                            error={!!errors.code}
                            helperText={errors.code && "Code is required"}
                        />
                        <TextField
                            label="Name"
                            fullWidth
                            margin="normal"
                            {...register("name", { required: true })}
                            error={!!errors.name}
                            helperText={errors.name && "Name is required"}
                        />
                        <Controller
                            name="status"
                            control={control}
                            defaultValue=""
                            rules={{ required: "Status is required" }}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <TextField
                                    label="Status"
                                    select
                                    fullWidth
                                    margin="normal"
                                    value={value}
                                    onChange={onChange}
                                    error={!!error}
                                    helperText={error ? error.message : ""}
                                >
                                    <MenuItem value="Active">Active</MenuItem>
                                    <MenuItem value="Inactive">Inactive</MenuItem>
                                </TextField>
                            )}
                        />
                        <Button fullWidth type="submit" variant="contained" color="primary">
                            {editMode ? "Update" : "Submit"}
                        </Button>
                    </form>
                </div>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmOpen}
                onClose={handleConfirmClose}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this branch? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} color="secondary" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Branches;
