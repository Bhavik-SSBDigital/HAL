// MeetingManager.jsx
import React, { useState, useEffect, useRef } from "react";
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
} from "@mui/material";
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
} from "@tabler/icons-react";
import { io } from "socket.io-client";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

// Define the ICE server configuration
const configuration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
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
    const [message, setMessage] = useState("");
    const [participants, setParticipants] = useState([]);
    const username = sessionStorage.getItem("username") || "Anonymous";
    const [meetingId, setMeetingId] = useState("");

    // Refs
    const localVideoRef = useRef(null);
    const remoteVideosRef = useRef({}); // Object to hold refs for remote videos
    const socket = useRef(null); // Socket instance
    const peerConnections = useRef({}); // Map socketId to RTCPeerConnection
    const localStream = useRef(null); // Local media stream

    // Form Handling
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    // Function to join a meeting room
    const joinMeetingRoom = (meetingId, username) => {
        socket.current.emit("joinMeetingRoom", { meetingId, username });
        setMeetingId(meetingId);
    };

    // Function to handle form submission
    const onSubmit = (data) => {
        joinMeetingRoom(data.meetingId, data.username);
    };

    // Function to create a new RTCPeerConnection
    const createPeerConnection = (socketId) => {
        const pc = new RTCPeerConnection(configuration);

        // Add local tracks to the peer connection
        if (localStream.current) {
            localStream.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStream.current);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.current.emit("ice-candidate", {
                    meetingId,
                    to: socketId,
                    candidate: event.candidate,
                });
                console.log(`Sent ICE candidate to ${socketId}`);
            }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            const remoteVideo = remoteVideosRef.current[socketId];
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
                console.log(`Received remote stream from ${socketId}`);
            }
        };

        // Handle connection state change
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                if (remoteVideosRef.current[socketId]) {
                    remoteVideosRef.current[socketId].srcObject = null;
                    delete remoteVideosRef.current[socketId];
                }
                delete peerConnections.current[socketId];
                setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
                toast.info(`Participant disconnected: ${socketId}`);
                console.log(`Connection with ${socketId} closed`);
            }
        };

        peerConnections.current[socketId] = pc;
        console.log(`Created RTCPeerConnection with ${socketId}`);
    };

    // Handle receiving an offer
    const handleReceiveOffer = async (offer, from) => {
        if (!peerConnections.current[from]) {
            createPeerConnection(from);
        }
        const pc = peerConnections.current[from];
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log(`Set remote description from ${from}`);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.current.emit("answer", { meetingId, to: from, answer });
            console.log(`Sent answer to ${from}`);
        } catch (err) {
            console.error("Error handling received offer:", err);
        }
    };

    // Handle receiving an answer
    const handleReceiveAnswer = async (answer, from) => {
        const { sdp, type } = answer;
        const pc = peerConnections.current[from];
        if (pc) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription({ sdp, type }));
                console.log(`Set remote description from answer ${from}`);
            } catch (err) {
                console.error("Error setting remote description with answer:", err);
            }
        }
    };

    // Handle receiving ICE candidate
    const handleReceiveIceCandidate = async (candidate, from) => {
        const pc = peerConnections.current[from];
        if (pc) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`Added ICE candidate from ${from}`);
            } catch (err) {
                console.error("Error adding received ICE candidate:", err);
            }
        }
    };

    // Request access to camera and microphone
    useEffect(() => {
        const getMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                localStream.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                console.log("Obtained local media stream");
            } catch (err) {
                console.error("Error accessing media devices.", err);
                alert(
                    "Unable to access camera and microphone. Please check your permissions."
                );
            }
        };

        getMedia();

        // Initialize socket connection
        socket.current = io(socketUrl);

        // Handle socket events
        socket.current.on("connect", () => {
            console.log("Connected to socket server");
            // Emit login event with username
            socket.current.emit("login", { username });
        });

        // Handle login confirmation
        socket.current.on("login", (data) => {
            console.log(`Login successful: ${data}`);
        });

        // Handle existing users in the room
        socket.current.on("existingUsers", async (users) => {
            console.log("Existing users:", users);
            for (const { username: user, socketId } of users) {
                setParticipants((prev) => [...prev, { username: user, socketId }]);
                createPeerConnection(socketId);

                const pc = peerConnections.current[socketId];
                if (pc) {
                    try {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socket.current.emit("offer", {
                            meetingId,
                            to: socketId,
                            offer: pc.localDescription,
                        });
                        console.log(`Sent offer to ${socketId}`);
                    } catch (err) {
                        console.error(`Error creating/sending offer to ${socketId}:`, err);
                    }
                }
            }
        });

        // Handle user joining
        socket.current.on("userJoined", async ({ username: user, socketId }) => {
            console.log(`User joined: ${user} (${socketId})`);
            setParticipants((prev) => [...prev, { username: user, socketId }]);
            toast.info(`${user} joined the meeting`);

            // Create a peer connection with the new user
            createPeerConnection(socketId);

            // After creating the peer connection, create and send an offer
            const pc = peerConnections.current[socketId];
            if (pc) {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.current.emit("offer", {
                        meetingId,
                        to: socketId,
                        offer: pc.localDescription,
                    });
                    console.log(`Sent offer to ${socketId}`);
                } catch (err) {
                    console.error(`Error creating/sending offer to ${socketId}:`, err);
                }
            }
        });

        // Handle user leaving
        socket.current.on("userLeft", ({ username: user, socketId }) => {
            console.log(`User left: ${user} (${socketId})`);
            setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
            toast.info(`${user} left the meeting`);

            // Close and remove peer connection
            if (peerConnections.current[socketId]) {
                peerConnections.current[socketId].close();
                delete peerConnections.current[socketId];
                console.log(`Closed connection with ${socketId}`);
            }

            // Remove remote video
            if (remoteVideosRef.current[socketId]) {
                remoteVideosRef.current[socketId].srcObject = null;
                delete remoteVideosRef.current[socketId];
                console.log(`Removed remote video for ${socketId}`);
            }
        });

        // Handle receiving offer
        socket.current.on("offer", ({ offer, from }) => {
            console.log(`Received offer from ${from}`);
            handleReceiveOffer(offer, from);
        });

        // Handle receiving answer
        socket.current.on("answer", ({ answer, from }) => {
            console.log(`Received answer from ${from}`);
            handleReceiveAnswer(answer, from);
        });

        // Handle receiving ICE candidate
        socket.current.on("ice-candidate", ({ candidate, from }) => {
            console.log(`Received ICE candidate from ${from}`);
            handleReceiveIceCandidate(candidate, from);
        });

        // Handle new chat messages
        socket.current.on("newMessage", (message) => {
            console.log("New message:", message);
            setChatMessages((prev) => [...prev, message]);
        });

        // Handle connection errors
        socket.current.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
            toast.error("Unable to connect to the server.");
        });

        // Cleanup on component unmount
        return () => {
            // Stop all local media tracks
            if (localStream.current) {
                localStream.current.getTracks().forEach((track) => track.stop());
            }
            // Close all peer connections
            Object.values(peerConnections.current).forEach((pc) => pc.close());
            // Disconnect socket
            if (socket.current) {
                socket.current.disconnect();
            }
            console.log("Cleaned up connections and disconnected socket");
        };
    }, []);

    // Function to leave the meeting room
    const leaveMeetingRoom = () => {
        // Emit the leave event to the server
        socket.current.emit("leaveMeetingRoom", { meetingId, username });

        // Clear room state
        setMeetingId("");
        setChatMessages([]);
        setParticipants([]);

        // Stop all local tracks
        if (localStream.current) {
            localStream.current.getTracks().forEach((track) => track.stop());

            // Clear local video element
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }

            // Set the localStream to null
            localStream.current = null;
        }

        // Close all peer connections
        Object.values(peerConnections.current).forEach((pc) => pc.close());
        peerConnections.current = {};
        console.log("Left meeting room and closed all connections");

        // Remove all remote video elements
        Object.keys(remoteVideosRef.current).forEach((socketId) => {
            const videoElement = remoteVideosRef.current[socketId];
            if (videoElement) {
                videoElement.srcObject = null;
                delete remoteVideosRef.current[socketId];
                console.log(`Removed remote video for ${socketId}`);
            }
        });
    };

    // Function to send a message to the room
    const sendMessageToRoom = (meetingId, message) => {
        socket.current.emit("sendMessageToRoom", { meetingId, message });
    };

    // Toggle microphone
    const toggleMute = () => {
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach((track) => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
            console.log(`Microphone ${!isMuted ? "muted" : "unmuted"}`);
        }
    };

    // Toggle camera
    const toggleCamera = () => {
        if (localStream.current) {
            localStream.current.getVideoTracks().forEach((track) => {
                track.enabled = isCameraOff;
            });
            setIsCameraOff(!isCameraOff);
            console.log(`Camera ${!isCameraOff ? "off" : "on"}`);
        }
    };

    // Handle sending chat messages
    const sendMessage = () => {
        if (message.trim() !== "") {
            const newMessage = { sender: username, text: message };
            sendMessageToRoom(meetingId, newMessage); // Emit message to socket
            setChatMessages((prev) => [...prev, newMessage]); // Update local chat
            setMessage("");
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
                const sender = pc.getSenders().find((s) => s.track.kind === "video");
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }
            });

            // Update local video stream
            localVideoRef.current.srcObject = screenStream;
            console.log("Started screen sharing");

            // Handle when the user stops sharing
            screenTrack.onended = async () => {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = videoStream.getVideoTracks()[0];
                Object.values(peerConnections.current).forEach((pc) => {
                    const sender = pc.getSenders().find((s) => s.track.kind === "video");
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });
                localVideoRef.current.srcObject = videoStream;
                console.log("Stopped screen sharing and resumed camera");
            };
        } catch (err) {
            console.error("Error sharing screen:", err);
        }
    };

    return !meetingId ? (
        // Join Meeting Form
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            sx={{ width: "100%", maxWidth: 400, mx: "auto", p: "20px !important" }}
            className="cardDesign"
        >
            <Typography variant="h5" gutterBottom>
                Join Meeting
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
                <TextField
                    {...register("username", { required: "Username is required" })}
                    label="Username"
                    variant="outlined"
                    defaultValue={username}
                    fullWidth
                    margin="normal"
                    error={!!errors.username}
                    helperText={errors.username?.message}
                />
                <TextField
                    {...register("meetingId", { required: "Meeting ID is required" })}
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
        // Meeting Room Interface
        <Box display="flex" position="relative">
            {/* Main Meeting Screen */}
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    height: "calc(100vh - 82px)", // Full viewport height minus controls
                    width: "100vw", // Full viewport width
                    padding: 2,
                    boxSizing: "border-box",
                    overflowY: "auto",
                }}
            >
                {/* Local Video */}
                <Paper
                    variant="outlined"
                    sx={{
                        position: "relative",
                        margin: 1,
                        width: 300,
                        height: 200,
                        backgroundColor: "#000",
                    }}
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
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
                {participants.map((participant) => (
                    <Paper
                        key={participant.socketId}
                        variant="outlined"
                        sx={{
                            position: "relative",
                            margin: 1,
                            width: 300,
                            height: 200,
                            backgroundColor: "#000",
                        }}
                    >
                        <video
                            id={`remoteVideo_${participant.socketId}`}
                            ref={(el) => {
                                if (el) {
                                    remoteVideosRef.current[participant.socketId] = el;
                                }
                            }}
                            autoPlay
                            playsInline
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                        <Box
                            position="absolute"
                            bottom={0}
                            left={0}
                            width="100%"
                            bgcolor="rgba(0,0,0,0.5)"
                            color="#fff"
                            p={0.5}
                        >
                            <Typography variant="subtitle2">{participant.username}</Typography>
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
                    "& .MuiDrawer-paper": { width: 300 },
                }}
            >
                {showChat && (
                    <Box p={2} display="flex" flexDirection="column" height="100%">
                        <Typography
                            variant="h6"
                            gutterBottom
                            textAlign="center"
                            sx={{ borderBottom: "2px solid" }}
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
                                    if (e.key === "Enter") sendMessage();
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
                            sx={{ borderBottom: "2px solid" }}
                        >
                            Participants
                        </Typography>
                        <List>
                            {participants.map((member, idx) => (
                                <ListItem key={idx} sx={{ padding: 0 }}>
                                    <ListItemText primary={member.username} />
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
                p={1}
                display="flex"
                justifyContent="center"
                alignItems="center"
                bgcolor="background.paper"
                borderTop={1}
                borderColor="divider"
                sx={{
                    width: "fit-content",
                    transform: "translateX(-50%)",
                    borderRadius: "10px",
                }}
            >
                {/* Mute Button */}
                <IconButton
                    color={isMuted ? "secondary" : "primary"}
                    onClick={toggleMute}
                >
                    {isMuted ? <IconMicrophoneOff /> : <IconMicrophone />}
                </IconButton>

                {/* Camera Button */}
                <IconButton
                    color={isCameraOff ? "secondary" : "primary"}
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
                    color={showChat ? "primary" : "default"}
                    onClick={() => {
                        setShowChat(!showChat);
                        if (showMembers) setShowMembers(false);
                    }}
                >
                    <IconMessages />
                </IconButton>

                {/* Members Button */}
                <IconButton
                    color={showMembers ? "primary" : "default"}
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
    );
};

export default MeetingManager;
