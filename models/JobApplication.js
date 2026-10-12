const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobApplication = sequelize.define('JobApplication', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  bid_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  pitch_message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'shortlisted', 'accepted', 'rejected'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'job_applications'
});

module.exports = JobApplication;
