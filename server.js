

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
  const onlineUsers = Array.from(onlineUsers.keys());
  
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


// Socket.io connection handler
io.on('connection', (socket) => {
  const userId = socket.user?.id;
  
  if (userId) {
    // Track user as online
    const becameOnline = onlineStatusService.userConnected(userId, socket.id);
    
    if (becameOnline) {
      // Notify friends that user came online
      notifyFriendsOnlineStatus(userId, true);
    }
    
    console.log(`🔗 User ${socket.user.username} (ID: ${userId}) connected`);
    console.log(`   Total online users: ${onlineStatusService.getOnlineCount()}`);
  }






  
  // Initialize chat handler
  chatHandler(io, socket);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    if (userId) {
      // Track user as offline (if no more sockets)
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

// Helper function to notify friends (you'll implement this later)
function notifyFriendsOnlineStatus(userId, isOnline) {
  // Get user's friends from database
  // For each friend who is online, send WebSocket event
  console.log(`📢 User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
}

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








// // server.js - COMPLETE WORKING VERSION
// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// const server = http.createServer(app);

// // Socket.io with minimal config
// const io = socketIo(server, {
//   cors: {
//     origin: "*", // Allow all for testing
//     methods: ["GET", "POST"]
//   }
// });

// // Enable CORS for all routes
// app.use(cors());

// // Simple JSON parser
// app.use(express.json());

// // ========== TEMPORARY: SIMPLE AUTH MIDDLEWARE ==========
// io.use((socket, next) => {
//   console.log('🔧 Socket connection attempt...');
  
//   // Get token from query
//   const token = socket.handshake.query.token;
//   console.log('Token received:', token ? 'Yes' : 'No');
  
//   if (token) {
//     try {
//       // Simple token verification - just check if it exists
//       console.log('Token value:', token.substring(0, 20) + '...');
      
//       // For testing, accept any token
//       socket.user = {
//         id: 1,
//         username: 'test_user',
//         email: 'test@example.com'
//       };
      
//       console.log('✅ Authentication passed for test user');
//       return next();
//     } catch (error) {
//       console.log('❌ Token error:', error.message);
//     }
//   }
  
//   // Still allow connection even without token for testing
//   console.log('⚠️  No token provided, but allowing connection for testing');
//   socket.user = {
//     id: 0,
//     username: 'guest',
//     email: 'guest@example.com'
//   };
//   next();
// });

// // ========== TEST ENDPOINTS ==========
// app.get('/', (req, res) => {
//   res.json({
//     message: 'Chat Server',
//     endpoints: {
//       test_token: '/test-token',
//       health: '/health',
//       ws_test: '/ws-test'
//     }
//   });
// });

// app.get('/health', (req, res) => {
//   res.json({
//     status: 'ok',
//     timestamp: new Date().toISOString(),
//     socket_connections: io.engine.clientsCount || 0
//   });
// });

// const jwt = require('jsonwebtoken');

// app.get('/test-token', (req, res) => {
//   const token = jwt.sign(
//     { userId: 1, username: 'test_user' },
//     process.env.JWT_SECRET || 'test_secret',
//     { expiresIn: '1h' }
//   );
  
//   res.json({
//     success: true,
//     token: token,
//     connection_url: `ws://localhost:4000?token=${token}`,
//     instructions: 'Copy the connection_url and use it in Postman or wscat'
//   });
// });

// app.get('/ws-test', (req, res) => {
//   const clients = Array.from(io.sockets.sockets.keys());
  
//   res.json({
//     server: 'WebSocket Server',
//     status: 'running',
//     connected_clients: clients.length,
//     client_ids: clients
//   });
// });

// // ========== SIMPLE SOCKET HANDLER ==========
// io.on('connection', (socket) => {
//   console.log('\n' + '='.repeat(40));
//   console.log(`🎉 NEW CONNECTION: ${socket.id}`);
//   console.log(`   User: ${socket.user?.username || 'Unknown'}`);
//   console.log(`   Time: ${new Date().toISOString()}`);
//   console.log('='.repeat(40) + '\n');
  
//   // Send welcome message
//   socket.emit('welcome', {
//     message: 'Connected to chat server!',
//     socketId: socket.id,
//     user: socket.user,
//     serverTime: new Date().toISOString()
//   });
  
//   // Handle test message
//   socket.on('test', (data) => {
//     console.log('📩 Test message received:', data);
//     socket.emit('test_response', {
//       received: data,
//       response: 'Server received your message!',
//       timestamp: new Date().toISOString()
//     });
//   });
  
//   // Handle echo
//   socket.on('echo', (data) => {
//     console.log('🔁 Echo received:', data);
//     socket.emit('echo_response', data);
//   });
  
//   // Handle join conversation
//   socket.on('join_conversation', (data) => {
//     console.log('👥 Join conversation:', data);
    
//     if (data.conversationId) {
//       socket.join(`room_${data.conversationId}`);
//       socket.emit('joined_conversation', {
//         conversationId: data.conversationId,
//         message: `Joined conversation ${data.conversationId}`
//       });
//     }
//   });
  
//   // Handle message
//   socket.on('send_message', (data) => {
//     console.log('💬 Message received:', data);
    
//     // Broadcast to room
//     if (data.conversationId) {
//       socket.to(`room_${data.conversationId}`).emit('new_message', {
//         ...data,
//         sender: socket.user,
//         timestamp: new Date().toISOString()
//       });
      
//       socket.emit('message_sent', {
//         message: 'Message sent successfully',
//         conversationId: data.conversationId
//       });
//     }
//   });
  
//   // Handle typing
//   socket.on('typing', (data) => {
//     console.log('⌨️  Typing:', data);
    
//     if (data.conversationId) {
//       socket.to(`room_${data.conversationId}`).emit('user_typing', {
//         userId: socket.user.id,
//         username: socket.user.username,
//         isTyping: data.isTyping,
//         conversationId: data.conversationId
//       });
//     }
//   });
  
//   // Handle disconnect
//   socket.on('disconnect', () => {
//     console.log(`👋 Disconnected: ${socket.id} (${socket.user?.username})`);
//   });
// });

// // ========== START SERVER ==========
// const PORT = process.env.PORT || 4000;
// server.listen(PORT, () => {
//   console.log('\n' + '🚀'.repeat(20));
//   console.log('   CHAT SERVER STARTED');
//   console.log('🚀'.repeat(20));
//   console.log(`📡 Port: ${PORT}`);
//   console.log(`🌐 HTTP: http://localhost:${PORT}`);
//   console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
//   console.log('🚀'.repeat(20));
  
//   console.log('\n📋 Test URLs:');
//   console.log(`   1. Get Token:   http://localhost:${PORT}/test-token`);
//   console.log(`   2. Health Check: http://localhost:${PORT}/health`);
//   console.log(`   3. WS Status:   http://localhost:${PORT}/ws-test`);
  
//   console.log('\n🔧 Quick Test:');
//   console.log('   curl http://localhost:4000/test-token');
//   console.log('   Then use the connection_url in Postman');
//   console.log('🚀'.repeat(20) + '\n');
// });