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
  ListItemAvatar,
  Avatar,
  Stack,
  CircularProgress,
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
  IconPin,
  IconPinnedOff,
} from '@tabler/icons-react';
import io from 'socket.io-client';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import styles from './MeetingManager.module.css';
import userSocket from '../Socket_Connection';
import { socketData } from '../../Store';
import axios from 'axios';
import History from './History';
// Define the ICE server configuration
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add TURN servers here if needed
  ],
};
const MeetingManager = () => {
  const { socketConnection } = socketData();
  // State Management
  // const socketUrl = import.meta.env.VITE_SOCKET_URL;
  const [pinnedParticipant, setPinnedParticipant] = React.useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState('');
  const username = sessionStorage.getItem('username') || null;
  const [inRoom, setInRoom] = useState(false);
  const [peers, setPeers] = useState({});
  const [meetingId, setMeetingId] = useState('');
  const token = sessionStorage.getItem('accessToken');

  // Refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef();
  const peersRef = useRef({});
  const socketRef = useRef(null);

  // Form Handling
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { meetingId: '', username: username } });

  useEffect(() => {
    // Establish connection and setup listeners
    if (!socketRef.current) {
      socketRef.current = socketConnection;

      socketRef.current.on('message', async (data) => {
        const { user, text } = data;
        setChatMessages((prev) => [...prev, text]);
      });

      socketRef.current.on('user-joined', async ({ socketId, username }) => {
        console.log(`${username} joined: ${socketId}`);
        await createOffer(socketId, username);
      });

      socketRef.current.on('offer', async (data) => {
        const { from, offer, name } = data;
        await handleReceiveOffer(from, offer, name);
      });

      socketRef.current.on('answer', async (data) => {
        const { from, answer } = data;
        await handleReceiveAnswer(from, answer);
      });

      socketRef.current.on('ice-candidate', async (data) => {
        const { from, candidate } = data;
        await handleNewICECandidate(from, candidate);
      });

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
    }

    return () => {
      // Cleanup function when
      //   console.log(username, meetingId);
      const IdMeeting = localStorage.getItem('IdMeeting');
      if (socketRef.current && username && IdMeeting) {
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
        socketRef.current.emit('leave-room', {
          roomId: IdMeeting,
          username: username,
        });
        localStorage.removeItem('IdMeeting');
        console.log('leaving room');
      }
      console.log('clean-up');
    };
  }, []); // Ensure this effect only runs once on mount and unmount

  const onSubmit = async (meetingId) => {
    if (meetingId.trim() === '') return;
    setInRoom(true);
    setMeetingId(meetingId);
    localStorage.setItem('IdMeeting', meetingId);
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getAudioTracks().forEach((track) => (track.enabled = false));
      stream.getVideoTracks().forEach((track) => (track.enabled = false));
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Join the specified room with the username
      socketRef.current.emit('join-room', {
        roomId: meetingId,
        username: username,
      });

      // Listen for other users joining
    } catch (err) {
      console.error('Failed to get user media', err);
    }
  };

  // Function to create an offer to a new user
  const createOffer = async (socketId, user) => {
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
      user: username,
    });

    // Save the peer connection
    peersRef.current[socketId] = {
      peer: peerConnection,
      stream: remoteStream,
    };
    console.log(user);
    setPeers((prevPeers) => ({
      ...prevPeers,
      [socketId]: { name: user, stream: remoteStream },
    }));
  };

  // Function to handle receiving an offer
  const handleReceiveOffer = async (socketId, offer, name) => {
    console.log('receive offer');
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
    console.log(name);
    setPeers((prevPeers) => ({
      ...prevPeers,
      [socketId]: { name, stream: remoteStream },
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
  const leaveMeetingRoom = () => {
    // Stop and clear chat messages and set the room state
    setChatMessages([]);
    setInRoom(false);
    setPinned('');

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
      console.log('leaving room');
      // socketRef.current.disconnect(); // Close the socket connection
      // socketRef.current = null;
    }
    setIsAudioEnabled(false);
    setIsVideoEnabled(false);
    console.log(
      'Left meeting room, stopped all tracks, and closed connections.',
    );
  };

  // Function to send a message to the room
  const sendMessageToRoom = (meetingId, message) => {
    socketRef.current.emit('sendMessage', { meetingId, message, username });
  };

  // Toggle microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      console.log('toggle mute');
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
    // if (localStreamRef.current) {
    //     localStreamRef.current.getAudioTracks().forEach((track) => {
    //         track.enabled = isAudioEnabled;
    //     });
    //     setIsAudioEnabled(!isAudioEnabled);
    //     console.log(`Microphone ${!isAudioEnabled ? 'muted' : 'unmuted'}`);
    // }
  };

  // Toggle camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
    // if (localStreamRef.current) {
    //     localStreamRef.current.getVideoTracks().forEach((track) => {
    //         track.enabled = isVideoEnabled;
    //     });
    //     setIsVideoEnabled(!isVideoEnabled);
    //     console.log(`Camera ${!isVideoEnabled ? 'off' : 'on'}`);
    // }
  };

  // Handle sending chat messages
  const sendMessage = () => {
    if (message.trim() !== '') {
      const newMessage = { sender: username, text: message };
      sendMessageToRoom(meetingId, newMessage); // Emit message to socket
      setMessage('');
      console.log(`Sent message: ${message}`);
    }
  };

  // Share Screen Functionality (Enhanced)
  const shareScreen = async () => {
    try {
      // Request to capture the screen
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace the current video track with the screen track in all peer connections
      Object.values(peersRef.current).forEach(({ peer }) => {
        const videoSender = peer
          .getSenders()
          .find((sender) => sender.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      });

      // Update the local video element to display the screen stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      console.log('Started screen sharing');

      // Listen for when the user stops sharing the screen
      screenTrack.onended = async () => {
        try {
          // Re-acquire the camera stream
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          const cameraTrack = cameraStream.getVideoTracks()[0];

          // Replace the screen track with the camera track in all peer connections
          Object.values(peersRef.current).forEach(({ peer }) => {
            const videoSender = peer
              .getSenders()
              .find((sender) => sender.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(cameraTrack);
            }
          });

          // Update the local video element to display the camera stream
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = cameraStream;
          }
          console.log('Stopped screen sharing and resumed camera');
        } catch (error) {
          console.error('Error resuming camera stream:', error);
          alert('Failed to resume camera after screen sharing.');
        }
      };
    } catch (err) {
      console.error('Error during screen sharing:', err);
      alert('Failed to share screen. Please check permissions and try again.');
    }
  };

  console.log(peers);
  function getColor(string) {
    let hash = 0;
    let i;

    /* eslint-disable no-bitwise */
    for (i = 0; i < string.length; i += 1) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';

    for (i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    /* eslint-enable no-bitwise */
    console.log(color);
    return color;
  }
  const pinVideo = (participant) => {
    setPinnedParticipant(participant);
  };

  const [pinned, setPinned] = useState('');
  const parti = Object.keys(peers)?.find(
    (participant) => peers[participant]?.name == pinned,
  );
  return (
    <div>
      {!inRoom ? (
        <History joinMeet={(id) => onSubmit(id)} />
      ) : (
        <div className={styles.container}>
          <Typography variant="h6" textAlign="center">
            Meeting ID : {meetingId}
          </Typography>

          <Box display="flex" flexWrap={'wrap'} gap={1}>
            {/* highlight */}
            {pinned ? (
              <Box
                height={500}
                minWidth={500}
                width={'100%'}
                sx={{
                  flex: 8,
                  bgcolor: 'black',
                  border: '1px solid',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <video
                  ref={(el) => {
                    if (el) el.srcObject = peers[parti]?.stream || null;
                  }}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
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
                  <Typography variant="subtitle2">
                    {peers[parti]?.name}
                  </Typography>
                </Box>
                <IconButton
                  sx={{ position: 'absolute', top: '10px', right: '10px' }}
                  onClick={() => setPinned('')}
                >
                  <IconPinnedOff color="blue" />
                </IconButton>
              </Box>
            ) : null}

            {/* Main Meeting Screen */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                boxSizing: 'border-box',
                overflowY: 'auto',
                gap: 1,
                flex: 4,
                minWidth: '220px',
              }}
            >
              {/* Local Video */}
              <Paper
                variant="outlined"
                sx={{
                  position: 'relative',
                  // margin: 1,
                  maxWidth: 400,
                  minWidth: 200,
                  height: 240,
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
                    objectFit: 'fill',
                  }}
                />
                {/* Camera Off Overlay */}
                {!isVideoEnabled && (
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
              {Object.keys(peers)
                ?.filter((participant) => peers[participant]?.name !== pinned)
                ?.map((participant) => (
                  <Paper
                    key={participant}
                    variant="outlined"
                    sx={{
                      position: 'relative',
                      // margin: 1,
                      maxWidth: 400,
                      minWidth: 200,
                      height: 240,
                      backgroundColor: '#000',
                    }}
                  >
                    <RemoteVideo stream={peers[participant]?.stream} />

                    <Box
                      position="absolute"
                      bottom={0}
                      left={0}
                      width="100%"
                      bgcolor="rgba(0,0,0,0.5)"
                      color="#fff"
                      p={0.5}
                    >
                      <Typography variant="subtitle2">
                        {peers[participant]?.name}
                      </Typography>
                    </Box>
                    <IconButton
                      sx={{ position: 'absolute', top: '10px', right: '10px' }}
                      onClick={() => setPinned(peers[participant]?.name)}
                    >
                      <IconPin color="blue" />
                    </IconButton>
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
                      <ListItem key={idx} sx={{ my: 1 }}>
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              background: `${getColor(peers[member]?.name)}`,
                            }}
                          >
                            {peers[member]?.name?.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>{' '}
                        <ListItemText primary={peers[member]?.name} />
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
                color={!isAudioEnabled ? 'secondary' : 'primary'}
                onClick={toggleMute}
              >
                {!isAudioEnabled ? <IconMicrophoneOff /> : <IconMicrophone />}
              </IconButton>

              {/* Camera Button */}
              <IconButton
                color={!isVideoEnabled ? 'secondary' : 'primary'}
                onClick={toggleCamera}
              >
                {!isVideoEnabled ? <IconVideoOff /> : <IconVideo />}
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
        </div>
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
        objectFit: 'fill',
      }}
    />
  );
};
export default MeetingManager;
