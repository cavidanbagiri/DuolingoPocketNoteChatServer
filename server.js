

// server.js - UPDATED VERSION WITH PROPER AUTH
const express = require('express');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');

const onlineStatusService = require('./services/OnlineStatusService');

const cors = require('cors');
require('dotenv').config();

// Import the proper middleware
const socketAuth = require('./middleware/socketAuth');
const chatHandler = require('./sockets/chatHandler');

const app = express();
const server = http.createServer(app);

// Socket.io configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Apply socket authentication middleware
io.use(socketAuth);

// Test endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'Chat Server API',
    endpoints: {
      health: '/health',
      socketTest: '/socket-test'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'chat-server',
    timestamp: new Date().toISOString(),
    socket_connections: io.engine.clientsCount || 0
  });
});

app.get('/socket-test', (req, res) => {
  const clients = Array.from(io.sockets.sockets.keys());

  res.json({
    server: 'WebSocket Server',
    status: 'running',
    connected_clients: clients.length,
    client_ids: clients,
    note: 'Requires JWT token from FastAPI backend'
  });
});

// Add this to your server.js (not chatHandler.js)
app.post('/conversation-created', (req, res) => {
  try {
    const { conversationId, participantIds } = req.body;


    // Auto-join all online participants to the new conversation room
    participantIds.forEach(participantId => {
      const userSockets = Array.from(io.sockets.sockets.values()).filter(
        s => s.user?.id === participantId
      );

      userSockets.forEach(userSocket => {
        userSocket.join(`conversation_${conversationId}`);
        console.log(`✅ Auto-joined user ${participantId} to conversation ${conversationId}`);

        // Notify user about the new conversation
        userSocket.emit('conversation_joined', {
          conversationId,
          message: 'You were added to a new conversation'
        });
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error handling conversation_created:', error);
    res.status(500).json({ error: error.message });
  }
});

// **** New Added - Limit socket connections
const socketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 connection attempts per 15min
  message: 'Too many connection attempts'
});

// **** New Added -  New added
app.use('/socket-test', socketLimiter);

// **** New Added - 
app.get('/metrics', (req, res) => {
  // const onlineUsers = Array.from(onlineUsers.keys());
  const onlineUsers = onlineStatusService.getOnlineUsers(); // or similar

  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: io.engine.clientsCount,
    onlineUsers: onlineUsers.length,
    userList: onlineUsers
  });
});


// ========== IMPORTANT: Apply socket authentication middleware ==========
io.use(socketAuth);


// Socket.io connection handler - UPDATE THIS SECTION
io.on('connection', (socket) => {
  const userId = socket.user?.id;
  
  if (userId) {
    // Track user as online
    const becameOnline = onlineStatusService.userConnected(userId, socket.id);
    
    console.log(`🔗 User ${socket.user.username} (ID: ${userId}) connected`);
    console.log(`   Total online users: ${onlineStatusService.getOnlineCount()}`);
    
    // 🔥 STEP 1: Send initial online users to the newly connected user
    sendInitialOnlineStatusToUser(socket, userId);
    
    // 🔥 STEP 2: Notify ALL other users that this user came online
    if (becameOnline) {
      notifyFriendsOnlineStatus(userId, true);
    }
  }

  // Initialize chat handler
  chatHandler(io, socket);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    if (userId) {
      const becameOffline = onlineStatusService.userDisconnected(userId, socket.id);
      
      if (becameOffline) {
        // Notify friends that user went offline
        notifyFriendsOnlineStatus(userId, false);
      }
      
      console.log(`👋 User ${socket.user?.username} (ID: ${userId}) disconnected`);
      console.log(`   Remaining online users: ${onlineStatusService.getOnlineCount()}`);
    }
  });
});




// server.js - Update the notifyFriendsOnlineStatus function
function notifyFriendsOnlineStatus(userId, isOnline) {
  try {
    console.log(`📢 User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
    
    // 🔥 BROADCAST to ALL connected users (for now)
    // Later you can filter to only friends if you want
    io.emit('user_status_changed', {
      userId: userId,
      isOnline: isOnline,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Broadcasted status change for user ${userId}`);
  } catch (error) {
    console.error('❌ Error broadcasting online status:', error);
  }
}





// Also add this endpoint to get user status
app.get('/user-status/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const isOnline = onlineStatusService.isUserOnline(userId);
  const lastSeen = onlineStatusService.getUserLastSeen(userId);

  res.json({
    userId,
    isOnline,
    lastSeen,
    socketCount: onlineStatusService.getUserSockets(userId).length
  });
});


// Add monitoring endpoint
app.get('/online-users', (req, res) => {
  res.json(onlineStatusService.getStats());
});

app.get('/online-users/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  res.json({
    userId,
    isOnline: onlineStatusService.isUserOnline(userId),
    lastSeen: onlineStatusService.getUserLastSeen(userId),
    sockets: onlineStatusService.getUserSockets(userId)
  });
});

// server.js - Add this helper function
function sendInitialOnlineStatusToUser(socket, userId) {
  try {
    const onlineUsers = onlineStatusService.getOnlineUsers();
    
    console.log(`📊 Sending initial online status to user ${userId}`);
    console.log(`   Online users: ${onlineUsers.join(', ')}`);
    
    // Send each online user's status (except their own)
    onlineUsers.forEach(onlineUserId => {
      if (onlineUserId !== userId) {
        socket.emit('user_status_changed', {
          userId: onlineUserId,
          isOnline: true,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    console.log(`✅ Sent ${onlineUsers.length - 1} initial online statuses`);
  } catch (error) {
    console.error('❌ Error sending initial online status:', error);
  }
}


// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 CHAT SERVER STARTED`);
  console.log('='.repeat(50));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 HTTP: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`🔒 Authentication: JWT from FastAPI required`);
  console.log('='.repeat(50));
  console.log('\n📋 Test Endpoints:');
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   Socket Info:  http://localhost:${PORT}/socket-test`);
  console.log('\n🔑 Note:');
  console.log('   Use JWT token from FastAPI login');
  console.log('   Socket.io will verify it using same secret');
  console.log('='.repeat(50) + '\n');
});


