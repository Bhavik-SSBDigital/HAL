import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Chip,
    Stack,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Divider
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideocamIcon from '@mui/icons-material/Videocam';
import MicIcon from '@mui/icons-material/Mic';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

const MeetingDetailsDialog = ({ open, onClose, id }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const token = sessionStorage.getItem('accessToken')
    // const meetingDetails = {
    //     _id: "67208e40042cd4e4fe28df5b",
    //     meetingId: "45dc3c42-6204-4641-a13e-437fd2c15f36",
    //     startTime: "2024-10-29T07:26:00.000Z",
    //     endTime: "2024-10-29T08:26:00.000Z",
    //     flexibleWithAttendees: true,
    //     title: "DMS",
    //     agenda: "Discuss quarterly performance metrics",
    //     createdBy: "EST_CLERK",
    //     attendees: ["admin", "EST_CLERK"],
    //     videoEnabled: true,
    //     audioEnabled: true,
    //     comments: [
    //         {
    //             commentor: "admin",
    //             timestamp: "2024-10-29T07:50:00.000Z",
    //             comment: "Looks good for the upcoming agenda."
    //         },
    //         {
    //             commentor: "EST_CLERK",
    //             timestamp: "2024-10-29T07:55:00.000Z",
    //             comment: "Please add details on Q3 performance."
    //         }
    //     ],
    //     logs: [
    //         {
    //             attendee: "admin",
    //             joinedAt: "2024-10-29T07:20:00.000Z",
    //             leftAt: "2024-10-29T08:00:00.000Z"
    //         },
    //         {
    //             attendee: "EST_CLERK",
    //             joinedAt: "2024-10-29T07:25:00.000Z",
    //             leftAt: null // indicates still in meeting
    //         }
    //     ]
    // };
    const [meetingDetails, setMeetingDetails] = useState({})
    const formatDateTime = (dateString) => new Date(dateString).toLocaleString();

    const getDetails = async () => {
        const url = backendUrl + `/getMeetingDetails/${id}`
        try {
            const res = await axios({
                method: "get",
                url: url,
                headers: { Authorization: `Bearer ${token}` }
            })
            setMeetingDetails(res.data.meetingDetails || {})
        } catch (error) {
            console.log(error?.response?.data?.message || error?.message);
        }
    }
    useEffect(() => {
        setMeetingDetails({})
        if (id) {
            getDetails();
        }
    }, [id])
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {meetingDetails?.title}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ p: 1 }}>
                    <Stack flexDirection={"row"} flexWrap={"wrap"} gap={1} justifyContent="space-between" mb={3}>

                        <Box>
                            <Typography variant="subtitle1" color="textSecondary">Agenda</Typography>
                            <Typography variant="body2" sx={{ mb: 4 }}>{meetingDetails?.agenda}</Typography>
                        </Box>
                        <Box>

                            <Typography variant="subtitle1" color="textSecondary">Meeting Time</Typography>
                            <Typography variant="body2" sx={{ mb: 4 }}>
                                <AccessTimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                {formatDateTime(meetingDetails?.startTime)} - {formatDateTime(meetingDetails?.endTime)}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="subtitle1" color="textSecondary">Created By</Typography>
                            <Typography variant="body2" sx={{ mb: 4 }}>{meetingDetails?.createdBy}</Typography>
                        </Box>
                    </Stack>

                    <Typography variant="h6" gutterBottom>Attendees :</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2, p: 2, bgcolor: '#EEEEEE' }}>
                        {meetingDetails?.attendees?.map((attendee) => (
                            <Chip key={attendee} label={attendee} color="primary" />
                        ))}
                    </Stack>

                    <Typography variant="h6" gutterBottom>Logs :</Typography>
                    <List dense sx={{ bgcolor: '#EEEEEE', mb: 2, p: '2px' }}>
                        {meetingDetails?.logs?.length > 0 ? (
                            meetingDetails?.logs.map((log, index) => (
                                <ListItem key={index}>
                                    <ListItemText
                                        primary={`${log.attendee} joined at ${formatDateTime(log.joinedAt)}`}
                                        secondary={log.leftAt ? `Left at ${formatDateTime(log.leftAt)}` : 'Currently in meeting'}
                                    />
                                </ListItem>
                            ))
                        ) : (
                            <Typography color="textSecondary" variant="body2">No logs available.</Typography>
                        )}
                    </List>

                    <Typography variant="h6" gutterBottom>Comments :</Typography>
                    <List dense sx={{ bgcolor: '#EEEEEE', p: '3px' }}>
                        {meetingDetails?.comments?.length > 0 ? (
                            meetingDetails?.comments.map((comment, index) => (
                                <ListItem key={index} alignItems="flex-start">
                                    <Avatar>{comment.commentor[0]}</Avatar>
                                    <Box sx={{ ml: 2 }}>
                                        <Typography variant="subtitle2" color="textSecondary">
                                            {comment.commentor} - {formatDateTime(comment.timestamp)}
                                        </Typography>
                                        <Typography variant="body2">{comment.comment}</Typography>
                                    </Box>
                                </ListItem>
                            ))
                        ) : (
                            <Typography color="textSecondary" variant="body2">No comments yet.</Typography>
                        )}
                    </List>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default MeetingDetailsDialog;