// models/MessageStatus.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MessageStatus extends Model {
    static associate(models) {
      MessageStatus.belongsTo(models.Message, {
        foreignKey: 'message_id',
        as: 'message'
      });
      MessageStatus.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }
  
  MessageStatus.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    message_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'messages',
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
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'sent',
      validate: {
        isIn: [['sent', 'delivered', 'read']]
      }
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'MessageStatus',
    tableName: 'message_status',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['message_id', 'user_id']
      }
    ]
  });
  
  return MessageStatus;
};