// models/TypingIndicator.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TypingIndicator extends Model {
    static associate(models) {
      TypingIndicator.belongsTo(models.Conversation, {
        foreignKey: 'conversation_id',
        as: 'conversation'
      });
      TypingIndicator.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }
  
  TypingIndicator.init({
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
    is_typing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'TypingIndicator',
    tableName: 'typing_indicators',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['conversation_id', 'user_id']
      }
    ]
  });
  
  return TypingIndicator;
};