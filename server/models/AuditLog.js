// server/models/AuditLog.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { AUDIT_ACTIONS } = require('../config/constants');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuario que realizó la acción'
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Tipo de acción realizada'
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Tipo de entidad afectada (Patient, Appointment, etc.)'
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'ID de la entidad modificada'
  },
  old_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Datos antes del cambio'
  },
  new_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Datos después del cambio'
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'Dirección IP del usuario'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent del navegador'
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ID de sesión del usuario'
  },
  additional_info: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Información adicional contextual'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'audit_logs',
  timestamps: false, // Solo necesitamos created_at
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['ip_address']
    }
  ]
});

// Método estático para crear un log de auditoría
AuditLog.createLog = async function(logData) {
  try {
    return await this.create(logData);
  } catch (error) {
    console.error('Error al crear log de auditoría:', error);
    // No lanzamos el error para no interrumpir la operación principal
    return null;
  }
};

// Método estático para obtener logs por entidad
AuditLog.getEntityHistory = async function(entityType, entityId, limit = 50) {
  return await this.findAll({
    where: {
      entity_type: entityType,
      entity_id: entityId
    },
    order: [['created_at', 'DESC']],
    limit: limit,
    include: [
      {
        model: sequelize.models.User,
        attributes: ['id', 'first_name', 'last_name', 'email'],
        required: false
      }
    ]
  });
};

// Método estático para obtener logs por usuario
AuditLog.getUserActivity = async function(userId, limit = 100) {
  return await this.findAll({
    where: {
      user_id: userId
    },
    order: [['created_at', 'DESC']],
    limit: limit
  });
};

module.exports = AuditLog;

