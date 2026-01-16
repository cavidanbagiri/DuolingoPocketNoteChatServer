// sockets/chatHandler.js
const db = require('../models');

const onlineStatusService = require('../services/OnlineStatusService');

const chatHandler = (io, socket) => {
  console.log(`User ${socket.user.username} connected with socket ID: ${socket.id}`);

  // Store user's socket ID for reference
  const userId = socket.user.id;

  // 🔥 AUTO-JOIN ALL USER'S CONVERSATIONS ---------------------------------------------------- New Added - Auto-join all conversations
  joinUserToAllConversations(socket, userId);


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

  // ------------------------------ New Added ------------------------------
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content, messageType = 'text' } = data;

      console.log(`💬 Message from user ${userId} to conversation ${conversationId}`);

      // Verify user is participant
      const participant = await db.ConversationParticipant.findOne({
        where: {
          conversation_id: conversationId,
          user_id: userId,
          left_at: null
        }
      });

      if (!participant) {
        socket.emit('error', { message: 'Not a participant in this conversation' });
        return;
      }

      // 🔥 CHECK IF THIS IS THE FIRST MESSAGE
      const existingMessagesCount = await db.Message.count({
        where: { conversation_id: conversationId }
      });

      const isFirstMessage = existingMessagesCount === 0;

      console.log(`📊 Message count: ${existingMessagesCount}, First message: ${isFirstMessage}`);

      // 🔥 ENSURE SENDER IS IN THE ROOM (important for first message)
      socket.join(`conversation_${conversationId}`);

      // Save message to database
      const message = await db.Message.create({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        message_type: messageType
      });

      // Get message with sender info
      const messageWithSender = await db.Message.findByPk(message.id, {
        include: [{
          model: db.User,
          as: 'sender',
          attributes: ['id', 'username'],
          include: [{
            model: db.UserProfile,
            as: 'profile',
            attributes: ['profile_image_url', 'first_name', 'last_name', 'bio']
          }]
        }]
      });

      // Update conversation timestamp
      await db.Conversation.update(
        { updated_at: new Date() },
        { where: { id: conversationId } }
      );

      // 🔥 IF FIRST MESSAGE: Notify other participants
      if (isFirstMessage) {
        console.log('🆕 FIRST MESSAGE - Broadcasting new conversation to participants');

        const allParticipants = await db.ConversationParticipant.findAll({
          where: {
            conversation_id: conversationId,
            user_id: { [db.Sequelize.Op.ne]: userId }
          }
        });

        allParticipants.forEach(participant => {
          const userSockets = Array.from(io.sockets.sockets.values()).filter(
            s => s.user?.id === participant.user_id
          );

          userSockets.forEach(userSocket => {
            userSocket.join(`conversation_${conversationId}`);
            console.log(`✅ Auto-joined user ${participant.user_id} to conversation ${conversationId}`);

            // 🔥 Send ONLY new_conversation_with_message (not regular new_message)
            userSocket.emit('new_conversation_with_message', {
              conversationId,
              message: messageWithSender
            });
          });
        });
      } else {
        // 🔥 REGULAR MESSAGE: Broadcast to conversation room
        io.to(`conversation_${conversationId}`).emit('new_message', {
          conversationId,
          message: messageWithSender
        });
      }

      console.log(`📤 Message ${message.id} broadcast to conversation ${conversationId}`);

    } catch (error) {
      console.error('❌ Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ------------------------------ New Added ------------------------------
  // Add this new event handler in chatHandler.js
  socket.on('conversation_created', async (data) => {
    try {
      const { conversationId, participantIds } = data;

      console.log(`🆕 New conversation ${conversationId} created with participants:`, participantIds);

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

    } catch (error) {
      console.error('❌ Error handling conversation_created:', error);
    }
  });


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


// ------------------------------ New Added ------------------------------
// Add this helper function
const joinUserToAllConversations = async (socket, userId) => {
  try {
    // Get all conversations user participates in
    const participations = await db.ConversationParticipant.findAll({
      where: {
        user_id: userId,
        left_at: null // Only active participations
      },
      include: [{
        model: db.Conversation,
        as: 'conversation'
      }]
    });

    console.log(`🏠 Auto-joining user ${userId} to ${participations.length} conversations`);

    // Join each conversation room
    participations.forEach(participation => {
      const roomName = `conversation_${participation.conversation_id}`;
      socket.join(roomName);
      console.log(`   ✅ Joined room: ${roomName}`);
    });

    // Send conversation list to user
    socket.emit('conversations_joined', {
      conversations: participations.map(p => ({
        id: p.conversation_id,
        isGroup: p.conversation.is_group,
        groupName: p.conversation.group_name,
        lastRead: p.last_read_message_id
      }))
    });

  } catch (error) {
    console.error('❌ Error joining conversations:', error);
  }
};

module.exports = chatHandler;