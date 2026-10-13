const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContactUnlock = sequelize.define('ContactUnlock', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  unlock_type: {
    type: DataTypes.ENUM('job_client', 'material_supplier', 'artisan_fundi'),
    allowNull: false
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the job/product/artisan whose contact was unlocked'
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unlocked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'contact_unlocks',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'unlock_type', 'target_id'],
      name: 'unique_unlock_per_user'
    }
  ]
});

module.exports = ContactUnlock;
