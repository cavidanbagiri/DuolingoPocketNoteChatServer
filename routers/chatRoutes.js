// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../models');

// Get user conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.userId; // Assuming you have auth middleware
    
    const conversations = await db.ConversationParticipant.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.Conversation,
          as: 'conversation',
          include: [
            {
              model: db.ConversationParticipant,
              as: 'participants',
              include: [
                {
                  model: db.User,
                  as: 'user',
                  include: [{ model: db.UserProfile, as: 'profile' }]
                }
              ]
            },
            {
              model: db.Message,
              as: 'messages',
              limit: 1,
              order: [['created_at', 'DESC']],
              include: [
                {
                  model: db.User,
                  as: 'sender',
                  attributes: ['id', 'username']
                }
              ]
            }
          ]
        }
      ],
      order: [[{ model: db.Conversation, as: 'conversation' }, 'updated_at', 'DESC']]
    });
    
    res.json(conversations.map(c => c.conversation));
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get conversation messages
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Verify user is a participant
    const participant = await db.ConversationParticipant.findOne({
      where: {
        conversation_id: id,
        user_id: userId
      }
    });
    
    if (!participant) {
      return res.status(403).json({ error: 'Not a participant' });
    }
    
    const messages = await db.Message.findAll({
      where: { conversation_id: id },
      include: [
        {
          model: db.User,
          as: 'sender',
          include: [{ model: db.UserProfile, as: 'profile' }]
        },
        {
          model: db.Message,
          as: 'reply_to',
          include: [
            {
              model: db.User,
              as: 'sender',
              attributes: ['id', 'username']
            }
          ]
        },
        {
          model: db.MessageStatus,
          as: 'statuses',
          where: { user_id: userId },
          required: false
        }
      ],
      order: [['created_at', 'ASC']],
      limit: 50 // Paginate later
    });
    
    res.json(messages);
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

module.exports = router;