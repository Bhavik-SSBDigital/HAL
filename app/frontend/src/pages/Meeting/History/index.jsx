import React, { useEffect, useState } from 'react';
import styles from './Schedule.module.css';
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import {
    IconCalendarPlus,
    IconClockHour5,
    IconSquareRoundedX,
    IconUser,
    IconUserCircle,
} from '@tabler/icons-react';
import Schedule from '../Schedule';
import axios from 'axios';

export default function History({ joinMeet }) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const token = sessionStorage.getItem('accessToken');
    const [meetings, setMeetings] = useState([]);
    // const meetings = [
    //     {
    //         date: 'Dec 24',
    //         day: 'Thursday',
    //         scheduledMeetings: [
    //             { name: 'User Management', host: 'Viraj', time: '10:00 AM' },
    //         ],
    //     },
    //     {
    //         date: 'Dec 25',
    //         day: 'Friday',
    //         scheduledMeetings: [
    //             { name: 'Project Kickoff', host: 'Alice', time: '9:00 AM' },
    //             { name: 'Budget Review', host: 'Bob', time: '2:00 PM' },
    //         ],
    //     },
    //     {
    //         date: 'Dec 26',
    //         day: 'Saturday',
    //         scheduledMeetings: [
    //             { name: 'Team Building', host: 'Emily', time: '11:00 AM' },
    //         ],
    //     },
    //     {
    //         date: 'Dec 27',
    //         day: 'Sunday',
    //         scheduledMeetings: [
    //             { name: 'Client Follow-Up', host: 'David', time: '1:00 PM' },
    //             { name: 'Sprint Retrospective', host: 'Sarah', time: '3:30 PM' },
    //         ],
    //     },
    //     {
    //         date: 'Dec 28',
    //         day: 'Monday',
    //         scheduledMeetings: [
    //             { name: 'Sales Strategy', host: 'John', time: '10:30 AM' },
    //             { name: 'Marketing Plan', host: 'Sasa', time: '4:00 PM' },
    //         ],
    //     },
    //     {
    //         date: 'Dec 29',
    //         day: 'Tuesday',
    //         scheduledMeetings: [
    //             { name: 'Tech Review', host: 'Mike', time: '1:00 PM' },
    //         ],
    //     },
    // ];

    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const randomColor = (name) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash += name.charCodeAt(i);
        }

        const hue = hash % 360;
        const saturation = 70;
        const lightness = 50;

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const getHistory = async () => {
        try {
            const url = backendUrl + "/getMeetingsForUser"
            const res = await axios({
                method: "get",
                url: url,
                headers: { Authorization: `Bearer ${token}` }
            })
            setMeetings(res.data.meetings || [])
        } catch (error) {
            console.log(error?.response?.data?.message || error?.message);
        }
    }
    useEffect(() => {
        getHistory();
    }, [])
    return (
        <>
            <div className={styles.container}>
                <Stack alignItems="flex-end">
                    <Button
                        startIcon={<IconCalendarPlus />}
                        onClick={handleOpen}
                        variant="contained"
                        sx={{ width: 220 }}
                    >
                        Schedule Meeting
                    </Button>
                </Stack>
                {meetings.length ? meetings.map((meeting) => {
                    return (
                        <div className={styles.meetingContainer}>
                            <div className={styles.dateContainer}>
                                <Typography variant="h6" fontWeight={600}>
                                    {meeting.date}
                                </Typography>
                                <Typography>{meeting.day}</Typography>
                            </div>
                            <div className={styles.meetingCardContainer}>
                                {meeting.scheduledMeetings.map((item) => (
                                    <div className={styles.meetingCard}>
                                        <div
                                            className={styles.highlight}
                                            style={{ backgroundColor: randomColor(item.name) }}
                                        ></div>
                                        <div className={styles.detailsContainer}>
                                            <Typography variant="h5">{item.name}</Typography>
                                            <div className={styles.details}>
                                                <Typography variant="subtitle1" className={styles.info}>
                                                    {/* <IconUserCircle size={21} /> */}
                                                    <strong>Host :</strong>
                                                    {item.host}
                                                </Typography>
                                                <Typography variant="subtitle1" className={styles.info}>
                                                    {/* <IconClockHour5 size={21} />
                                                     */}
                                                    <strong>Time :</strong>
                                                    {item.time}
                                                </Typography>
                                                <Typography variant="subtitle1" className={styles.info}>
                                                    {/* <IconClockHour5 size={21} /> */}
                                                    <strong>Duration :</strong>
                                                    {item.duration}
                                                </Typography>
                                            </div>
                                            <Typography className={styles.info}><strong>Description :</strong>{item.agenda}</Typography>
                                        </div>
                                        <div>
                                            <Button onClick={() => joinMeet(item.meetingId)}>JOIN</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }) : <div className={styles.noHistory}>
                    <Typography variant='h6'>No scheduled meetings</Typography>
                </div>}
            </div>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>
                    Schedule Meeting
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        style={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <IconSquareRoundedX />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Schedule handleClose={handleClose} />
                </DialogContent>
            </Dialog>
        </>
    );
}
