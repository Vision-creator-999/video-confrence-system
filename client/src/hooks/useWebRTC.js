/**
 * useWebRTC Hook
 * 
 * Custom React hook that manages the entire WebRTC lifecycle:
 * - Media stream acquisition (camera + microphone)
 * - Socket.IO signaling connection
 * - RTCPeerConnection setup with STUN server
 * - SDP offer/answer exchange
 * - ICE candidate relay
 * - Track toggling (mute/camera off)
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

// STUN server for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const SIGNALING_SERVER = 'http://localhost:5000';

export default function useWebRTC(roomId) {
  // Refs for WebRTC objects (don't trigger re-renders)
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // State for UI
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [connectionState, setConnectionState] = useState('idle'); // idle | connecting | connected | failed
  const [error, setError] = useState(null);
  const [roomFull, setRoomFull] = useState(false);
  const [remoteUserId, setRemoteUserId] = useState(null);

  /**
   * Initialize local media stream
   */
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('❌ Failed to access media devices:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera and microphone permissions are required. Please allow access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect a device and try again.');
      } else {
        setError(`Failed to access camera/microphone: ${err.message}`);
      }
      throw err;
    }
  }, []);

  /**
   * Create and configure RTCPeerConnection
   */
  const createPeerConnection = useCallback((remoteId) => {
    // Close existing connection if any
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote tracks
    const newRemoteStream = new MediaStream();
    remoteStreamRef.current = newRemoteStream;

    pc.ontrack = (event) => {
      console.log('🎥 Received remote track:', event.track.kind);
      event.streams[0].getTracks().forEach((track) => {
        newRemoteStream.addTrack(track);
      });
      setRemoteStream(new MediaStream(newRemoteStream.getTracks()));
    };

    // Send ICE candidates to remote peer via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          to: remoteId,
        });
      }
    };

    // Monitor connection state changes
    pc.onconnectionstatechange = () => {
      console.log('📡 Connection state:', pc.connectionState);
      switch (pc.connectionState) {
        case 'connecting':
          setConnectionState('connecting');
          break;
        case 'connected':
          setConnectionState('connected');
          break;
        case 'disconnected':
        case 'failed':
          setConnectionState('failed');
          break;
        case 'closed':
          setConnectionState('idle');
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', pc.iceConnectionState);
    };

    return pc;
  }, []);

  /**
   * Process any ICE candidates queued before remote description was set
   */
  const processPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('⚠️ Failed to add queued ICE candidate:', err);
      }
    }
    pendingCandidatesRef.current = [];
  }, []);

  /**
   * Main effect: Initialize media, connect socket, and set up signaling
   */
  useEffect(() => {
    if (!roomId) return;

    let mounted = true;

    const setup = async () => {
      try {
        setConnectionState('connecting');

        // Step 1: Get local media
        await initializeMedia();

        if (!mounted) return;

        // Step 2: Connect to signaling server
        const socket = io(SIGNALING_SERVER, {
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('🔗 Connected to signaling server:', socket.id);
          // Step 3: Join the room
          socket.emit('join-room', roomId);
        });

        // Room is full (already 2 participants)
        socket.on('room-full', () => {
          setRoomFull(true);
          setError('This room is full. Only 2 participants are allowed.');
          setConnectionState('failed');
        });

        /**
         * A new user joined the room — we are the CALLER
         * Create an offer and send it to them
         */
        socket.on('user-joined', async ({ userId }) => {
          console.log('👤 User joined:', userId);
          setRemoteUserId(userId);

          const pc = createPeerConnection(userId);

          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('offer', {
              offer: pc.localDescription,
              to: userId,
            });
            console.log('📤 Sent offer to:', userId);
          } catch (err) {
            console.error('❌ Error creating offer:', err);
            setError('Failed to create connection offer.');
          }
        });

        /**
         * Received an offer — we are the CALLEE
         * Set remote description, create answer, and send it back
         */
        socket.on('offer', async ({ offer, from }) => {
          console.log('📥 Received offer from:', from);
          setRemoteUserId(from);

          const pc = createPeerConnection(from);

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('answer', {
              answer: pc.localDescription,
              to: from,
            });
            console.log('📤 Sent answer to:', from);

            // Process any candidates that arrived early
            await processPendingCandidates();
          } catch (err) {
            console.error('❌ Error handling offer:', err);
            setError('Failed to establish connection.');
          }
        });

        /**
         * Received an answer to our offer
         * Complete the handshake by setting remote description
         */
        socket.on('answer', async ({ answer, from }) => {
          console.log('📥 Received answer from:', from);
          const pc = peerConnectionRef.current;

          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              // Process any candidates that arrived early
              await processPendingCandidates();
            } catch (err) {
              console.error('❌ Error setting remote description:', err);
            }
          }
        });

        /**
         * Received an ICE candidate from remote peer
         * Add it to the peer connection for NAT traversal
         */
        socket.on('ice-candidate', async ({ candidate, from }) => {
          const pc = peerConnectionRef.current;

          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn('⚠️ Failed to add ICE candidate:', err);
            }
          } else {
            // Queue candidates received before remote description is set
            pendingCandidatesRef.current.push(candidate);
          }
        });

        /**
         * Remote user left the room
         * Clean up peer connection and remote stream
         */
        socket.on('user-left', ({ userId }) => {
          console.log('👋 User left:', userId);
          setRemoteUserId(null);

          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }

          setRemoteStream(null);
          setConnectionState('idle');
        });

        socket.on('connect_error', (err) => {
          console.error('❌ Socket connection error:', err);
          setError('Cannot connect to signaling server. Make sure the server is running on port 5000.');
          setConnectionState('failed');
        });

      } catch (err) {
        console.error('❌ Setup failed:', err);
      }
    };

    setup();

    // Cleanup on unmount
    return () => {
      mounted = false;

      // Stop all local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, initializeMedia, createPeerConnection, processPendingCandidates]);

  /**
   * Toggle microphone on/off
   */
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, []);

  /**
   * Toggle camera on/off
   */
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  /**
   * Leave the call and clean up all resources
   */
  const leaveCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('idle');
  }, []);

  return {
    localStream,
    remoteStream,
    isMicOn,
    isCameraOn,
    connectionState,
    error,
    roomFull,
    remoteUserId,
    toggleMic,
    toggleCamera,
    leaveCall,
  };
}
