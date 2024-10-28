import React from 'react';
import styles from './Schedule.module.css';
import { Typography } from '@mui/material';
import { IconClockHour5, IconUser, IconUserCircle } from '@tabler/icons-react';

export default function Schedule() {
    const meetings = [
        {
            date: 'Dec 24',
            day: 'Thursday',
            scheduledMeetings: [
                { name: 'User Management', host: 'Viraj', time: '10:00 AM' },
            ],
        },
        {
            date: 'Dec 25',
            day: 'Friday',
            scheduledMeetings: [
                { name: 'Project Kickoff', host: 'Alice', time: '9:00 AM' },
                { name: 'Budget Review', host: 'Bob', time: '2:00 PM' },
            ],
        },
        {
            date: 'Dec 26',
            day: 'Saturday',
            scheduledMeetings: [
                { name: 'Team Building', host: 'Emily', time: '11:00 AM' },
            ],
        },
        {
            date: 'Dec 27',
            day: 'Sunday',
            scheduledMeetings: [
                { name: 'Client Follow-Up', host: 'David', time: '1:00 PM' },
                { name: 'Sprint Retrospective', host: 'Sarah', time: '3:30 PM' },
            ],
        },
        {
            date: 'Dec 28',
            day: 'Monday',
            scheduledMeetings: [
                { name: 'Sales Strategy', host: 'John', time: '10:30 AM' },
                { name: 'Marketing Plan', host: 'Laura', time: '4:00 PM' },
            ],
        },
        {
            date: 'Dec 29',
            day: 'Tuesday',
            scheduledMeetings: [
                { name: 'Tech Review', host: 'Mike', time: '1:00 PM' },
            ],
        },
    ];
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

    return (
        <div className={styles.container}>
            {meetings.map((meeting) => {
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
                                        <Typography variant='h6'>{item.name}</Typography>
                                        <div className={styles.details}>
                                            <Typography variant="subtitle1" className={styles.info}><IconUserCircle size={21} />{item.host}</Typography>
                                            <Typography variant="subtitle1" className={styles.info}><IconClockHour5 size={21} />{item.time}</Typography>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
