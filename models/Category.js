const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('material', 'rental', 'service'),
    defaultValue: 'material'
  },
  icon: {
    type: DataTypes.STRING(50),
    defaultValue: 'fa-cube'
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'categories'
});

module.exports = Category;
