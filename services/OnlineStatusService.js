// services/OnlineStatusService.js
class OnlineStatusService {
  constructor() {
    this.onlineUsers = new Map(); // userId -> Set of socketIds
    this.userLastSeen = new Map(); // userId -> lastSeen timestamp
  }
  
  /**
   * Add user to online status
   * @param {number} userId - User ID
   * @param {string} socketId - Socket.io socket ID
   * @returns {boolean} - True if user was offline, false if already online
   */
  userConnected(userId, socketId) {
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, new Set());
    }
    
    const sockets = this.onlineUsers.get(userId);
    const wasOffline = sockets.size === 0;
    
    sockets.add(socketId);
    
    // Update last seen to now (user is online)
    this.userLastSeen.set(userId, Date.now());
    
    console.log(`✅ User ${userId} connected. Socket: ${socketId}`);
    console.log(`   Total sockets for user: ${sockets.size}`);
    
    return wasOffline;
  }
  
  /**
   * Remove user from online status
   * @param {number} userId - User ID
   * @param {string} socketId - Socket.io socket ID
   * @returns {boolean} - True if user is now offline, false if still has other connections
   */
  userDisconnected(userId, socketId) {
    if (!this.onlineUsers.has(userId)) {
      console.log(`⚠️  User ${userId} not found in online users`);
      return false;
    }
    
    const sockets = this.onlineUsers.get(userId);
    sockets.delete(socketId);
    
    console.log(`🔌 User ${userId} disconnected. Socket: ${socketId}`);
    console.log(`   Remaining sockets: ${sockets.size}`);
    
    // If no more sockets, user is offline
    if (sockets.size === 0) {
      this.onlineUsers.delete(userId);
      this.userLastSeen.set(userId, Date.now()); // Update last seen to now
      console.log(`👋 User ${userId} is now offline`);
      return true; // User is now offline
    }
    
    return false; // User still has other connections
  }
  
  /**
   * Check if user is currently online
   * @param {number} userId - User ID
   * @returns {boolean} - True if online
   */
  isUserOnline(userId) {
    return this.onlineUsers.has(userId) && 
           this.onlineUsers.get(userId).size > 0;
  }
  
  /**
   * Get all online user IDs
   * @returns {number[]} - Array of online user IDs
   */
  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys()).filter(
      userId => this.onlineUsers.get(userId).size > 0
    );
  }
  
  /**
   * Get user's last seen timestamp
   * @param {number} userId - User ID
   * @returns {number|null} - Timestamp in milliseconds or null if never seen
   */
  getUserLastSeen(userId) {
    return this.userLastSeen.get(userId) || null;
  }
  
  /**
   * Get user's active socket IDs
   * @param {number} userId - User ID
   * @returns {string[]} - Array of socket IDs
   */
  getUserSockets(userId) {
    if (!this.onlineUsers.has(userId)) {
      return [];
    }
    return Array.from(this.onlineUsers.get(userId));
  }
  
  /**
   * Get total online users count
   * @returns {number} - Count of online users
   */
  getOnlineCount() {
    return this.getOnlineUsers().length;
  }
  
  /**
   * Force remove user (for admin purposes)
   * @param {number} userId - User ID
   */
  forceUserOffline(userId) {
    if (this.onlineUsers.has(userId)) {
      this.onlineUsers.delete(userId);
      this.userLastSeen.set(userId, Date.now());
      console.log(`🔧 Forcefully set user ${userId} offline`);
    }
  }
  
  /**
   * Cleanup old entries (optional, for memory management)
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 30 days)
   */
  cleanupOldEntries(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    
    for (const [userId, lastSeen] of this.userLastSeen.entries()) {
      if (lastSeen < cutoff && !this.isUserOnline(userId)) {
        this.userLastSeen.delete(userId);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old user entries`);
    }
  }
  
  /**
   * Get statistics
   * @returns {Object} - Service statistics
   */
  getStats() {
    return {
      onlineUsers: this.getOnlineCount(),
      totalTrackedUsers: this.userLastSeen.size,
      onlineUserIds: this.getOnlineUsers(),
      timestamp: Date.now()
    };
  }
  
  /**
   * Print debug info
   */
  printDebug() {
    console.log('\n' + '='.repeat(40));
    console.log('👥 ONLINE STATUS DEBUG INFO');
    console.log('='.repeat(40));
    console.log(`Total online users: ${this.getOnlineCount()}`);
    console.log(`Total tracked users: ${this.userLastSeen.size}`);
    
    console.log('\nOnline users:');
    this.getOnlineUsers().forEach(userId => {
      const sockets = this.getUserSockets(userId);
      const lastSeen = this.getUserLastSeen(userId);
      console.log(`  User ${userId}: ${sockets.length} socket(s)`);
    });
    
    console.log('\nLast seen (offline users):');
    Array.from(this.userLastSeen.entries())
      .filter(([userId]) => !this.isUserOnline(userId))
      .slice(0, 5) // Show only first 5
      .forEach(([userId, lastSeen]) => {
        const timeAgo = Math.floor((Date.now() - lastSeen) / 1000);
        console.log(`  User ${userId}: ${timeAgo}s ago`);
      });
    
    console.log('='.repeat(40) + '\n');
  }
}

// Create singleton instance
const onlineStatusService = new OnlineStatusService();

// Optional: Setup periodic cleanup (every hour)
setInterval(() => {
  onlineStatusService.cleanupOldEntries();
}, 60 * 60 * 1000); // 1 hour

// Export singleton
module.exports = onlineStatusService;