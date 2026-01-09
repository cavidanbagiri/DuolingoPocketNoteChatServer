// models/Conversation.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Conversation extends Model {
    static associate(models) {
      Conversation.hasMany(models.ConversationParticipant, {
        foreignKey: 'conversation_id',
        as: 'participants'
      });
      Conversation.hasMany(models.Message, {
        foreignKey: 'conversation_id',
        as: 'messages'
      });
      Conversation.hasMany(models.TypingIndicator, {
        foreignKey: 'conversation_id',
        as: 'typing_indicators'
      });
    }
  }
  
  Conversation.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    is_group: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    group_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    group_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Conversation',
    tableName: 'conversations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });
  
  return Conversation;
};