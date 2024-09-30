import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { Button, Chip, Typography } from "@mui/material";

const ProcessList = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [processData, setProcessData] = useState([]);
    const [loading, setLoading] = useState(true);

    const url = backendUrl + '/getProcessesForUser';

    const fetchProcesses = async () => {
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
                        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmY1Mzc0NmMzOTBlNmUyYTg5M2Q4Y2YiLCJ1c2VybmFtZSI6ImNoZWNraW5nIiwiYnJhbmNoIjoiNjZkZmY2MDcxMjIxODU3NGQ4ZGQwM2NjIiwicm9sZSI6IjY2ZGZmNmNiMTIyMTg1NzRkOGRkMDQyYiIsImVtYWlsIjoidmlyYWprYWxhcmlhMDVAZ21haWwuY29tIiwicGFzc3dvcmQiOiIkMmIkMTAkV1dpNkJST0ZFL2dzeXpsVDlVdXdaT09Ha0MwUnJjTkIyQmFjNS9CYld5WGxQNllWOEhpelMiLCJzcGVjaWFsVXNlciI6ZmFsc2UsImlzS2VlcGVyT2ZQaHlzaWNhbERvY3MiOmZhbHNlLCJpYXQiOjE3Mjc2ODcwNDcsImV4cCI6MTc1OTIyMzA0N30.ADdFRmhUAW8VvWRNqbqVCIqU1JVGp_MQhMsf_4UYye4`,
                    },
                },
            );
            setLoading(false)
            setProcessData(res.data.processes)
        } catch (error) {
            console.log(error.message);
        }
    };
    useEffect(() => {
        fetchProcesses();
    }, []);
    const getWorkName = (filenames) => {
        // Step 1: Extract the word after the first underscore
        const extractedWords = filenames.map(filename => {
            const parts = filename.split('_');
            return parts[1]; // Get the word after the first underscore
        });

        // Step 2: Filter unique names using a Set
        const uniqueNames = [...new Set(extractedWords)];

        return uniqueNames;
    };
    // Columns for the DataGrid
    const columns = [
        { field: "name", headerName: "Process Name", width: 200 },
        {
            field: "completed",
            headerName: "Completed",
            width: 150,
            renderCell: (params) => {
                return (
                    <Chip label={params.value ? 'Yes' : 'No'} sx={{ width: "80px" }} color={params.value ? "success" : "error"} />
                );
            },
        }
        ,
        {
            field: "createdAt",
            headerName: "Created At",
            width: 200,
            valueGetter: (value) => new Date(value).toLocaleString(), // Format date
        },
        {
            field: "files",
            headerName: "Files",
            width: 300,
            renderCell: (params) => {
                return (
                    <span>
                        {Array.isArray(params?.value) ? getWorkName(params.value).join(', ') : ''}
                    </span>
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
                        variant="contained"
                        color="primary"
                        onClick={() => handleEdit(params.row)}
                    >
                        View
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="cardDesign" style={{ margin: '5px' }}>
            <Typography variant="h6" ml={1} my={1}>Process List</Typography>
            <DataGrid
                rows={processData}
                columns={columns}
                pageSize={10}
                loading={loading}
                getRowId={(row) => row._id}
                disableSelectionOnClick
            // checkboxSelection
            />
        </div>
    );
};

export default ProcessList;
