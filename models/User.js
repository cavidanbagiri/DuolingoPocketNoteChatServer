// models/User.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasOne(models.UserProfile, {
        foreignKey: 'user_id',
        as: 'profile'
      });
      User.hasMany(models.ConversationParticipant, {
        foreignKey: 'user_id',
        as: 'conversation_participations'
      });
      User.hasMany(models.Message, {
        foreignKey: 'sender_id',
        as: 'sent_messages'
      });
      User.hasMany(models.MessageStatus, {
        foreignKey: 'user_id',
        as: 'message_statuses'
      });
      User.hasMany(models.TypingIndicator, {
        foreignKey: 'user_id',
        as: 'typing_indicators'
      });
      User.hasMany(models.FriendshipRequest, {
        foreignKey: 'sender_id',
        as: 'sent_friend_requests'
      });
      User.hasMany(models.FriendshipRequest, {
        foreignKey: 'receiver_id',
        as: 'received_friend_requests'
      });
      // Self-referential for friendships
      User.belongsToMany(User, {
        through: 'friendships',
        as: 'friends',
        foreignKey: 'user_id',
        otherKey: 'friend_id'
      });
      User.belongsToMany(User, {
        through: 'friendships',
        as: 'friend_of',
        foreignKey: 'friend_id',
        otherKey: 'user_id'
      });
    }
  }
  
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    is_premium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user'
    },
    native: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // Your table doesn't have updated_at
    underscored: true
  });
  
  return User;
};