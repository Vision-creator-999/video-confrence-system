/**
 * MeetUp - Signaling Server
 * 
 * This Express + Socket.IO server handles WebRTC signaling:
 * - Room management (join/leave)
 * - Forwarding SDP offers and answers between peers
 * - Relaying ICE candidates for NAT traversal
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Configure Socket.IO with CORS for the React dev server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Track rooms and their participants
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  /**
   * Handle room joining
   * - Adds the user to the specified room
   * - Notifies existing participants about the new user
   */
  socket.on('join-room', (roomId) => {
    // Get or create room participant list
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    const room = rooms.get(roomId);

    // Limit to 2 participants for 1-to-1 calls
    if (room.size >= 2) {
      socket.emit('room-full');
      console.log(`🚫 Room ${roomId} is full. Rejecting ${socket.id}`);
      return;
    }

    // Join the Socket.IO room
    socket.join(roomId);
    room.add(socket.id);
    socket.roomId = roomId;

    console.log(`📌 ${socket.id} joined room: ${roomId} (${room.size} participants)`);

    // Notify other participants that a new user has joined
    socket.to(roomId).emit('user-joined', { userId: socket.id });
  });

  /**
   * Forward WebRTC offer to the target peer
   */
  socket.on('offer', ({ offer, to }) => {
    console.log(`📤 Offer from ${socket.id} to ${to}`);
    io.to(to).emit('offer', { offer, from: socket.id });
  });

  /**
   * Forward WebRTC answer to the target peer
   */
  socket.on('answer', ({ answer, to }) => {
    console.log(`📥 Answer from ${socket.id} to ${to}`);
    io.to(to).emit('answer', { answer, from: socket.id });
  });

  /**
   * Relay ICE candidates between peers for NAT traversal
   */
  socket.on('ice-candidate', ({ candidate, to }) => {
    io.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  /**
   * Handle user disconnection
   * - Remove from room tracking
   * - Notify remaining participants
   */
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);

    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(socket.roomId);
        }
      }
      // Notify others in the room
      socket.to(socket.roomId).emit('user-left', { userId: socket.id });
    }
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'MeetUp Signaling Server is running 🚀' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 MeetUp Signaling Server running on http://localhost:${PORT}\n`);
});
