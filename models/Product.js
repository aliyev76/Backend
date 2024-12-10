import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Product = sequelize.define(
  'Product',
  {
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modifications: {
      type: DataTypes.JSON, // Must be JSON to accept object data
      allowNull: false,
    },
    saflaştırma: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scale: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    totalPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    oligoAdi: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    isOrder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Defaults to false, becomes true when ordered
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Defaults to false, becomes true when admin approves
    },
    isWorkingOn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Defaults to false, becomes true when admin starts work
    },
    isFinished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Defaults to false, becomes true when the process is finished
    },
  },
  {
    timestamps: true,
  }
);

export default Product;

