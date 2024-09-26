import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Dialog, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";

const Branches = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [open, setOpen] = useState(false);
    const [branches, setBranches] = useState([
        { id: 1, code: "001", name: "Central Branch", status: "Active" },
        { id: 2, code: "002", name: "North Branch", status: "Inactive" },
        { id: 3, code: "003", name: "South Branch", status: "Active" },
        { id: 4, code: "004", name: "East Branch", status: "Inactive" },
        { id: 5, code: "005", name: "West Branch", status: "Active" },
        { id: 11, code: "001", name: "Central Branch", status: "Active" },
        { id: 12, code: "002", name: "North Branch", status: "Inactive" },
        { id: 13, code: "003", name: "South Branch", status: "Active" },
        { id: 14, code: "004", name: "East Branch", status: "Inactive" },
        { id: 15, code: "005", name: "West Branch", status: "Active" },
    ]);

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const onSubmit = (formData) => {
        setBranches([...branches, { id: branches.length + 1, ...formData }]);
        handleClose();
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'code', headerName: 'Code', width: 100 },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'status', headerName: 'Status', width: 130 },
    ];

    const getBranches = async () => {
        const url = backendUrl + "/getAllBranches"
        const res = await axios.post(url);
        console.log(res.data);
    }
    useEffect(() => {
        getBranches();
    }, [])
    return (
        <div className="cardDesign" style={{ marginTop: '5px', margin: "5px" }}>
            <Stack alignItems="flex-end" my={1}>
                <Button variant="contained" onClick={handleOpen} sx={{ width: "200px" }} color="primary">
                    Create New Branch
                </Button>
            </Stack>
            <div style={{ width: '100%' }}>
                <DataGrid rows={branches} columns={columns} pageSize={5} />
            </div>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <div style={{ padding: 20 }}>
                    <Typography variant="h5">Create Branch</Typography>
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
                        <Button type="submit" variant="contained" color="primary">
                            Submit
                        </Button>
                    </form>
                </div>
            </Dialog>
        </div>
    );
};

export default Branches;
