const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING(50),
    defaultValue: 'item'
  },
  is_rental: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  stock_quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  image_url: {
    type: DataTypes.STRING(255),
    defaultValue: '/img/service-1.jpg'
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of additional product image URLs for gallery view'
  },
  location_county: {
    type: DataTypes.STRING(80),
    defaultValue: 'Nairobi'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'products'
});

module.exports = Product;
