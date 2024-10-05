import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { Button, Chip, Typography } from "@mui/material";
import ViewLog from "./ViewLog";
import { IconEye } from "@tabler/icons-react";

const LogsList = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const token = sessionStorage.getItem('accessToken')
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
                        Authorization: `Bearer ${token}`,
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
            flex: 1
        },
        {
            field: "reverted",
            headerName: "Reverted",
            width: 170,
            flex: 1,
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
            flex: 1,
            valueGetter: (value) => new Date(value).toLocaleString(), // Format date to a readable string
        },
        {
            field: "currentStep.work",
            headerName: "Work",
            width: 100,
            flex: 1,
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
            flex: 1,
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
            flex: 1,
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
