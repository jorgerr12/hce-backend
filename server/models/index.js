// server/models/index.js
const { sequelize } = require('../config/db');

// Importar todos los modelos
const User = require('./User');
const Patient = require('./Patient');
const Doctor = require('./Doctor');
const Appointment = require('./Appointment');
const Consultation = require('./Consultation');
const Prescription = require('./Prescription');
const AuditLog = require('./AuditLog');

// Definir las relaciones entre modelos

// Relación User - Doctor (1:1)
User.hasOne(Doctor, {
  foreignKey: 'user_id',
  as: 'doctorProfile'
});
Doctor.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Relación Patient - Appointment (1:N)
Patient.hasMany(Appointment, {
  foreignKey: 'patient_id',
  as: 'appointments'
});
Appointment.belongsTo(Patient, {
  foreignKey: 'patient_id',
  as: 'patient'
});

// Relación Doctor - Appointment (1:N)
Doctor.hasMany(Appointment, {
  foreignKey: 'doctor_id',
  as: 'appointments'
});
Appointment.belongsTo(Doctor, {
  foreignKey: 'doctor_id',
  as: 'doctor'
});

// Relación Appointment - Consultation (1:1)
Appointment.hasOne(Consultation, {
  foreignKey: 'appointment_id',
  as: 'consultation'
});
Consultation.belongsTo(Appointment, {
  foreignKey: 'appointment_id',
  as: 'appointment'
});

// Relación Consultation - Prescription (1:N)
Consultation.hasMany(Prescription, {
  foreignKey: 'consultation_id',
  as: 'prescriptions'
});
Prescription.belongsTo(Consultation, {
  foreignKey: 'consultation_id',
  as: 'consultation'
});

// Relación User - AuditLog (1:N)
User.hasMany(AuditLog, {
  foreignKey: 'user_id',
  as: 'auditLogs'
});
AuditLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Función para sincronizar todos los modelos
const syncDatabase = async (options = {}) => {
  try {
    console.log('🔄 Sincronizando modelos con la base de datos...');
    
    // Sincronizar en orden para respetar las dependencias
    await sequelize.sync(options);
    
    console.log('✅ Modelos sincronizados correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar modelos:', error);
    throw error;
  }
};

// Función para crear datos de prueba (solo en desarrollo)
const createSeedData = async () => {
  if (process.env.NODE_ENV !== 'development') {
    console.log('⚠️  Seed data solo disponible en modo desarrollo');
    return;
  }

  try {
    console.log('🌱 Creando datos de prueba...');
    
    // Verificar si ya existen datos
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('ℹ️  Ya existen datos en la base de datos');
      return;
    }

    const bcrypt = require('bcryptjs');
    const { USER_ROLES, DOCUMENT_TYPES, GENDERS } = require('../config/constants');

    // Crear usuario administrador
    const adminUser = await User.create({
      email: 'admin@saludvital.pe',
      password: await bcrypt.hash('admin123', 10),
      first_name: 'Administrador',
      last_name: 'Sistema',
      role: USER_ROLES.ADMIN
    });

    // Crear usuario médico
    const doctorUser = await User.create({
      email: 'doctor@saludvital.pe',
      password: await bcrypt.hash('doctor123', 10),
      first_name: 'Juan Carlos',
      last_name: 'Pérez García',
      role: USER_ROLES.DOCTOR
    });

    // Crear perfil de médico
    const doctor = await Doctor.create({
      user_id: doctorUser.id,
      cmp_number: 'CMP-12345',
      specialties: ['Medicina General', 'Cardiología'],
      consultation_fee: 80.00
    });

    // Crear paciente de prueba
    const patient = await Patient.create({
      document_type: DOCUMENT_TYPES.DNI,
      document_number: '12345678',
      first_name: 'María',
      paternal_surname: 'González',
      maternal_surname: 'López',
      history_number: 'HCE-000001',
      birth_date: '1985-03-15',
      gender: GENDERS.FEMALE,
      email: 'maria.gonzalez@email.com',
      phone: '987654321'
    });

    console.log('✅ Datos de prueba creados correctamente');
    console.log('👤 Usuario admin: admin@saludvital.pe / admin123');
    console.log('👨‍⚕️ Usuario médico: doctor@saludvital.pe / doctor123');
    
  } catch (error) {
    console.error('❌ Error al crear datos de prueba:', error);
  }
};

// Exportar todos los modelos y funciones
module.exports = {
  sequelize,
  User,
  Patient,
  Doctor,
  Appointment,
  Consultation,
  Prescription,
  AuditLog,
  syncDatabase,
  createSeedData
};

