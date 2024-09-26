import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Dialog, TextField, MenuItem, Stack, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const Users = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState([
        { id: 1, username: "john_doe", name: "John Doe", email: "john@example.com", role: "Admin", status: "Active", branch: "Central" },
        { id: 2, username: "jane_smith", name: "Jane Smith", email: "jane@example.com", role: "User", status: "Inactive", branch: "North" },
        { id: 3, username: "emily_jones", name: "Emily Jones", email: "emily@example.com", role: "User", status: "Active", branch: "South" },
        { id: 4, username: "michael_brown", name: "Michael Brown", email: "michael@example.com", role: "Admin", status: "Inactive", branch: "East" },
        { id: 5, username: "susan_clark", name: "Susan Clark", email: "susan@example.com", role: "User", status: "Active", branch: "West" },
        { id: 31, username: "emily_jones", name: "Emily Jones", email: "emily@example.com", role: "User", status: "Active", branch: "South" },
        { id: 41, username: "michael_brown", name: "Michael Brown", email: "michael@example.com", role: "Admin", status: "Inactive", branch: "East" },
        { id: 51, username: "susan_clark", name: "Susan Clark", email: "susan@example.com", role: "User", status: "Active", branch: "West" },
        { id: 311, username: "emily_jones", name: "Emily Jones", email: "emily@example.com", role: "User", status: "Active", branch: "South" },
        { id: 11, username: "michael_brown", name: "Michael Brown", email: "michael@example.com", role: "Admin", status: "Inactive", branch: "East" },
        { id: 115, username: "susan_clark", name: "Susan Clark", email: "susan@example.com", role: "User", status: "Active", branch: "West" },
    ]);

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const onSubmit = (formData) => {
        setUsers([...users, { id: users.length + 1, ...formData }]);
        handleClose();
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'username', headerName: 'Username', width: 150 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'role', headerName: 'Role', width: 130 },
        { field: 'status', headerName: 'Status', width: 100 },
        { field: 'branch', headerName: 'Branch', width: 150 },
    ];

    return (
        <div className="cardDesign" style={{ marginTop: '5px', margin: "5px" }}>
            <Stack alignItems="flex-end" my={1}>
                <Button variant="contained" onClick={handleOpen} sx={{ width: "200px" }} color="primary">
                    Create New User
                </Button>
            </Stack>
            <div style={{ width: '100%' }}>
                <DataGrid rows={users} columns={columns} pageSize={5} />
            </div>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <div style={{ padding: 20 }}>
                    <Typography variant="h5">Create User</Typography>
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
                        <TextField
                            label="Role"
                            select
                            fullWidth
                            margin="normal"
                            {...register("role", { required: true })}
                            error={!!errors.role}
                            helperText={errors.role && "Role is required"}
                        >
                            <MenuItem value="Admin">Admin</MenuItem>
                            <MenuItem value="User">User</MenuItem>
                        </TextField>
                        <TextField
                            label="Status"
                            select
                            fullWidth
                            margin="normal"
                            {...register("status", { required: true })}
                            error={!!errors.status}
                            helperText={errors.status && "Status is required"}
                        >
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Inactive">Inactive</MenuItem>
                        </TextField>
                        <TextField
                            label="Branch"
                            fullWidth
                            margin="normal"
                            {...register("branch", { required: true })}
                            error={!!errors.branch}
                            helperText={errors.branch && "Branch is required"}
                        />
                        <Button type="submit" variant="contained" color="primary">
                            Submit
                        </Button>
                    </form>
                </div>
            </Dialog>
        </div>
    );
};

export default Users;
