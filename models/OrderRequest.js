const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderRequest = sequelize.define('OrderRequest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  delivery_address: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  contact_phone: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('inquiry', 'quote_provided', 'confirmed', 'delivered', 'cancelled'),
    defaultValue: 'inquiry'
  },
  payment_status: {
    type: DataTypes.STRING(20),
    defaultValue: 'unpaid'
  },
  mpesa_receipt: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  mpesa_phone: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'order_requests'
});

module.exports = OrderRequest;
