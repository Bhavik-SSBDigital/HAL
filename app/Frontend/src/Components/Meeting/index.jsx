import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    IconButton,
    Button,
    Grid,
    Typography,
    Paper,
    Drawer,
    List,
    ListItem,
    ListItemText,
    TextField,
    Grid2,
} from '@mui/material';

import {
    IconLogout2,
    IconMessages,
    IconMicrophone,
    IconMicrophoneOff,
    IconPhone,
    IconPhoneFilled,
    IconSend2,
    IconShareplay,
    IconUsersGroup,
    IconVideo,
    IconVideoOff
} from '@tabler/icons-react'

const MeetingManager = () => {
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [participants, setParticipants] = useState(['You', 'Alice', 'Bob', 'Charlie']);

    const localVideoRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);

    // Request access to camera and microphone
    useEffect(() => {
        const getMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error('Error accessing media devices.', err);
                alert('Unable to access camera and microphone. Please check your permissions.');
            }
        };

        getMedia();

        // Cleanup on component unmount
        return () => {
            if (localStream) {
                localStream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Toggle microphone
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach((track) => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    // Toggle camera
    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach((track) => {
                track.enabled = isCameraOff;
            });
            setIsCameraOff(!isCameraOff);
        }
    };

    // Handle sending chat messages
    const sendMessage = () => {
        if (message.trim() !== '') {
            setChatMessages([...chatMessages, { sender: 'You', text: message }]);
            setMessage('');
            // TODO: Emit message to other participants via socket or other means
        }
    };

    // Share Screen Functionality (Optional)
    const shareScreen = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            // Replace the current video track with the screen stream
            const screenTrack = screenStream.getVideoTracks()[0];
            localStream.getVideoTracks()[0].replaceWith(screenTrack);
            screenTrack.onended = () => {
                // Revert back to camera when screen sharing ends
                navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
                    const videoTrack = stream.getVideoTracks()[0];
                    localStream.getVideoTracks()[0].replaceWith(videoTrack);
                });
            };
        } catch (err) {
            console.error('Error sharing screen:', err);
        }
    };
    return (
        <Box display="flex" position="relative">
            {/* Main Meeting Screen */}
            <Box
                sx={{
                    display: 'flex',
                    height: 'calc(100vh - 80px)', // Full viewport height
                    width: '100vw',  // Full viewport width
                }}
            >
                {/* Local Video */}
                <Paper
                    variant="outlined"
                    sx={{
                        flex: 1, // Allow this to take full space on the left
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{
                            objectFit: 'cover', // Maintain aspect ratio
                            width: '100%', // Full width of the Paper
                            height: '100%', // Full height of the Paper
                            backgroundColor: 'black',
                        }}
                    />
                    {/* Optional Loading/Error Messages */}
                    {/* {!isCameraOff && !localStream && (
                    <Typography variant="h6" align="center" sx={{ p: 2 }}>
                        Loading your video...
                    </Typography>
                )}
                {isCameraOff && (
                    <Typography variant="h6" align="center" sx={{ p: 2 }}>
                        Camera is off
                    </Typography>
                )} */}
                </Paper>

                {/* Participants' Videos */}
                <Grid2 container spacing={1} sx={{ width: '400px' }}> {/* Fixed width for the participants' section */}
                    {participants
                        .filter((participant) => participant !== 'You')
                        .map((participant, index) => (
                            <Grid2 item size={{ xs: 12 }} key={index}>
                                <Paper variant="outlined" sx={{ height: '100%', position: 'relative' }}>
                                    <Box
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        height="100%"
                                        bgcolor="#000"
                                        color="#fff"
                                    >
                                        <Typography variant="subtitle1">{participant}'s Video</Typography>
                                    </Box>
                                </Paper>
                            </Grid2>
                        ))}
                </Grid2>
            </Box>

            {/* Right Sidebar (Chat and Members) */}
            <Drawer
                variant="temporary"
                onClose={() => { setShowChat(null); setShowMembers(null) }}
                anchor="right"
                open={showChat || showMembers}
                sx={{
                    '& .MuiDrawer-paper': { width: 300 },
                }}
            >
                {showChat && (
                    <Box p={2} display="flex" flexDirection="column" height="100%">
                        <Typography variant="h6" gutterBottom>
                            Chat
                        </Typography>
                        <Box flex={1} overflow="auto" mb={2}>
                            <List>
                                {chatMessages.map((msg, idx) => (
                                    <ListItem key={idx} alignItems="flex-start">
                                        <ListItemText
                                            primary={msg.sender}
                                            secondary={msg.text}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                        <Box display="flex">
                            <TextField
                                variant="outlined"
                                size="small"
                                fullWidth
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') sendMessage();
                                }}
                                placeholder="Type a message"
                            />
                            <IconButton color="primary" onClick={sendMessage}>
                                <IconSend2 />
                            </IconButton>
                        </Box>
                    </Box>
                )}

                {showMembers && (
                    <Box p={2} display="flex" flexDirection="column" height="100%">
                        <Typography variant="h6" gutterBottom>
                            Participants
                        </Typography>
                        <List>
                            {participants.map((member, idx) => (
                                <ListItem key={idx}>
                                    <ListItemText primary={member} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
            </Drawer>

            {/* Bottom Controls */}
            <Box
                position="fixed"
                bottom={10}
                left="50%"
                p={1.}
                display="flex"
                justifyContent="center"
                alignItems="center"
                bgcolor="background.paper"
                borderTop={1}
                borderColor="divider"
                sx={{
                    width: 'fit-content',
                    transform: 'translateX(-50%)',
                    borderRadius: "10px"
                }}
            >
                {/* Mute Button */}
                <IconButton color={isMuted ? 'secondary' : 'primary'} onClick={toggleMute}>
                    {isMuted ? <IconMicrophoneOff /> : <IconMicrophone />}
                </IconButton>

                {/* Camera Button */}
                <IconButton color={isCameraOff ? 'secondary' : 'primary'} onClick={toggleCamera}>
                    {isCameraOff ? <IconVideoOff /> : <IconVideo />}
                </IconButton>

                {/* Share Screen Button */}
                <IconButton color="primary" onClick={shareScreen}>
                    <IconShareplay />
                </IconButton>

                {/* Chat Button */}
                <IconButton
                    color={showChat ? 'primary' : 'default'}
                    onClick={() => {
                        setShowChat(!showChat);
                        if (showMembers) setShowMembers(false);
                    }}
                >
                    <IconMessages />
                </IconButton>

                {/* Members Button */}
                <IconButton
                    color={showMembers ? 'primary' : 'default'}
                    onClick={() => {
                        setShowMembers(!showMembers);
                        if (showChat) setShowChat(false);
                    }}
                >
                    <IconUsersGroup />
                </IconButton>

                {/* Leave/End Button */}
                <Button
                    variant="contained"
                    color="error"
                    size='small'
                    startIcon={<IconPhone />}
                    sx={{ ml: 2, height: 34 }}
                    onClick={() => {
                        // Handle leave/end meeting logic here
                        alert('You have left the meeting.');
                    }}
                >
                    Leave
                </Button>
            </Box>
        </Box >
    );
};

export default MeetingManager;
