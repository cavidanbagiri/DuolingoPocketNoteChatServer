// models/FriendshipRequest.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FriendshipRequest extends Model {
    static associate(models) {
      FriendshipRequest.belongsTo(models.User, {
        foreignKey: 'sender_id',
        as: 'sender'
      });
      FriendshipRequest.belongsTo(models.User, {
        foreignKey: 'receiver_id',
        as: 'receiver'
      });
    }
  }
  
  FriendshipRequest.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    receiver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'accepted', 'rejected']]
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
    modelName: 'FriendshipRequest',
    tableName: 'friendship_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });
  
  return FriendshipRequest;
};