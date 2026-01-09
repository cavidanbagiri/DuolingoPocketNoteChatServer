// models/Message.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.Conversation, {
        foreignKey: 'conversation_id',
        as: 'conversation'
      });
      Message.belongsTo(models.User, {
        foreignKey: 'sender_id',
        as: 'sender'
      });
      Message.belongsTo(models.Message, {
        foreignKey: 'reply_to_message_id',
        as: 'reply_to'
      });
      Message.hasMany(models.Message, {
        foreignKey: 'reply_to_message_id',
        as: 'replies'
      });
      Message.hasMany(models.MessageStatus, {
        foreignKey: 'message_id',
        as: 'statuses'
      });
    }
  }
  
  Message.init({
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
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    message_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'text',
      validate: {
        isIn: [['text', 'image', 'video', 'audio', 'file']]
      }
    },
    media_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    media_thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_edited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reply_to_message_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id'
      }
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
    modelName: 'Message',
    tableName: 'messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });
  
  return Message;
};