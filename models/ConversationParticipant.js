// models/ConversationParticipant.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConversationParticipant extends Model {
    static associate(models) {
      ConversationParticipant.belongsTo(models.Conversation, {
        foreignKey: 'conversation_id',
        as: 'conversation'
      });
      ConversationParticipant.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      ConversationParticipant.belongsTo(models.Message, {
        foreignKey: 'last_read_message_id',
        as: 'last_read_message'
      });
    }
  }
  
  ConversationParticipant.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    left_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_muted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    last_read_message_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'ConversationParticipant',
    tableName: 'conversation_participants',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['conversation_id', 'user_id']
      }
    ]
  });
  
  return ConversationParticipant;
};