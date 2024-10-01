import React, { useEffect, useState } from "react";
import styles from "./ViewLog.module.css";
import {
    Typography,
    Table,
    TableContainer,
    TableBody,
    TableRow,
    TableCell,
    Stack,
    Box,
    CircularProgress,
    IconButton,
    Menu,
    MenuItem,
    Button,
    MenuList,
    Tooltip,
    Dialog,
    DialogTitle,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import moment from "moment";
import axios from "axios";
import { IconArrowLeft, IconBan, IconDownload, IconEye, IconSquareRoundedX } from "@tabler/icons-react";
import { download } from "../Common/drop-file-input/FileUploadDownload";
import { toast } from "react-toastify";
import FileIcon from "../Common/FileIcon";

export default function ViewLog({ id, setViewId }) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [Data, setData] = useState();
    const [loading, setLoading] = useState(true);
    const [itemName, setItemName] = useState("");
    const [anchorEl1, setAnchorEl1] = useState(null);
    const [anchorEl2, setAnchorEl2] = useState(null);
    const [fileView, setFileView] = useState();

    const getFilePath = (path) => {
        const x_file_path = ".." + path.substring(19);

        // Finding the index of the last occurrence of '/'
        const lastIndex = x_file_path.lastIndexOf("/");

        // Extracting the substring before the last '/'
        const result =
            lastIndex !== -1 ? x_file_path.substring(0, lastIndex) : x_file_path;

        return result; // Output: ../EST
    };
    const handleClose = () => {
        setAnchorEl1(null);
    };
    const [filePath, setFilePath] = useState();
    const [signedBy, setSignedBy] = useState([]);
    const handleClick1 = (event, name, path, sign) => {
        setItemName(name);
        setAnchorEl1(event.currentTarget);
        setFilePath(path);
        setSignedBy(sign);
    };
    const handleCloseSignedBymenu = () => {
        setAnchorEl2(null);
    };
    const handleOpenSignedByMenu = (e) => {
        setAnchorEl2(e.currentTarget);
    };
    const handleView = async (path, name) => {
        setLoading(true);
        try {
            const filePath = getFilePath(path);
            const fileData = await download(name, filePath, true);
            if (fileData) {
                setFileView({ url: fileData.data, type: fileData.fileType });
                setLoading(false);
            } else {
                console.error("Invalid fileData:", fileData);
                alert("Invalid file data.");
                setLoading(false);
            }
        } catch (error) {
            console.error("Error viewing file:", error);
            alert("Unable to view the file.");
            setLoading(false);
        }
        handleClose();
    };
    const handleViewClose = () => {
        setFileView(null);
    };
    const handleDownload = (path, name) => {
        const filePath = getFilePath(path);
        try {
            download(name, filePath);
        } catch (error) {
            console.error("Error downloading file:", error);
            toast.error("download error");
        }
        handleClose();
    };
    const truncateFileName = (fname, maxLength = 25) => {
        if (fname.length <= maxLength) {
            return fname;
        } else {
            const [baseName, extension] = fname.split(".").reduce(
                (result, part, index, array) => {
                    if (index === array.length - 1) {
                        result[1] = part;
                    } else {
                        result[0] += part;
                    }
                    return result;
                },
                ["", ""]
            );
            const truncatedName = `${baseName.slice(0, 15)}...${baseName.slice(-2)}`;
            return `${truncatedName}.${extension}`;
        }
    };
    useEffect(() => {
        const fetchLogDetails = async () => {
            const url = backendUrl + `/getUserLog/${id}`;
            const res = await axios.post(url, null, {
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
                },
            });
            if (res.status === 200) {
                setData(res.data.log);
            }
            setLoading(false);
        };
        fetchLogDetails();
    }, []);
    const navigate = useNavigate();
    const redirectToTimeline = (processName) => {
        const url = `/dashboard/timeLine?data=${processName}`;
        navigate(url);
    };

    const [rejectMenuOpen, setRejectMenuOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const handleOpenRejectMenu = (reason) => {
        console.log(reason);
        setRejectMenuOpen(true);
        setRejectReason(reason)
    }
    return (
        <>
            <Button onClick={() => setViewId(null)} startIcon={<IconArrowLeft />}>Logs</Button>

            <Stack flexDirection="row">
                <div
                    style={{
                        width: "100%",
                    }}
                >
                    {Data && (
                        <Box>
                            <TableContainer sx={{ border: "1px solid #ebe3e3" }}>
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>
                                                <Typography variant="subtitle1">
                                                    <b>Process Name:</b>
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{Data.processName}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>
                                                <Typography variant="subtitle1">
                                                    <b>Time:</b>
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {moment(Data.time).format("DD-MM-YYYY, h:mm:ss a")}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>
                                                <Typography variant="subtitle1">
                                                    <b>Reverted:</b>
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{Data.reverted ? "Yes" : "No"}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>
                                                <Typography variant="subtitle1">
                                                    <b>Your Details</b>
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <b>Work:</b> {Data?.currentStep?.work}
                                                <br /> <b>User:</b> {Data?.currentStep?.user}
                                                <br />
                                                <b>Role:</b> {Data?.currentStep?.role}
                                                <br />
                                                <b> Step Number:</b> {Data?.currentStep?.step}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>
                                                <Typography variant="subtitle1">
                                                    <b>Next Step:</b>
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {Data?.nextStep?.work == "N/A" ? <Typography fontSize={14}>NO NEXT STEP</Typography> : <div>
                                                    <b>Work:</b> {Data?.nextStep?.work} <br />
                                                    <b>Users and Roles:</b>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                        {Data?.nextStep?.users.map((user, index) => (
                                                            <div key={index} style={{ marginRight: '20px', marginBottom: '10px' }}>
                                                                (<b>{user.user}:</b> {user.role})
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <b>Step Number:</b> {Data?.nextStep?.step ? Data?.nextStep.step : "NO NEXT STEP"}
                                                </div>}

                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={2} align="center">
                                                <h3
                                                    style={{ color: Data.reverted ? "red" : "forestgreen" }}
                                                >
                                                    {Data.reverted
                                                        ? "You have reverted the process"
                                                        : Data.nextStep.work !== "N/A"
                                                            ? `You have forwarded process to next step for ${Data?.nextStep?.work}`
                                                            : <Typography fontSize={17} fontWeight={600}>Process is completed / ended</Typography>}
                                                </h3>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Display Uploaded Documents */}
                            <Typography variant="subtitle1" sx={{ marginX: "10px", fontWeight: 700, mt: 2, background: "#96C9F4", color: "white", p: 1, borderRadius: "8px" }}>
                                Uploaded Documents :
                            </Typography>
                            <Box sx={{ width: "99%", overflow: "auto" }}>
                                <Stack
                                    flexDirection="row"
                                    gap={1}
                                    flexWrap="wrap"
                                    justifyContent="center"
                                >
                                    {Data?.documents.map((file) => (
                                        file.isUploaded ? (
                                            <Box sx={{ padding: "10px" }} key={file?.details?._id}>
                                                <Stack
                                                    sx={{
                                                        minHeight: "200px",
                                                        width: "250px",
                                                        borderRadius: "15px",
                                                        flex: "1 1 auto",
                                                        margin: "10px",
                                                        backgroundColor: "white",
                                                        boxShadow:
                                                            "2px 2px 6px -1px rgba(0,0,0,0.2), 0px 0px 8px 0px rgba(0,0,0,-0.86), 0px 0px 6px 3px rgba(1,1,2,0.12)",
                                                    }}
                                                >
                                                    <div className={styles.filePartOne}>
                                                        <div className={styles.fileHeading}>
                                                            <IconButton
                                                                onClick={(e) =>
                                                                    handleClick1(
                                                                        e,
                                                                        file?.details?.name,
                                                                        file?.details.path
                                                                    )
                                                                }
                                                            >
                                                                <MoreVertIcon />
                                                            </IconButton>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className={styles.iconContainer}>
                                                            <FileIcon name={file.details.name} size2={60} />
                                                        </div>
                                                        <div className={styles.fileNameContainer}>
                                                            <Tooltip title={file.details.name} enterDelay={900}>
                                                                <h4>
                                                                    {file?.details?.name.length <= 20
                                                                        ? file.details.name
                                                                        : truncateFileName(file.details.name)}
                                                                </h4>
                                                            </Tooltip>
                                                        </div>
                                                        <div className={styles.fileTimeContainer}>
                                                            <p>
                                                                -{" "}
                                                                {moment(file?.details?.createdOn).format(
                                                                    "DD-MMM-YYYY hh:mm A"
                                                                )}
                                                            </p>
                                                        </div>
                                                        {/* Optional: Display rejection reason or additional details */}
                                                    </div>
                                                </Stack>
                                            </Box>
                                        ) : null
                                    ))}
                                    {/* Display message if no rejected documents */}
                                    {Data?.documents.filter(file => file.isUploaded).length === 0 && (
                                        <Typography sx={{ fontWeight: 700, mt: 1 }}>No Documents Uploaded</Typography>
                                    )}
                                </Stack>
                            </Box>
                            {/* Display Singed Documents */}
                            <Typography variant="subtitle1" sx={{ marginX: "10px", fontWeight: 700, mt: 2, p: 1, color: 'white', borderRadius: '8px', background: "#A1DD70" }}>
                                Signed Documents :
                            </Typography>
                            <Box sx={{ width: "99%", overflow: "auto" }}>
                                <Stack
                                    flexDirection="row"
                                    gap={1}
                                    flexWrap="wrap"
                                    justifyContent="center"
                                >
                                    {Data?.documents.map((file) => (
                                        file?.isSigned ? (
                                            <Box sx={{ padding: "10px" }} key={file?.details?._id}>
                                                <Stack
                                                    sx={{
                                                        minHeight: "200px",
                                                        width: "250px",
                                                        borderRadius: "15px",
                                                        flex: "1 1 auto",
                                                        margin: "10px",
                                                        backgroundColor: "white",
                                                        boxShadow:
                                                            "2px 2px 6px -1px rgba(0,0,0,0.2), 0px 0px 8px 0px rgba(0,0,0,-0.86), 0px 0px 6px 3px rgba(1,1,2,0.12)",
                                                    }}
                                                >
                                                    <div className={styles.filePartOne}>
                                                        <div className={styles.fileHeading}>
                                                            <h5
                                                                style={{
                                                                    height: "100%",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                }}
                                                            >
                                                                <Button
                                                                    onClick={() => console.log("Signed button clicked")}
                                                                    style={{ color: "green", zIndex: "999" }}
                                                                >
                                                                    Signed
                                                                </Button>
                                                            </h5>

                                                            <IconButton
                                                                onClick={(e) =>
                                                                    handleClick1(
                                                                        e,
                                                                        file?.details?.name,
                                                                        file?.details.path
                                                                    )
                                                                }
                                                            >
                                                                <MoreVertIcon />
                                                            </IconButton>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className={styles.iconContainer}>
                                                            <FileIcon name={file.details.name} size2={60} />
                                                        </div>
                                                        <div className={styles.fileNameContainer}>
                                                            <Tooltip title={file.details.name} enterDelay={900}>
                                                                <h4>
                                                                    {file?.details?.name.length <= 20
                                                                        ? file.details.name
                                                                        : truncateFileName(file.details.name)}
                                                                </h4>
                                                            </Tooltip>
                                                        </div>
                                                        <div className={styles.fileTimeContainer}>
                                                            <p>
                                                                -{" "}
                                                                {moment(file?.details?.createdOn).format(
                                                                    "DD-MMM-YYYY hh:mm A"
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Stack>
                                            </Box>
                                        ) : null
                                    ))}
                                    {/* Display message if no signed documents */}
                                    {Data?.documents.filter(file => file?.isSigned).length === 0 && (
                                        <Typography sx={{ fontWeight: 700, mt: 1 }}>No Documents Signed</Typography>
                                    )}
                                </Stack>
                            </Box>

                            {/* Display Rejected Documents */}
                            <Typography variant="subtitle1" sx={{ marginX: "10px", fontWeight: 700, mt: 2, background: "#FF6969", color: "white", p: 1, borderRadius: "8px" }}>
                                Rejected Documents :
                            </Typography>
                            <Box sx={{ width: "99%", overflow: "auto" }}>
                                <Stack
                                    flexDirection="row"
                                    gap={1}
                                    flexWrap="wrap"
                                    justifyContent="center"
                                >
                                    {Data?.documents.map((file) => (
                                        file.isRejected ? (
                                            <Box sx={{ padding: "10px" }} key={file?.details?._id}>
                                                <Stack
                                                    sx={{
                                                        minHeight: "200px",
                                                        width: "250px",
                                                        borderRadius: "15px",
                                                        flex: "1 1 auto",
                                                        margin: "10px",
                                                        backgroundColor: "white",
                                                        boxShadow:
                                                            "2px 2px 6px -1px rgba(0,0,0,0.2), 0px 0px 8px 0px rgba(0,0,0,-0.86), 0px 0px 6px 3px rgba(1,1,2,0.12)",
                                                    }}
                                                >
                                                    <div className={styles.filePartOne}>
                                                        <div className={styles.fileHeading}>
                                                            <h5
                                                                style={{
                                                                    height: "100%",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                }}
                                                            >
                                                                <p className={styles.rejectButton} onClick={() => handleOpenRejectMenu(file?.reason)}>Reason</p>
                                                            </h5>

                                                            <IconButton
                                                                onClick={(e) =>
                                                                    handleClick1(
                                                                        e,
                                                                        file?.details?.name,
                                                                        file?.details.path
                                                                    )
                                                                }
                                                            >
                                                                <MoreVertIcon />
                                                            </IconButton>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className={styles.iconContainer}>
                                                            <FileIcon name={file.details.name} size2={60} />
                                                        </div>
                                                        <div className={styles.fileNameContainer}>
                                                            <Tooltip title={file.details.name} enterDelay={900}>
                                                                <h4>
                                                                    {file?.details?.name.length <= 20
                                                                        ? file.details.name
                                                                        : truncateFileName(file.details.name)}
                                                                </h4>
                                                            </Tooltip>
                                                        </div>
                                                        <div className={styles.fileTimeContainer}>
                                                            <p>
                                                                -{" "}
                                                                {moment(file?.details?.createdOn).format(
                                                                    "DD-MMM-YYYY hh:mm A"
                                                                )}
                                                            </p>
                                                        </div>
                                                        {/* Optional: Display rejection reason or additional details */}
                                                    </div>
                                                </Stack>
                                            </Box>
                                        ) : null
                                    ))}
                                    {/* Display message if no rejected documents */}
                                    {Data?.documents.filter(file => file.isRejected).length === 0 && (
                                        <Typography sx={{ fontWeight: 700, mt: 1 }}>No Documents Rejected</Typography>
                                    )}
                                </Stack>
                            </Box>
                            <Button variant="contained" sx={{ minWidth: 220, mx: "auto", display: "block", mt: 4 }} onClick={() => redirectToTimeline(Data?.processName)}>View Timeline</Button>
                        </Box>
                    )}
                    <Menu
                        anchorEl={anchorEl1}
                        open={Boolean(anchorEl1)}
                        onClose={handleClose}
                        PaperProps={{ elevation: 2 }}
                    >
                        <MenuItem
                            disabled={itemName?.split(".").pop().trim() === "zip"}
                            sx={{ gap: "5px" }}
                            onClick={() => {
                                handleView(filePath, itemName);
                                handleClose();
                            }}
                        >
                            <IconEye />
                            View
                        </MenuItem>
                        <MenuItem
                            disabled={itemName?.split(".").pop().trim() === "zip"}
                            sx={{ gap: "5px" }}
                            onClick={() => {
                                handleDownload(filePath, itemName);
                                handleClose();
                            }}
                        >
                            <IconDownload />
                            Download
                        </MenuItem>
                        {/* <hr /> */}
                    </Menu>
                    {loading && (
                        <div
                            style={{
                                // height: "100%",
                                // width: "100%",
                                // display: "flex",
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                            }}
                        >
                            <CircularProgress color="inherit" size={30} />
                        </div>
                    )}
                    {/* view file  */}
                    <div
                        className={`backdrop ${fileView ? "backdropOpen" : ""}`}
                        onClick={() => setFileView(null)}
                    ></div>

                    {/* Iframe container */}

                    {!!fileView && <>
                        <div className={styles.backDrop} onClick={() => setFileView(null)} />

                        <IconButton className={styles.closeBtn} sx={{ position: 'absolute', top: '60px', left: '10px', zIndex: 999 }} onClick={() => setFileView(null)}><IconSquareRoundedX color="red" /></IconButton>

                        <div className={styles.pdfIframe}>
                            <iframe
                                src={fileView?.url}
                                style={{ width: "100%", height: "100%", border: "none" }}
                            >
                            </iframe>
                        </div></>}
                </div>
                <Dialog
                    anchorEl={rejectMenuOpen}
                    open={Boolean(rejectMenuOpen)}
                    onClose={() => setRejectMenuOpen(false)}
                >
                    <DialogTitle sx={{ fontWeight: 700, background: "lightblue" }}>FILE REJECT REASON</DialogTitle>
                    <div
                        style={{
                            padding: "15px",
                            maxWidth: "300px",
                            maxHeight: "150px",
                            overflow: "auto",
                        }}
                    >
                        <strong>Reason:</strong> {rejectReason}
                    </div>
                </Dialog>
            </Stack>
        </>
    );
}
