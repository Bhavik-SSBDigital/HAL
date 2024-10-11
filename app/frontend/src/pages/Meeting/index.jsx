// MeetingManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    IconButton,
    Button,
    Typography,
    Paper,
    Drawer,
    List,
    ListItem,
    ListItemText,
    TextField,
} from '@mui/material';
import {
    IconMessages,
    IconMicrophone,
    IconMicrophoneOff,
    IconPhone,
    IconShareplay,
    IconUsersGroup,
    IconVideo,
    IconVideoOff,
    IconSend2,
} from '@tabler/icons-react';
import io from 'socket.io-client';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import styles from './MeetingManager.module.css';
// Define the ICE server configuration
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers here if needed
    ],
};
const MeetingManager = () => {
    // State Management
    const socketUrl = import.meta.env.VITE_SOCKET_URL_MEETING;
    const [isMuted, setIsMuted] = useState(true);
    const [isCameraOff, setIsCameraOff] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [message, setMessage] = useState('');
    const username = sessionStorage.getItem('username') || 'Anonymous';
    const [inRoom, setInRoom] = useState(false);
    const [peers, setPeers] = useState({});
    console.log(peers);
    const [meetingId, setMeetingId] = useState('');
    console.log(peers);

    // Refs
    const localVideoRef = useRef(null);
    const localStreamRef = useRef();
    const peersRef = useRef({});
    const socketRef = useRef(null);

    // Form Handling
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    useEffect(() => {
        // Only connect if there's no existing connection
        if (!socketRef.current) {
            socketRef.current = io.connect(socketUrl); // Replace with your server URL

            // Handle joining a room after connecting
            socketRef.current.on('connect', () => {
                console.log('Connected to socket:', socketRef.current.id);
            });

            // Clean up and disconnect on unmount
            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null; // Ensure no reconnection happens
                }
            };
        }
    }, []);
    const onSubmit = async (data) => {
        if (data.meetingId.trim() === '') return;

        setInRoom(true);
        setMeetingId(data.meetingId);
        try {
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Join the specified room with the username
            socketRef.current.emit('join-room', {
                roomId: data.meetingId,
                username: data.username,
            });

            // Listen for other users joining
            socketRef.current.on('user-joined', async ({ socketId, username }) => {
                console.log(`${username} joined: ${socketId}`);
                await createOffer(socketId);
            });

            // Listen for offers
            socketRef.current.on('offer', async (data) => {
                const { from, offer } = data;
                await handleReceiveOffer(from, offer);
            });

            // Listen for answers
            socketRef.current.on('answer', async (data) => {
                const { from, answer } = data;
                await handleReceiveAnswer(from, answer);
            });

            // Listen for ICE candidates
            socketRef.current.on('ice-candidate', async (data) => {
                const { from, candidate } = data;
                await handleNewICECandidate(from, candidate);
            });

            // Listen for users leaving
            socketRef.current.on('user-left', (data) => {
                const { socketId, username } = data;
                toast.info(`${username} left: ${socketId}`);
                if (peersRef.current[socketId]) {
                    peersRef.current[socketId].peer.close();
                    delete peersRef.current[socketId];
                    setPeers((prevPeers) => {
                        const updatedPeers = { ...prevPeers };
                        delete updatedPeers[socketId];
                        return updatedPeers;
                    });
                }
            });
        } catch (err) {
            console.error('Failed to get user media', err);
        }
    };

    // Function to create an offer to a new user
    const createOffer = async (socketId) => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302',
                },
            ],
        });

        // Add local stream tracks to the peer connection
        localStreamRef.current.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStreamRef.current);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', {
                    target: socketId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle remote stream
        const remoteStream = new MediaStream();
        peerConnection.ontrack = (event) => {
            remoteStream.addTrack(event.track);
        };

        // Create an offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send the offer to the target user
        socketRef.current.emit('offer', {
            target: socketId,
            offer: peerConnection.localDescription,
        });

        // Save the peer connection
        peersRef.current[socketId] = {
            peer: peerConnection,
            stream: remoteStream,
        };

        setPeers((prevPeers) => ({
            ...prevPeers,
            [socketId]: remoteStream,
        }));
    };

    // Function to handle receiving an offer
    const handleReceiveOffer = async (socketId, offer) => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302',
                },
            ],
        });

        // Add local stream tracks to the peer connection
        localStreamRef.current.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStreamRef.current);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', {
                    target: socketId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle remote stream
        const remoteStream = new MediaStream();
        peerConnection.ontrack = (event) => {
            remoteStream.addTrack(event.track);
        };

        // Set remote description
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Create an answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send the answer back to the caller
        socketRef.current.emit('answer', {
            target: socketId,
            answer: peerConnection.localDescription,
        });

        // Save the peer connection
        peersRef.current[socketId] = {
            peer: peerConnection,
            stream: remoteStream,
        };

        setPeers((prevPeers) => ({
            ...prevPeers,
            [socketId]: remoteStream,
        }));
    };

    // Function to handle receiving an answer
    const handleReceiveAnswer = async (socketId, answer) => {
        const peerObj = peersRef.current[socketId];
        if (peerObj) {
            await peerObj.peer.setRemoteDescription(
                new RTCSessionDescription(answer),
            );
        }
    };

    // Function to handle receiving ICE candidates
    const handleNewICECandidate = async (socketId, candidate) => {
        const peerObj = peersRef.current[socketId];
        if (peerObj) {
            try {
                await peerObj.peer.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Error adding received ice candidate', err);
            }
        }
    };

    // Function to leave the meeting room
    // Function to leave the meeting room
    const leaveMeetingRoom = () => {
        // Stop and clear chat messages and set the room state
        setChatMessages([]);
        setInRoom(false);

        // Stop all local media tracks (audio and video)
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                track.stop(); // Stop each media track (audio and video)
            });

            // Clear the local video element
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }

            // Set the localStream to null
            localStreamRef.current = null;
        }

        // Close all peer connections
        Object.values(peersRef.current).forEach((peerObj) => {
            if (peerObj && peerObj.peer) {
                peerObj.peer.close(); // Close each peer connection
            }
        });
        peersRef.current = {}; // Clear the peers reference

        // Clear all remote video elements
        setPeers({});

        // Disconnect from the socket
        if (socketRef.current) {
            socketRef.current.emit('leave-room', {
                roomId: meetingId,
                username: username,
            });
            socketRef.current.disconnect(); // Close the socket connection
        }

        console.log(
            'Left meeting room, stopped all tracks, and closed connections.',
        );
    };

    // Function to send a message to the room
    const sendMessageToRoom = (meetingId, message) => {
        socketRef.current.emit('sendMessageToRoom', { meetingId, message });
    };

    // Toggle microphone
    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
            console.log(`Microphone ${!isMuted ? 'muted' : 'unmuted'}`);
        }
    };

    // Toggle camera
    const toggleCamera = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = isCameraOff;
            });
            setIsCameraOff(!isCameraOff);
            console.log(`Camera ${!isCameraOff ? 'off' : 'on'}`);
        }
    };

    // Handle sending chat messages
    const sendMessage = () => {
        if (message.trim() !== '') {
            const newMessage = { sender: username, text: message };
            // sendMessageToRoom(meetingId, newMessage); // Emit message to socket
            setChatMessages((prev) => [...prev, newMessage]); // Update local chat
            setMessage('');
            console.log(`Sent message: ${message}`);
        }
    };

    // Share Screen Functionality (Optional)
    const shareScreen = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
            });
            const screenTrack = screenStream.getVideoTracks()[0];

            // Replace the current video track with the screen stream
            Object.values(peerConnections.current).forEach((pc) => {
                const sender = pc.getSenders().find((s) => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }
            });

            // Update local video stream
            localVideoRef.current.srcObject = screenStream;
            console.log('Started screen sharing');

            // Handle when the user stops sharing
            screenTrack.onended = async () => {
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                const videoTrack = videoStream.getVideoTracks()[0];
                Object.values(peerConnections.current).forEach((pc) => {
                    const sender = pc.getSenders().find((s) => s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });
                localVideoRef.current.srcObject = videoStream;
                console.log('Stopped screen sharing and resumed camera');
            };
        } catch (err) {
            console.error('Error sharing screen:', err);
        }
    };

    return (
        <div className={styles.container}>
            {!inRoom ? (
                // Join Meeting Form
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                        width: '100%',
                        maxWidth: 400,
                        mx: 'auto',
                        p: '20px !important',
                    }}
                    className="cardDesign"
                >
                    <Typography variant="h5" gutterBottom>
                        Join Meeting
                    </Typography>
                    <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
                        <TextField
                            {...register('username', { required: 'Username is required' })}
                            label="Username"
                            variant="outlined"
                            defaultValue={username}
                            fullWidth
                            margin="normal"
                            error={!!errors.username}
                            helperText={errors.username?.message}
                        />
                        <TextField
                            {...register('meetingId', { required: 'Meeting ID is required' })}
                            label="Meeting ID"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            error={!!errors.meetingId}
                            helperText={errors.meetingId?.message}
                        />
                        <Button type="submit" variant="contained" color="primary" fullWidth>
                            Join
                        </Button>
                    </form>
                </Box>
            ) : (
                <>
                    <Typography variant='h6' textAlign="center">Meeting ID : {meetingId}</Typography>
                    <Box display="flex">
                        {/* Main Meeting Screen */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                boxSizing: 'border-box',
                                overflowY: 'auto',
                            }}
                        >
                            {/* Local Video */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    position: 'relative',
                                    margin: 1,
                                    width: 300,
                                    height: 200,
                                    backgroundColor: '#000',
                                }}
                            >
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                                {/* Camera Off Overlay */}
                                {isCameraOff && (
                                    <Box
                                        position="absolute"
                                        top={0}
                                        left={0}
                                        width="100%"
                                        height="100%"
                                        bgcolor="rgba(0,0,0,0.6)"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Typography variant="h6" color="#fff">
                                            Camera Off
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>

                            {/* Remote Videos */}
                            {Object.keys(peers)?.map((participant) => (
                                <Paper
                                    key={participant}
                                    variant="outlined"
                                    sx={{
                                        position: 'relative',
                                        margin: 1,
                                        width: 300,
                                        height: 200,
                                        backgroundColor: '#000',
                                    }}
                                >
                                    <RemoteVideo stream={peers[participant]} />

                                    <Box
                                        position="absolute"
                                        bottom={0}
                                        left={0}
                                        width="100%"
                                        bgcolor="rgba(0,0,0,0.5)"
                                        color="#fff"
                                        p={0.5}
                                    >
                                        <Typography variant="subtitle2">{participant}</Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>

                        {/* Right Sidebar (Chat and Members) */}
                        <Drawer
                            variant="temporary"
                            onClose={() => {
                                setShowChat(false);
                                setShowMembers(false);
                            }}
                            anchor="right"
                            open={showChat || showMembers}
                            sx={{
                                '& .MuiDrawer-paper': { width: 300 },
                            }}
                        >
                            {showChat && (
                                <Box p={2} display="flex" flexDirection="column" height="100%">
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        textAlign="center"
                                        sx={{ borderBottom: '2px solid' }}
                                    >
                                        Chat
                                    </Typography>
                                    <Box flex={1} overflow="auto" mb={2}>
                                        <List>
                                            {chatMessages.map((msg, idx) => (
                                                <ListItem
                                                    sx={{ padding: 0 }}
                                                    key={idx}
                                                    alignItems="flex-start"
                                                >
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
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        textAlign="center"
                                        sx={{ borderBottom: '2px solid' }}
                                    >
                                        Participants
                                    </Typography>
                                    <List>
                                        {Object.keys(peers)?.map((member, idx) => (
                                            <ListItem key={idx} sx={{ padding: 0 }}>
                                                <ListItemText primary={member} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </Drawer>

                        {/* Bottom Controls */}
                        <Box
                            position="absolute"
                            bottom={10}
                            left="50%"
                            p={1}
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            bgcolor="background.paper"
                            borderTop={1}
                            borderColor="divider"
                            sx={{
                                width: 'fit-content',
                                transform: 'translateX(-50%)',
                                borderRadius: '10px',
                            }}
                        >
                            {/* Mute Button */}
                            <IconButton
                                color={isMuted ? 'secondary' : 'primary'}
                                onClick={toggleMute}
                            >
                                {isMuted ? <IconMicrophoneOff /> : <IconMicrophone />}
                            </IconButton>

                            {/* Camera Button */}
                            <IconButton
                                color={isCameraOff ? 'secondary' : 'primary'}
                                onClick={toggleCamera}
                            >
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
                                size="small"
                                startIcon={<IconPhone />}
                                sx={{ ml: 2, height: 34 }}
                                onClick={leaveMeetingRoom}
                            >
                                Leave
                            </Button>
                        </Box>
                    </Box>
                </>
            )}
        </div>
    );
};
const RemoteVideo = ({ stream }) => {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
            }}
        />
    );
};
export default MeetingManager;
