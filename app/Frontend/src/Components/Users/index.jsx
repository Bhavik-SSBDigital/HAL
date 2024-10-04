import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Button,
    Dialog,
    TextField,
    MenuItem,
    Stack,
    Typography,
    DialogContent,
    DialogContentText,
    DialogActions,
    DialogTitle,
    CircularProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import moment from "moment";

const Users = () => {
    const {
        register,
        handleSubmit,
        setValue,
        reset,
        control,
        formState: { errors, isSubmitting },
    } = useForm();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState(null);
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [roles, setRoles] = useState([]);

    const handleOpen = () => {
        setIsEdit(false);
        setOpen(true);
    };
    const handleClose = () => {
        setIsEdit(false);
        setOpen(false);
        reset({
            username: "",
            name: "",
            email: "",
            role: "",
            status: "",
            branch: "",
        });
    };

    const onSubmit = async (formData) => {
        if (isEdit) {
            await axios.post(`${backendUrl}/editUser/${editId}`, formData, {
                headers: {
                    Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzM0NDcwOCwiZXhwIjoxNzU4ODgwNzA4fQ.R3QEM3pzBdG8Y1zrG48EKjy3k14aKEmmw479xSJXScI`,
                },
            });

            // Update state by replacing the edited user
            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user._id === editId ? { ...user, ...formData } : user
                )
            );
        } else {
            const { data: newUser } = await axios.post(
                `${backendUrl}/signup`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzM0NDcwOCwiZXhwIjoxNzU4ODgwNzA4fQ.R3QEM3pzBdG8Y1zrG48EKjy3k14aKEmmw479xSJXScI`,
                    },
                }
            );

            // Add the new user to the state
            setUsers((prevUsers) => [...prevUsers, { _id: Date.now(), ...formData }]);
        }

        handleClose();
    };

    const handleEdit = (user) => {
        setEditId(user._id);
        setIsEdit(true);
        setOpen(true);

        // Set form values for editing
        setValue("username", user.username);
        setValue("name", user.name);
        setValue("email", user.email);
        setValue("role", user.role);
        setValue("status", user.status);
        setValue("branch", user.branch); // Assume branch stores _id

        // Fetch roles for the selected branch
        const { _id } = branches.find((data) => data.name === user.branch);
        console.log(_id);
        getRoles(_id);
    };

    const handleDelete = async () => {
        await axios.post(`${backendUrl}/deleteUser/${deleteId}`, null, {
            headers: {
                Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzM0NDcwOCwiZXhwIjoxNzU4ODgwNzA4fQ.R3QEM3pzBdG8Y1zrG48EKjy3k14aKEmmw479xSJXScI`,
            },
        });
        setUsers((prevUsers) => prevUsers.filter((user) => user._id !== deleteId));
        setConfirmOpen(false);
        getUsers();
    };

    const getBranches = async () => {
        const res = await axios.post(`${backendUrl}/getAllBranches`, null, {
            headers: {
                Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzM0NDcwOCwiZXhwIjoxNzU4ODgwNzA4fQ.R3QEM3pzBdG8Y1zrG48EKjy3k14aKEmmw479xSJXScI`,
            },
        });
        setBranches(res.data.branches);
    };

    const getRoles = async (branchId) => {
        const res = await axios.post(
            `${backendUrl}/getRolesInBranch/${branchId}`,
            null,
            {
                headers: {
                    Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzM0NDcwOCwiZXhwIjoxNzU4ODgwNzA4fQ.R3QEM3pzBdG8Y1zrG48EKjy3k14aKEmmw479xSJXScI`,
                },
            }
        );
        setRoles(res.data.roles);
    };

    const handleBranchChange = (e) => {
        const selectedBranch = e.target.value;
        const selectedBranchId = branches.find((branch) => e.target.value == branch.name)
        setValue("branch", selectedBranch);
        getRoles(selectedBranchId._id);
    };

    const getUsers = async () => {
        const res = await axios.post(`${backendUrl}/getUsers`, null, {
            headers: {
                Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0tlZXBlck9mUGh5c2ljYWxEb2NzIjpmYWxzZSwiX2lkIjoiNjYwNjYxNGYyMjdiZWU2ZjRkZDVhNjg0IiwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiZWRwbWlzLmhvQGtkY2NiYW5rLmluIiwicGFzc3dvcmQiOiIkMmIkMTAkY3d0UFlzRVlNMG9JcmR3UEUzWHRkLkl5VzNEcU5vNjhMZUs3cy5ueVpkM3Y1WlZBdUxxQ20iLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlhdCI6MTcyNzM0NDcwOCwiZXhwIjoxNzU4ODgwNzA4fQ.R3QEM3pzBdG8Y1zrG48EKjy3k14aKEmmw479xSJXScI`,
            },
        });
        setUsers(res.data.users);
    };

    useEffect(() => {
        getUsers();
        getBranches();
    }, []);
    const handleConfirmClose = () => {
        setConfirmOpen(false);
        setDeleteId(null);
    }; // Close confirmation dialog

    const handleDeleteConfirmation = (id) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };
    const columns = [
        { field: "username", headerName: "Username", width: 180, flex: 1 },
        { field: "email", headerName: "Email", width: 180, flex: 1 },
        { field: "role", headerName: "Role", width: 180, flex: 1 },
        { field: "status", headerName: "Status", width: 180, flex: 1 },
        { field: "branch", headerName: "Branch", width: 180, flex: 1 },
        {
            field: "createdAt",
            headerName: "Created Date",
            valueGetter: (value) => moment(value).format("DD-MM-YYYY hh:mm"),
            width: 180,
            flex: 1
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 180,
            renderCell: (params) => (
                <div>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleEdit(params.row)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        sx={{ marginLeft: "10px" }}
                        onClick={() => handleDeleteConfirmation(params.row._id)}
                    >
                        Delete
                    </Button>
                </div>
            ),
            flex: 1
        },
    ];

    return (
        <div className="cardDesign" style={{ margin: "5px" }}>
            <Stack alignItems="flex-end" my={1}>
                <Button
                    variant="contained"
                    onClick={handleOpen}
                    sx={{ width: "200px" }}
                    color="primary"
                >
                    Create New User
                </Button>
            </Stack>
            <div style={{ width: "100%" }}>
                <DataGrid
                    rows={users}
                    columns={columns}
                    pageSize={10}
                    getRowId={(row) => row._id}
                />
            </div>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <div style={{ padding: 20 }}>
                    <Typography variant="h5">
                        {isEdit ? "Edit User" : "Create User"}
                    </Typography>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <TextField
                            label="Username"
                            fullWidth
                            margin="normal"
                            {...register("username", { required: true })}
                            error={!!errors.username}
                            helperText={errors.username && "Username is required"}
                        />
                        <TextField
                            label="Name"
                            fullWidth
                            margin="normal"
                            {...register("name", { required: true })}
                            error={!!errors.name}
                            helperText={errors.name && "Name is required"}
                        />
                        <TextField
                            label="Email"
                            fullWidth
                            margin="normal"
                            {...register("email", { required: true })}
                            error={!!errors.email}
                            helperText={errors.email && "Email is required"}
                        />
                        <Controller
                            name="branch"
                            control={control}
                            defaultValue=""
                            rules={{ required: "Branch is required" }}
                            render={({ field }) => (
                                <TextField
                                    label="Branch"
                                    select
                                    fullWidth
                                    margin="normal"
                                    error={!!errors.branch}
                                    helperText={errors.branch?.message}
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(e); // Important to maintain field change
                                        handleBranchChange(e); // Custom handler if needed
                                    }}
                                >
                                    {branches?.map((branch) => (
                                        <MenuItem key={branch.name} value={branch.name}>
                                            {branch.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                        <Controller
                            name="role"
                            control={control}
                            defaultValue=""
                            rules={{ required: "Role is required" }}
                            render={({ field }) => (
                                <TextField
                                    label="Role"
                                    select
                                    fullWidth
                                    margin="normal"
                                    error={!!errors.role}
                                    helperText={errors.role?.message}
                                    {...field}
                                >
                                    {roles?.map((role) => (
                                        <MenuItem key={role.role} value={role.role}>
                                            {role.role}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />

                        <Controller
                            name="status"
                            control={control}
                            defaultValue=""
                            rules={{ required: "Status is required" }}
                            render={({ field }) => (
                                <TextField
                                    label="Status"
                                    select
                                    fullWidth
                                    margin="normal"
                                    error={!!errors.status}
                                    helperText={errors.status?.message}
                                    {...field}
                                >
                                    <MenuItem value="Active">Active</MenuItem>
                                    <MenuItem value="Inactive">Inactive</MenuItem>
                                </TextField>
                            )}
                        />
                        <Button disabled={isSubmitting} fullWidth type="submit" variant="contained" color="primary">
                            {isSubmitting ? <CircularProgress size={24}/> : isEdit ? "Save Changes" : "Submit"}
                        </Button>
                    </form>
                </div>
            </Dialog>
            <Dialog open={confirmOpen} onClose={handleConfirmClose}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this branch? This action cannot be
                        undone.
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

export default Users;
