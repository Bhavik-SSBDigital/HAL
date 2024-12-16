import { Button, Card, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { IconX } from "@tabler/icons-react";
import axios from "axios";
import ReactEcharts from "echarts-for-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";


const ChartFive = ({ data, loading }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const token = sessionStorage.getItem('accessToken');
    const username = sessionStorage.getItem('username');

    // process list
    const [processList, setProcessList] = useState([]);
    const [open, setOpen] = useState(false);
    const clickEvent = (params) => {
        console.log(params);
        setProcessList(params.data.processes || [])
        setOpen(true);
    }
    const handleChartClick = {
        click: clickEvent,
    }
    const handleClose = () => {
        setOpen(false);
    }
    // files list
    const [fileListOpen, setFileListOpen] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [fileListLoading, setFileListLoading] = useState(false);
    const getProcessFileNames = async (processName) => {
        setFileListLoading(true);
        setFileListOpen(true);
        const url = backendUrl + '/getDocNamesInProcess';
        try {
            const res = await axios.post(
                url,
                { processName },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            setFileList(res.data.files || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message);
        } finally {
            setFileListLoading(false);
        }
    };

    const navigate = useNavigate();
    const handleView = (process) => {
        const { actorUser, processId, workFlowToBeFollowed } = process;
        if (actorUser === username) {
            navigate(`/processes/work/view?data=${encodeURIComponent(processId)}&workflow=${encodeURIComponent(workFlowToBeFollowed?._id)}`);
        }
        else {
            toast.info('Process hasnt reached your step yet.')
        }
    }
    return (
        <>
            <Card sx={{ height: '450px', p: 2 }}>
                {!loading ? (
                    <ReactEcharts
                        showLoading={loading}
                        option={data}
                        notMerge={true}
                        onEvents={handleChartClick}
                        lazyUpdate={true}
                        style={{ height: "100%", width: "100%" }}
                    />
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            height: '100%',
                            width: '100%',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <h3>loading....</h3>
                    </div>
                )}
            </Card>
            <Dialog open={open} onClose={handleClose} sx={{ "& .MuiPaper-root": { maxWidth: "600px", width: "100%" }, zIndex: 99999 }}>
                <DialogTitle fontWeight={700} sx={{ background: 'var(--themeColor)', color: 'white' }}>
                    Processes List
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{ position: 'absolute', right: 8, top: 8, '&:hover': { transform: "rotate(90deg)", transition: '1s ease' } }}
                    >
                        <IconX color="white" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ width: "100%" }}>
                    <TableContainer sx={{ maxHeight: "350px", width: "100%", border: "1px solid lightgray", borderRadius: "7px" }}>
                        <Table sx={{ width: "100%" }}>
                            <TableHead sx={{ position: "sticky", top: "0px", background: 'white !important', zIndex: 2 }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: '600 !important' }}>Process Name</TableCell>
                                    <TableCell sx={{ fontWeight: '600 !important' }}>Actor User</TableCell>
                                    <TableCell sx={{ fontWeight: '600 !important' }}>View Files</TableCell>
                                    <TableCell sx={{ fontWeight: '600 !important' }}>View Process</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {processList.map((process, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{process?.name}</TableCell>
                                        <TableCell>{process?.actorUser}</TableCell>
                                        <TableCell><Button sx={{ zIndex: 1 }} onClick={() => getProcessFileNames(process?.name)}>View</Button></TableCell>
                                        <TableCell><Button sx={{ zIndex: 1 }} onClick={() => handleView(process)}>View</Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>
            <Dialog
                open={fileListOpen}
                sx={{ "& .MuiPaper-root": { maxWidth: "600px", width: "100%" }, backdropFilter: "blur(4px)", zIndex: 999999 }} onClose={() => (fileListLoading ? null : setFileListOpen(false))}
            >
                <DialogTitle
                    fontWeight={700}
                    sx={{ background: 'var(--themeColor)', color: 'white' }}
                >
                    Files List
                    <IconButton
                        aria-label="close"
                        onClick={() => (fileListLoading ? null : setFileListOpen(false))}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            '&:hover': {
                                transform: 'rotate(90deg)',
                                transition: '1s ease',
                            },
                        }}
                    >
                        <IconX color="white" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ width: '100%' }}>
                    {fileListLoading ? (
                        <div
                            style={{
                                height: '100%',
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <CircularProgress size={30} />
                        </div>
                    ) : (
                        <TableContainer
                            sx={{
                                maxHeight: '350px',
                                width: '100%',
                                border: '1px solid lightgray',
                                borderRadius: '7px',
                            }}
                        >
                            <Table sx={{ width: '100%' }}>
                                <TableHead
                                    sx={{ position: 'sticky', top: '0px', background: 'white' }}
                                >
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '16px' }}>
                                            SR_NO
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '16px' }}>
                                            File
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                {fileList?.length ? (
                                    fileList.map((file, index) => (
                                        <TableRow>
                                            <React.Fragment key={index}>
                                                <TableCell>{index}</TableCell>
                                                <TableCell>{file}</TableCell>
                                            </React.Fragment>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2}>No files available</TableCell>
                                    </TableRow>
                                )}
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
export default ChartFive;
