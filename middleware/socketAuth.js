// middleware/socketAuth.js - MUST BE THIS VERSION
const jwt = require('jsonwebtoken');
const db = require('../models');

const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake or query
    const token = socket.handshake.auth?.token || 
                  socket.handshake.query?.token;
    
    console.log('🔧 Socket connection attempt...');
    console.log('Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('❌ No token provided');
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Use FastAPI's JWT_SECRET_KEY
    const JWT_SECRET_KEY = process.env.JWT_SECRET;
    const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
    
    if (!JWT_SECRET_KEY) {
      console.error('❌ JWT_SECRET_KEY not set in .env');
      return next(new Error('Server configuration error'));
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET_KEY, { algorithms: [JWT_ALGORITHM] });
    
    // Get user ID from 'sub' field
    const userId = decoded.sub;
    
    if (!userId) {
      console.log('❌ No user ID (sub) in token');
      return next(new Error('Authentication error: Invalid token structure'));
    }
    
    // Find user in database
    const user = await db.User.findByPk(userId, {
      include: [{
        model: db.UserProfile,
        as: 'profile'
      }]
    });
    
    if (!user) {
      console.log(`❌ User not found in database for ID: ${userId}`);
      return next(new Error('Authentication error: User not found'));
    }
    
    // Attach user to socket
    socket.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      profile: user.profile || null
    };
    
    console.log(`✅ User authenticated: ${user.username} (ID: ${user.id})`);
    next();
    
  } catch (error) {
    console.error('❌ Socket auth error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      next(new Error('Authentication error: Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new Error('Authentication error: Token expired'));
    } else {
      next(new Error('Authentication error: ' + error.message));
    }
  }
};

module.exports = socketAuth;