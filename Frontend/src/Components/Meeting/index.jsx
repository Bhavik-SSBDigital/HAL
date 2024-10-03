import React, { useEffect } from 'react';
import { MeetingProvider, useMeetingManager } from 'amazon-chime-sdk-component-library-react';
import { Button, Typography, Container } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';

const MeetingComponent = () => {
    const meetingManager = useMeetingManager();

    const startMeeting = async () => {
        const meetingResponse = await meetingManager.startMeeting({
            meetingId: uuidv4(), // Generate a unique meeting ID
            externalMeetingId: uuidv4(), // Generate an external meeting ID
            clientRequestToken: uuidv4(), // Generate a unique client request token
        });

        console.log('Meeting started:', meetingResponse);
    };

    const endMeeting = async () => {
        await meetingManager.endMeeting();
        console.log('Meeting ended');
    };

    useEffect(() => {
        // Handle any additional effects here, such as updating UI or state
    }, []);

    return (
        <Container>
            <Typography variant="h4" gutterBottom>
                Meeting Management
            </Typography>
            <Button variant="contained" color="primary" onClick={startMeeting}>
                Start Meeting
            </Button>
            <Button variant="contained" color="secondary" onClick={endMeeting}>
                End Meeting
            </Button>
        </Container>
    );
};

const MeetingManager = () => {
    return (
        <MeetingProvider>
            <MeetingComponent />
        </MeetingProvider>
    );
};

export default MeetingManager;
