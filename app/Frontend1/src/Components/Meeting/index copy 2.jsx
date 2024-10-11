// src/App.js

import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import './styles.css';

// Initialize Socket.IO client
const socket = io('http://192.168.1.106:8000'); // Ensure this matches your backend URL and port

function App() {
    const [roomId, setRoomId] = useState('');
    const [inRoom, setInRoom] = useState(false);
    const [peers, setPeers] = useState({});

    const localVideoRef = useRef();
    const peersRef = useRef({});
    const localStreamRef = useRef();

    const joinRoom = async () => {
        if (roomId.trim() === '') return;

        setInRoom(true);

        try {
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Join the specified room
            socket.emit('join-room', roomId);

            // Listen for existing users in the room
            socket.on('user-joined', async (socketId) => {
                console.log(`User joined: ${socketId}`);
                await createOffer(socketId);
            });

            // Listen for offers
            socket.on('offer', async (data) => {
                const { from, offer } = data;
                await handleReceiveOffer(from, offer);
            });

            // Listen for answers
            socket.on('answer', async (data) => {
                const { from, answer } = data;
                await handleReceiveAnswer(from, answer);
            });

            // Listen for ICE candidates
            socket.on('ice-candidate', async (data) => {
                const { from, candidate } = data;
                await handleNewICECandidate(from, candidate);
            });

            // Listen for users leaving
            socket.on('user-left', (socketId) => {
                console.log(`User left: ${socketId}`);
                if (peersRef.current[socketId]) {
                    peersRef.current[socketId].peer.close();
                    delete peersRef.current[socketId];
                    setPeers(prevPeers => {
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
                    urls: 'stun:stun.l.google.com:19302'
                }
            ]
        });

        // Add local stream tracks to the peer connection
        localStreamRef.current.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamRef.current);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    target: socketId,
                    candidate: event.candidate
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
        socket.emit('offer', {
            target: socketId,
            offer: peerConnection.localDescription
        });

        // Save the peer connection
        peersRef.current[socketId] = {
            peer: peerConnection,
            stream: remoteStream
        };

        setPeers(prevPeers => ({
            ...prevPeers,
            [socketId]: remoteStream
        }));
    };

    // Function to handle receiving an offer
    const handleReceiveOffer = async (socketId, offer) => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302'
                }
            ]
        });

        // Add local stream tracks to the peer connection
        localStreamRef.current.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamRef.current);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    target: socketId,
                    candidate: event.candidate
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
        socket.emit('answer', {
            target: socketId,
            answer: peerConnection.localDescription
        });

        // Save the peer connection
        peersRef.current[socketId] = {
            peer: peerConnection,
            stream: remoteStream
        };

        setPeers(prevPeers => ({
            ...prevPeers,
            [socketId]: remoteStream
        }));
    };

    // Function to handle receiving an answer
    const handleReceiveAnswer = async (socketId, answer) => {
        const peerObj = peersRef.current[socketId];
        if (peerObj) {
            await peerObj.peer.setRemoteDescription(new RTCSessionDescription(answer));
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

    // Clean up on component unmount
    //   useEffect(() => {
    //     return () => {
    //       socket.disconnect();
    //       Object.values(peersRef.current).forEach(peerObj => {
    //         peerObj.peer.close();
    //       });
    //     };
    //   }, []);

    return (
        <div className="App">
            {!inRoom ? (
                <div className="join-container">
                    <h2>Join a Room</h2>
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                    />
                    <button onClick={joinRoom}>Join</button>
                </div>
            ) : (
                <div className="video-container">
                    <div className="video-wrapper">
                        <h3>My Video</h3>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="video"
                        />
                    </div>
                    {Object.keys(peers).map((socketId) => (
                        <RemoteVideo key={socketId} stream={peers[socketId]} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Component to display remote video streams
const RemoteVideo = ({ stream }) => {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="video-wrapper">
            <h3>Remote Video</h3>
            <video ref={videoRef} autoPlay playsInline className="video" />
        </div>
    );
};

export default App;
