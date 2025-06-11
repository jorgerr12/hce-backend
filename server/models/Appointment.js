// server/models/Appointment.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } = require('../config/constants');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  doctor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'doctors',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM(...Object.values(APPOINTMENT_TYPES)),
    allowNull: false
  },
  date_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
    comment: 'Duración estimada de la cita en minutos'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(...Object.values(APPOINTMENT_STATUSES)),
    allowNull: false,
    defaultValue: APPOINTMENT_STATUSES.PENDING
  },
  external_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Código del sistema de cobranza'
  },
  payment_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Monto pagado por la cita'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Método de pago utilizado'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas adicionales sobre la cita'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Soft delete flag'
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
  tableName: 'appointments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['patient_id']
    },
    {
      fields: ['doctor_id']
    },
    {
      fields: ['date_time']
    },
    {
      fields: ['status']
    },
    {
      fields: ['external_code']
    },
    {
      fields: ['is_active']
    }
  ],
  validate: {
    // Validación para que la fecha de la cita no sea en el pasado
    futureDateOnly() {
      if (this.date_time && this.date_time < new Date()) {
        throw new Error('La fecha de la cita no puede ser en el pasado');
      }
    }
  }
});

// Método para verificar si la cita puede ser cancelada
Appointment.prototype.canBeCancelled = function() {
  const now = new Date();
  const appointmentTime = new Date(this.date_time);
  const timeDiff = appointmentTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 3600);
  
  // Se puede cancelar si faltan más de 2 horas
  return hoursDiff > 2 && this.status !== APPOINTMENT_STATUSES.ATTENDED;
};

// Método para verificar si la cita está vencida
Appointment.prototype.isOverdue = function() {
  const now = new Date();
  const appointmentTime = new Date(this.date_time);
  return appointmentTime < now && this.status === APPOINTMENT_STATUSES.PENDING;
};

module.exports = Appointment;

