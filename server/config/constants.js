// server/config/constants.js

// Estados de las citas
const APPOINTMENT_STATUSES = {
  PENDING: 'pendiente',
  CONFIRMED: 'confirmada',
  CANCELLED: 'cancelada',
  ATTENDED: 'atendida',
  PAID: 'pagada',
  NOT_PAID: 'no_pagada'
};

// Tipos de citas
const APPOINTMENT_TYPES = {
  MEDICAL_CONSULTATION: 'consulta_medica',
  EMERGENCY: 'emergencia',
  PROCEDURE: 'procedimiento',
  CONTROL_CONSULTATION: 'consulta_control'
};

// Tipos de documento
const DOCUMENT_TYPES = {
  DNI: 'dni',
  FOREIGN_CARD: 'carnet_extranjeria',
  PASSPORT: 'pasaporte',
  NO_DOCUMENT: 'sin_documento'
};

// Géneros
const GENDERS = {
  MALE: 'M',
  FEMALE: 'F',
  OTHER: 'O'
};

// Estados de prescripciones
const PRESCRIPTION_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'canceled'
};

// Roles de usuarios
const USER_ROLES = {
  ADMIN: 'administrador',
  DOCTOR: 'medico',
  NURSE: 'enfermero',
  RECEPTIONIST: 'recepcionista'
};

// Acciones de auditoría
const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout'
};

module.exports = {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  DOCUMENT_TYPES,
  GENDERS,
  PRESCRIPTION_STATUSES,
  USER_ROLES,
  AUDIT_ACTIONS
};

