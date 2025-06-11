// server/models/Consultation.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Consultation = sequelize.define('Consultation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  appointment_id: {
    type: DataTypes.UUID,
    unique: true,
    allowNull: false,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },
  // Signos vitales
  weight: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Peso en kilogramos'
  },
  height: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Altura en centímetros'
  },
  bmi: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    comment: 'Índice de masa corporal (calculado automáticamente)'
  },
  blood_pressure_systolic: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Presión arterial sistólica'
  },
  blood_pressure_diastolic: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Presión arterial diastólica'
  },
  heart_rate: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Frecuencia cardíaca por minuto'
  },
  respiratory_rate: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Frecuencia respiratoria por minuto'
  },
  temperature: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    comment: 'Temperatura corporal en grados Celsius'
  },
  oxygen_saturation: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Saturación de oxígeno en porcentaje'
  },
  
  // Anamnesis y antecedentes
  chief_complaint: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Motivo de consulta principal'
  },
  current_illness: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Enfermedad actual'
  },
  anamnesis: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Anamnesis completa'
  },
  pathological_antecedents: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Antecedentes patológicos'
  },
  non_pathological_antecedents: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Antecedentes no patológicos'
  },
  family_antecedents: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Antecedentes familiares'
  },
  allergies: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Alergias conocidas'
  },
  current_medications: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Medicamentos actuales'
  },
  
  // Examen físico
  physical_exam: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Examen físico general'
  },
  physical_exam_head_neck: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  physical_exam_chest: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  physical_exam_abdomen: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  physical_exam_extremities: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  physical_exam_neurological: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Diagnósticos
  primary_diagnosis: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Diagnóstico principal'
  },
  primary_diagnosis_cie10: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Código CIE-10 del diagnóstico principal'
  },
  secondary_diagnoses: {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    allowNull: true,
    defaultValue: [],
    comment: 'Diagnósticos secundarios con códigos CIE-10'
  },
  
  // Plan de tratamiento y evolución
  treatment_plan: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Plan de tratamiento'
  },
  evolution_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas de evolución'
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Recomendaciones al paciente'
  },
  next_appointment_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha sugerida para próxima cita'
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
  tableName: 'consultations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['appointment_id']
    },
    {
      fields: ['primary_diagnosis_cie10']
    }
  ],
  hooks: {
    // Hook para calcular automáticamente el IMC
    beforeSave: (consultation, options) => {
      if (consultation.weight && consultation.height) {
        const heightInMeters = consultation.height / 100;
        consultation.bmi = (consultation.weight / (heightInMeters * heightInMeters)).toFixed(2);
      }
    }
  }
});

// Método para obtener la presión arterial formateada
Consultation.prototype.getBloodPressure = function() {
  if (this.blood_pressure_systolic && this.blood_pressure_diastolic) {
    return `${this.blood_pressure_systolic}/${this.blood_pressure_diastolic}`;
  }
  return null;
};

// Método para clasificar el IMC
Consultation.prototype.getBMIClassification = function() {
  if (!this.bmi) return null;
  
  const bmi = parseFloat(this.bmi);
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25) return 'Peso normal';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidad grado I';
  if (bmi < 40) return 'Obesidad grado II';
  return 'Obesidad grado III';
};

module.exports = Consultation;

