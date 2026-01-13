// sockets/chatHandler.js
const db = require('../models');

const onlineStatusService = require('../services/OnlineStatusService');

const chatHandler = (io, socket) => {
  console.log(`User ${socket.user.username} connected with socket ID: ${socket.id}`);

  // Store user's socket ID for reference
  const userId = socket.user.id;


  // Send current online status to user
  socket.emit('online_status_update', {
    userId,
    isOnline: true,
    onlineFriends: [] // You'll populate this with actual friends
  });

  // When user asks for someone's status
  socket.on('check_user_status', (data) => {
    const { targetUserId } = data;
    const isOnline = onlineStatusService.isUserOnline(targetUserId);
    const lastSeen = onlineStatusService.getUserLastSeen(targetUserId);

    socket.emit('user_status_response', {
      userId: targetUserId,
      isOnline,
      lastSeen
    });
  });


  // Join user to their personal room for private notifications
  socket.join(`user_${userId}`);


  // ==================== FRIEND REQUESTS ====================

  socket.on('send_friend_request', async (data) => {
    try {
      const { receiverId } = data;

      // Check if request already exists
      const existingRequest = await db.FriendshipRequest.findOne({
        where: {
          sender_id: userId,
          receiver_id: receiverId,
          status: 'pending'
        }
      });

      if (existingRequest) {
        socket.emit('error', { message: 'Friend request already sent' });
        return;
      }

      // Check if already friends
      const existingFriendship = await db.sequelize.query(
        `SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
        {
          replacements: [userId, receiverId, receiverId, userId],
          type: db.Sequelize.QueryTypes.SELECT
        }
      );

      if (existingFriendship.length > 0) {
        socket.emit('error', { message: 'Already friends' });
        return;
      }

      // Create friend request
      const friendRequest = await db.FriendshipRequest.create({
        sender_id: userId,
        receiver_id: receiverId,
        status: 'pending'
      });

      // Get sender info for notification
      const sender = await db.User.findByPk(userId, {
        include: [{ model: db.UserProfile, as: 'profile' }]
      });

      // Notify receiver
      io.to(`user_${receiverId}`).emit('friend_request_received', {
        requestId: friendRequest.id,
        sender: {
          id: sender.id,
          username: sender.username,
          profile: sender.profile
        },
        createdAt: friendRequest.created_at
      });

      // Confirm to sender
      socket.emit('friend_request_sent', {
        requestId: friendRequest.id,
        receiverId: receiverId,
        status: 'sent'
      });

    } catch (error) {
      console.error('Send friend request error:', error);
      socket.emit('error', { message: 'Failed to send friend request' });
    }
  });

  // ==================== MESSAGING ====================



  // CORRECT ORDER - FIXED
socket.on('send_message', async (data) => {
  try {
    const { conversationId, content, messageType = 'text' } = data;
    
    console.log('💬 User sending message to conversation:', conversationId);
    
    // 1. Save message to DB
    const message = await db.Message.create({
      conversation_id: conversationId,
      sender_id: userId,
      content,
      message_type: messageType,
      created_at: new Date()
    });
    
    console.log('💾 Message saved to DB, ID:', message.id);
    
    // 2. Get all participants
    const participants = await db.ConversationParticipant.findAll({
      where: { conversation_id: conversationId }
    });
    
    console.log(`👥 Found ${participants.length} participants`);
    
    // 3. Get message with sender info
    const messageWithSender = await db.Message.findByPk(message.id, {
      include: [{
        model: db.User,
        as: 'sender',
        include: [{ model: db.UserProfile, as: 'profile' }]
      }]
    });
    
    // 4. FORCE JOIN all participants to room
    participants.forEach(participant => {
      // Find all sockets for this user
      const userSockets = Array.from(io.sockets.sockets.values()).filter(
        s => s.user?.id === participant.user_id
      );
      
      userSockets.forEach(userSocket => {
        const roomName = `conversation_${conversationId}`;
        if (!userSocket.rooms.has(roomName)) {
          userSocket.join(roomName);
          console.log(`✅ Auto-joined user ${participant.user_id} to ${roomName}`);
        }
      });
    });
    
    // 5. Check room members
    const roomMembers = io.sockets.adapter.rooms.get(`conversation_${conversationId}`);
    console.log('👥 Room members before broadcast:', roomMembers);
    
    // 6. Broadcast to room
    io.to(`conversation_${conversationId}`).emit('new_message', {
      conversationId,
      message: messageWithSender
    });
    
    console.log(`📤 Message broadcast to conversation ${conversationId}`);
    
  } catch (error) {
    console.error('Send message error:', error);
  }
});



  // Join a conversation
  socket.on('join_conversation', async (data) => {
    try {
      const { conversationId } = data;

      // Verify user is a participant
      const participant = await db.ConversationParticipant.findOne({
        where: {
          conversation_id: conversationId,
          user_id: userId
        }
      });

      if (!participant) {
        socket.emit('error', { message: 'Not a participant in this conversation' });
        return;
      }

      // Join the conversation room
      socket.join(`conversation_${conversationId}`);

      // Update last read message
      const lastMessage = await db.Message.findOne({
        where: { conversation_id: conversationId },
        order: [['created_at', 'DESC']]
      });

      if (lastMessage) {
        await db.ConversationParticipant.update(
          { last_read_message_id: lastMessage.id },
          { where: { id: participant.id } }
        );
      }

      console.log(`User ${socket.user.username} joined conversation ${conversationId}`);

    } catch (error) {
      console.error('Join conversation error:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  // Send message
  // socket.on('send_message', async (data) => {
  //   try {
  //     const { conversationId, content, messageType = 'text', replyToId = null } = data;

  //     // Verify user can send to this conversation
  //     const participant = await db.ConversationParticipant.findOne({
  //       where: {
  //         conversation_id: conversationId,
  //         user_id: userId
  //       }
  //     });

  //     if (!participant) {
  //       socket.emit('error', { message: 'Not a participant in this conversation' });
  //       return;
  //     }

  //     // Create message
  //     const message = await db.Message.create({
  //       conversation_id: conversationId,
  //       sender_id: userId,
  //       content,
  //       message_type: messageType,
  //       reply_to_message_id: replyToId,
  //       created_at: new Date(),
  //       updated_at: new Date()
  //     });

  //     // Get message with sender info
  //     const messageWithSender = await db.Message.findByPk(message.id, {
  //       include: [
  //         {
  //           model: db.User,
  //           as: 'sender',
  //           include: [{ model: db.UserProfile, as: 'profile' }]
  //         },
  //         {
  //           model: db.Message,
  //           as: 'reply_to',
  //           include: [
  //             {
  //               model: db.User,
  //               as: 'sender',
  //               attributes: ['id', 'username']
  //             }
  //           ]
  //         }
  //       ]
  //     });

  //     // Create initial message statuses for all participants
  //     const participants = await db.ConversationParticipant.findAll({
  //       where: { conversation_id: conversationId },
  //       attributes: ['user_id']
  //     });

  //     const statusPromises = participants.map(participant => {
  //       return db.MessageStatus.create({
  //         message_id: message.id,
  //         user_id: participant.user_id,
  //         status: participant.user_id === userId ? 'sent' : 'sent'
  //       });
  //     });

  //     await Promise.all(statusPromises);

  //     // Broadcast to conversation room
  //     io.to(`conversation_${conversationId}`).emit('new_message', {
  //       message: messageWithSender,
  //       conversationId
  //     });

  //     // Update conversation updated_at
  //     await db.Conversation.update(
  //       { updated_at: new Date() },
  //       { where: { id: conversationId } }
  //     );

  //   } catch (error) {
  //     console.error('Send message error:', error);
  //     socket.emit('error', { message: 'Failed to send message' });
  //   }
  // });

  // Typing indicator







  // In send_message handler:
  // socket.on('send_message', async (data) => {
  //   try {
  //     const { conversationId, content, messageType = 'text', replyToId = null } = data;

  //     // Save message to database
  //     const message = await db.Message.create({
  //       conversation_id: conversationId,
  //       sender_id: userId,
  //       content,
  //       message_type: messageType,
  //       reply_to_message_id: replyToId,
  //       created_at: new Date(),
  //       updated_at: new Date()
  //     });

  //     // Get message with sender info
  //     const messageWithSender = await db.Message.findByPk(message.id, {
  //       include: [
  //         {
  //           model: db.User,
  //           as: 'sender',
  //           include: [{ model: db.UserProfile, as: 'profile' }]
  //         }
  //       ]
  //     });

  //     // Create message statuses for participants
  //     const participants = await db.ConversationParticipant.findAll({
  //       where: { conversation_id: conversationId }
  //     });

  //     await Promise.all(
  //       participants.map(p =>
  //         db.MessageStatus.create({
  //           message_id: message.id,
  //           user_id: p.user_id,
  //           status: p.user_id === userId ? 'sent' : 'sent'
  //         })
  //       )
  //     );

  //     // Update conversation timestamp
  //     await db.Conversation.update(
  //       { updated_at: new Date() },
  //       { where: { id: conversationId } }
  //     );

  //     // Broadcast
  //     io.to(`conversation_${conversationId}`).emit('new_message', {
  //       message: messageWithSender,
  //       conversationId
  //     });

  //   } catch (error) {
  //     console.error('Send message error:', error);
  //   }
  // });

  socket.on('typing', async (data) => {
    try {
      const { conversationId, isTyping } = data;

      // Update typing indicator
      await db.TypingIndicator.upsert({
        conversation_id: conversationId,
        user_id: userId,
        is_typing: isTyping,
        last_updated: new Date()
      });

      // Broadcast to conversation (except sender)
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId,
        conversationId,
        isTyping,
        username: socket.user.username
      });

    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  });

  // Mark message as read
  socket.on('mark_as_read', async (data) => {
    try {
      const { messageId, conversationId } = data;

      // Update message status
      await db.MessageStatus.update(
        { status: 'read', read_at: new Date() },
        {
          where: {
            message_id: messageId,
            user_id: userId
          }
        }
      );

      // Update participant's last read message
      await db.ConversationParticipant.update(
        { last_read_message_id: messageId },
        {
          where: {
            conversation_id: conversationId,
            user_id: userId
          }
        }
      );

      // Notify sender that message was read
      const message = await db.Message.findByPk(messageId);
      if (message && message.sender_id !== userId) {
        io.to(`user_${message.sender_id}`).emit('message_read', {
          messageId,
          conversationId,
          readerId: userId,
          readAt: new Date()
        });
      }

    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });

  // ==================== DISCONNECT ====================

  socket.on('disconnect', async () => {
    console.log(`User ${socket.user?.username} disconnected`);

    // Clean up typing indicators
    if (userId) {
      await db.TypingIndicator.update(
        { is_typing: false },
        { where: { user_id: userId } }
      );
    }
  });

};

module.exports = chatHandler;