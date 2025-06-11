// server/routes/externalRoutes.js
const express = require('express');
const { body, query, param } = require('express-validator');
const externalController = require('../controllers/externalController');
const validationMiddleware = require('../middleware/validationMiddleware');
const { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } = require('../config/constants');

const router = express.Router();

// Validaciones para sincronización de cita desde sistema de cobranza
const syncAppointmentValidation = [
  body('patient')
    .isObject()
    .withMessage('Datos de paciente son requeridos'),
  body('patient.dni')
    .matches(/^\d{8}$/)
    .withMessage('DNI debe tener exactamente 8 dígitos'),
  body('patient.names')
    .notEmpty()
    .withMessage('Nombres del paciente son requeridos')
    .isLength({ min: 1, max: 200 })
    .withMessage('Nombres deben tener entre 1 y 200 caracteres'),
  body('patient.gender')
    .optional()
    .isIn(['M', 'F', 'O'])
    .withMessage('Género debe ser M, F o O'),
  body('patient.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('patient.phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Teléfono debe tener máximo 20 caracteres'),
  body('patient.birth_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento debe ser una fecha válida'),
  
  body('appointment')
    .isObject()
    .withMessage('Datos de cita son requeridos'),
  body('appointment.type')
    .optional()
    .isIn(Object.values(APPOINTMENT_TYPES))
    .withMessage('Tipo de cita inválido'),
  body('appointment.doctor_id')
    .isUUID()
    .withMessage('ID de médico inválido'),
  body('appointment.date_time')
    .isISO8601()
    .withMessage('Fecha y hora debe ser una fecha válida'),
  body('appointment.description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Descripción debe tener máximo 1000 caracteres'),
  body('appointment.status')
    .optional()
    .isIn(Object.values(APPOINTMENT_STATUSES))
    .withMessage('Estado de cita inválido'),
  body('appointment.price')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Precio debe ser un número decimal válido'),
  body('appointment.external_code')
    .notEmpty()
    .withMessage('Código externo es requerido')
    .isLength({ min: 1, max: 50 })
    .withMessage('Código externo debe tener entre 1 y 50 caracteres')
];

// Validaciones para actualización de estado de pago
const updatePaymentStatusValidation = [
  body('external_code')
    .notEmpty()
    .withMessage('Código externo es requerido'),
  body('status')
    .isIn(Object.values(APPOINTMENT_STATUSES))
    .withMessage('Estado inválido'),
  body('payment_amount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Monto de pago debe ser un número decimal válido'),
  body('payment_method')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Método de pago debe tener máximo 50 caracteres'),
  body('payment_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha de pago debe ser una fecha válida'),
  body('transaction_id')
    .optional()
    .isLength({ max: 100 })
    .withMessage('ID de transacción debe tener máximo 100 caracteres')
];

// Validaciones para obtener estado de sincronización
const getSyncStatusValidation = [
  param("external_code")
    .notEmpty()
    .withMessage("Código externo es requerido")
    .isLength({ min: 1, max: 50 })
    .withMessage("Código externo debe tener entre 1 y 50 caracteres")
];

// Validaciones para estadísticas de sincronización
const getSyncStatisticsValidation = [
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Fecha desde debe ser una fecha válida'),
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Fecha hasta debe ser una fecha válida')
];

// Rutas públicas (para webhooks y sistemas externos)
// Nota: En producción, estas rutas deberían tener autenticación por API key o token específico

// Sincronización de citas desde sistema de cobranza
router.post('/appointments', syncAppointmentValidation, validationMiddleware, externalController.syncAppointmentFromBilling);

// Webhook para actualizaciones de estado de pago
router.post('/payment-status', updatePaymentStatusValidation, validationMiddleware, externalController.updatePaymentStatus);

// Obtener estado de sincronización de una cita
router.get('/appointments/:external_code/status', getSyncStatusValidation, validationMiddleware, externalController.getAppointmentSyncStatus);

// Obtener estadísticas de sincronización
router.get('/sync/statistics', getSyncStatisticsValidation, validationMiddleware, externalController.getSyncStatistics);

module.exports = router;

