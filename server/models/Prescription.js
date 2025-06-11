// server/models/Prescription.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { PRESCRIPTION_STATUSES } = require('../config/constants');

const Prescription = sequelize.define('Prescription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  consultation_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'consultations',
      key: 'id'
    }
  },
  medication_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Nombre del medicamento'
  },
  generic_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Nombre genérico del medicamento'
  },
  concentration: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Concentración del medicamento (ej: 500mg, 10ml)'
  },
  pharmaceutical_form: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Forma farmacéutica (tableta, cápsula, jarabe, etc.)'
  },
  dose: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Dosis prescrita (ej: 1 tableta, 5ml)'
  },
  frequency: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Frecuencia de administración (ej: cada 8 horas, 3 veces al día)'
  },
  route: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'oral',
    comment: 'Vía de administración (oral, intramuscular, intravenosa, etc.)'
  },
  duration: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Duración del tratamiento (ej: 7 días, 2 semanas)'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Cantidad total a dispensar'
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'unidades',
    comment: 'Unidad de medida (tabletas, ml, frascos, etc.)'
  },
  special_instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Instrucciones especiales para el paciente'
  },
  indications: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Indicaciones médicas específicas'
  },
  contraindications: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Contraindicaciones importantes'
  },
  side_effects: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Efectos secundarios a considerar'
  },
  status: {
    type: DataTypes.ENUM(...Object.values(PRESCRIPTION_STATUSES)),
    allowNull: false,
    defaultValue: PRESCRIPTION_STATUSES.ACTIVE
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha de inicio del tratamiento'
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha de fin del tratamiento'
  },
  is_chronic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica si es un medicamento de uso crónico'
  },
  requires_monitoring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica si requiere monitoreo especial'
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
  tableName: 'prescriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['consultation_id']
    },
    {
      fields: ['medication_name']
    },
    {
      fields: ['status']
    },
    {
      fields: ['start_date', 'end_date']
    }
  ]
});

// Método para generar instrucciones completas
Prescription.prototype.getFullInstructions = function() {
  let instructions = `${this.medication_name}`;
  
  if (this.concentration) {
    instructions += ` ${this.concentration}`;
  }
  
  if (this.pharmaceutical_form) {
    instructions += ` (${this.pharmaceutical_form})`;
  }
  
  instructions += `\nDosis: ${this.dose}`;
  instructions += `\nFrecuencia: ${this.frequency}`;
  instructions += `\nVía: ${this.route}`;
  instructions += `\nDuración: ${this.duration}`;
  instructions += `\nCantidad total: ${this.quantity} ${this.unit}`;
  
  if (this.special_instructions) {
    instructions += `\nInstrucciones especiales: ${this.special_instructions}`;
  }
  
  return instructions;
};

// Método para verificar si la prescripción está activa
Prescription.prototype.isActive = function() {
  if (this.status !== PRESCRIPTION_STATUSES.ACTIVE) return false;
  
  if (this.end_date) {
    const today = new Date();
    const endDate = new Date(this.end_date);
    return endDate >= today;
  }
  
  return true;
};

module.exports = Prescription;

