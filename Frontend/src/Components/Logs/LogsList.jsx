import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { Button, Chip, Typography } from "@mui/material";
import ViewLog from "./ViewLog";
import { IconEye } from "@tabler/icons-react";

const LogsList = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [logsData, setLogsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewId, setViewId] = useState(null)

    const url = backendUrl + "/getUserLogs";

    const fetchLogs = async () => {
        try {
            const res = await axios.post(
                url,
                {
                    startingIndex: 0,
                    pageSize: 10,
                    forPublishedProcesses: false,
                },
                {
                    headers: {
                        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmY1MzZkY2MzOTBlNmUyYTg5M2Q4YjEiLCJ1c2VybmFtZSI6IlRlc3QiLCJicmFuY2giOiI2NmRmZjYwNzEyMjE4NTc0ZDhkZDAzY2MiLCJyb2xlIjoiNjZkZmY2NDExMjIxODU3NGQ4ZGQwM2U3IiwiZW1haWwiOiJ2aXJhamthbGFyaWEwNUBnbWFpbC5jb20iLCJwYXNzd29yZCI6IiQyYiQxMCR0RWd5ZGxVREhHWVZwZDA0ZWwzQVNPYjBJZURPQ3Q1UTFRb24vUTR1bHVDNHlTTGIxWjRMLiIsInNwZWNpYWxVc2VyIjpmYWxzZSwiaXNLZWVwZXJPZlBoeXNpY2FsRG9jcyI6ZmFsc2UsImlhdCI6MTcyNzY5MDgxNCwiZXhwIjoxNzU5MjI2ODE0fQ.zl4N99v8an9er7FdOSztZ_chnvLNgcsQrdorYehUw84`,
                    },
                }
            );
            setLoading(false);
            setLogsData(res.data.worksDone);
        } catch (error) {
            console.log(error.message);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);
    const handleView = (row) => {
        setViewId(row._id);
    };
    // Columns for the DataGrid
    const columns = [
        {
            field: "processName",
            headerName: "Process Name",
            width: 200,
        },
        {
            field: "reverted",
            headerName: "Reverted",
            width: 170,
            renderCell: (params) => {
                return (
                    <Chip
                        label={params.value ? "REVERTED" : "NOT-REVERTED"}
                        sx={{ width: "fit-content" }}
                        color={params.value ? "error" : "success"} // Changed 'Yes' to 'No' logic for reverted flag
                    />
                );
            },
        },
        {
            field: "time",
            headerName: "Date",
            width: 200,
            valueGetter: (value) => new Date(value).toLocaleString(), // Format date to a readable string
        },
        {
            field: "currentStep.work",
            headerName: "Work",
            width: 100,
            renderCell: (params) => {
                return (
                    <span>
                        {params.row.currentStep?.work ? params.row.currentStep.work : ""}
                    </span>
                );
            },
        },
        {
            field: "currentStep.role",
            headerName: "Role",
            width: 150,
            renderCell: (params) => {
                return (
                    <span>{params.row.currentStep?.role ? params.row.currentStep.role : ""}</span>
                );
            },
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 180,
            renderCell: (params) => (
                <div>
                    <Button
                        // variant="contained"
                        color="primary"
                        onClick={() => handleView(params.row)}
                        startIcon={<IconEye />}
                    >
                        View
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="cardDesign" style={{ margin: "5px" }}>
            {viewId ? <ViewLog setViewId={setViewId} id={viewId} /> : <>
                <Typography variant="h6" ml={1} my={1}>
                    Logs List
                </Typography>
                <DataGrid
                    rows={logsData}
                    columns={columns}
                    pageSize={10}
                    loading={loading}
                    getRowId={(row) => row._id}
                    disableSelectionOnClick
                />
            </>}
        </div>
    );
};

export default LogsList;
