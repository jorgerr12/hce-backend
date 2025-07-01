// server/routes/v1/externalRoutes.js
const express = require('express');
const { body, query, param } = require('express-validator');
const externalController = require('../../controllers/externalController');
const authMiddleware = require('../../middleware/authMiddleware');
const validationMiddleware = require('../../middleware/validationMiddleware');

const router = express.Router();

/**
 * API v1 - Rutas de Integración Externa
 * Todas las rutas están prefijadas con /api/v1/external
 */

// Validaciones para sincronización de cita desde sistema de cobranza
const syncAppointmentValidation = [
  body('patient')
    .isObject()
    .withMessage('Datos de paciente son requeridos'),
  body('patient.document_type')
    .notEmpty()
    .withMessage('Tipo de documento del paciente es requerido'),
  body('patient.document_number')
    .notEmpty()
    .withMessage('Número de documento del paciente es requerido'),
  body('patient.first_name')
    .notEmpty()
    .withMessage('Nombre del paciente es requerido'),
  body('patient.paternal_surname')
    .notEmpty()
    .withMessage('Apellido paterno del paciente es requerido'),
  body('appointment')
    .isObject()
    .withMessage('Datos de cita son requeridos'),
  body('appointment.external_code')
    .notEmpty()
    .withMessage('Código externo de la cita es requerido'),
  body('appointment.date_time')
    .isISO8601()
    .withMessage('Fecha y hora de la cita debe ser válida'),
  body('appointment.type')
    .notEmpty()
    .withMessage('Tipo de cita es requerido')
];

// Validaciones para actualización de estado de pago
const updatePaymentStatusValidation = [
  body('appointment_id')
    .isUUID()
    .withMessage('ID de cita debe ser un UUID válido'),
  body('payment_status')
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Estado de pago inválido'),
  body('payment_amount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Monto de pago debe ser un número decimal válido'),
  body('payment_method')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Método de pago debe tener máximo 50 caracteres'),
  body('transaction_id')
    .optional()
    .isLength({ max: 100 })
    .withMessage('ID de transacción debe tener máximo 100 caracteres')
];

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

/**
 * @route   POST /api/v1/external/sync/appointment
 * @desc    Sincronizar cita desde sistema de cobranza
 * @access  Private
 */
router.post('/sync/appointment', syncAppointmentValidation, validationMiddleware, externalController.syncAppointmentFromBilling);

/**
 * @route   PUT /api/v1/external/payment/status
 * @desc    Actualizar estado de pago de cita
 * @access  Private
 */
router.put('/payment/status', updatePaymentStatusValidation, validationMiddleware, externalController.updatePaymentStatus);

/**
 * @route   GET /api/v1/external/sync/stats
 * @desc    Obtener estadísticas de sincronización
 * @access  Private
 */
router.get('/sync/stats', externalController.getSyncStatistics);

/**
 * @route   POST /api/v1/external/webhook/billing
 * @desc    Webhook para recibir notificaciones del sistema de cobranza
 * @access  Private
 */
//router.post('/webhook/billing', externalController.handleBillingWebhook);

/**
 * @route   POST /api/v1/external/webhook/pacs
 * @desc    Webhook para recibir notificaciones del sistema PACS
 * @access  Private
 */
//router.post('/webhook/pacs', externalController.handlePacsWebhook);

/**
 * @route   POST /api/v1/external/webhook/lis
 * @desc    Webhook para recibir notificaciones del sistema LIS
 * @access  Private
 */
//router.post('/webhook/lis', externalController.handleLisWebhook);

module.exports = router;
