// server/models/Doctor.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Doctor = sequelize.define('Doctor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cmp_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Número de Colegio Médico del Perú'
  },
  specialties: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: [],
    comment: 'Array de especialidades médicas'
  },
  external_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Código para integraciones externas'
  },
  license_expiry: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha de vencimiento de la licencia médica'
  },
  consultation_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Tarifa de consulta en soles peruanos'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'doctors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['cmp_number']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = Doctor;

