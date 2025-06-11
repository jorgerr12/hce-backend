// server/models/Patient.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { DOCUMENT_TYPES, GENDERS } = require('../config/constants');

const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  document_type: {
    type: DataTypes.ENUM(...Object.values(DOCUMENT_TYPES)),
    allowNull: false
  },
  document_number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  paternal_surname: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  maternal_surname: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  history_number: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  external_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Código para integraciones externas'
  },
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM(...Object.values(GENDERS)),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  emergency_contact_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  emergency_contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
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
  tableName: 'patients',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['history_number']
    },
    {
      fields: ['document_type', 'document_number']
    },
    {
      fields: ['first_name', 'paternal_surname']
    },
    {
      fields: ['is_active']
    }
  ],
  validate: {
    // Validación personalizada para DNI peruano
    validateDNI() {
      if (this.document_type === DOCUMENT_TYPES.DNI) {
        if (!/^\d{8}$/.test(this.document_number)) {
          throw new Error('El DNI debe tener exactamente 8 dígitos');
        }
      }
    }
  }
});

// Método para obtener el nombre completo
Patient.prototype.getFullName = function() {
  return `${this.first_name} ${this.paternal_surname}${this.maternal_surname ? ' ' + this.maternal_surname : ''}`;
};

// Método para calcular la edad
Patient.prototype.getAge = function() {
  if (!this.birth_date) return null;
  
  const today = new Date();
  const birthDate = new Date(this.birth_date);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

module.exports = Patient;

