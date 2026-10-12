const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobPost = sequelize.define('JobPost', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  trade_required: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  location_county: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  location_town: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  budget_estimate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  duration: {
    type: DataTypes.STRING(100),
    defaultValue: '2 weeks'
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'open'
  }
}, {
  tableName: 'job_posts'
});

module.exports = JobPost;
