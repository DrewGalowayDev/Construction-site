const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ArtisanProfile = sequelize.define('ArtisanProfile', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  trade: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  experience_years: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  daily_rate: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 2000.00
  },
  bio: {
    type: DataTypes.TEXT
  },
  nca_reg_number: {
    type: DataTypes.STRING(80)
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 5.0
  }
}, {
  tableName: 'artisan_profiles'
});

module.exports = ArtisanProfile;
