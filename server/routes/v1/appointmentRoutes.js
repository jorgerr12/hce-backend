// server/routes/v1/appointmentRoutes.js
const express = require('express');
const { body, query, param } = require('express-validator');
const appointmentController = require('../../controllers/appointmentController');
const authMiddleware = require('../../middleware/authMiddleware');
const validationMiddleware = require('../../middleware/validationMiddleware');
const { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } = require('../../config/constants');

const router = express.Router();

/**
 * API v1 - Rutas de Citas
 * Todas las rutas están prefijadas con /api/v1/appointments
 */

// Validaciones para crear cita
const createAppointmentValidation = [
  body('patient_id')
    .isUUID()
    .withMessage('ID de paciente inválido'),
  body('doctor_id')
    .isUUID()
    .withMessage('ID de médico inválido'),
  body('type')
    .isIn(Object.values(APPOINTMENT_TYPES))
    .withMessage('Tipo de cita inválido'),
  body('date_time')
    .isISO8601()
    .withMessage('Fecha y hora debe ser una fecha válida')
    .custom((value) => {
      const appointmentDate = new Date(value);
      const now = new Date();
      if (appointmentDate <= now) {
        throw new Error('La fecha de la cita debe ser en el futuro');
      }
      return true;
    }),
  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Duración debe ser entre 15 y 240 minutos'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Descripción debe tener máximo 1000 caracteres'),
  body('external_code')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Código externo debe tener máximo 50 caracteres'),
  body('payment_amount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Monto de pago debe ser un número decimal válido'),
  body('payment_method')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Método de pago debe tener máximo 50 caracteres')
];

// Validaciones para actualizar cita
const updateAppointmentValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de cita debe ser un UUID válido'),
  body('doctor_id')
    .optional()
    .isUUID()
    .withMessage('ID de médico inválido'),
  body('type')
    .optional()
    .isIn(Object.values(APPOINTMENT_TYPES))
    .withMessage('Tipo de cita inválido'),
  body('date_time')
    .optional()
    .isISO8601()
    .withMessage('Fecha y hora debe ser una fecha válida'),
  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('Duración debe ser entre 15 y 240 minutos'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Descripción debe tener máximo 1000 caracteres'),
  body('payment_amount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Monto de pago debe ser un número decimal válido'),
  body('payment_method')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Método de pago debe tener máximo 50 caracteres')
];

// Validaciones para ID de cita
const appointmentIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de cita debe ser un UUID válido')
];

// Validaciones para cambiar estado
const changeStatusValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de cita debe ser un UUID válido'),
  body('status')
    .isIn(Object.values(APPOINTMENT_STATUSES))
    .withMessage('Estado de cita inválido'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Razón debe tener máximo 500 caracteres')
];

// Validaciones para disponibilidad de médico
const doctorAvailabilityValidation = [
  query('doctor_id')
    .isUUID()
    .withMessage('ID de médico inválido'),
  query('date')
    .isISO8601()
    .withMessage('Fecha debe ser una fecha válida')
];

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

/**
 * @route   GET /api/v1/appointments
 * @desc    Obtener lista de citas con filtros y paginación
 * @access  Private
 */
router.get('/', appointmentController.getAppointments);

/**
 * @route   GET /api/v1/appointments/availability
 * @desc    Verificar disponibilidad de médico en fecha específica
 * @access  Private
 */
//router.get('/availability', doctorAvailabilityValidation, validationMiddleware, appointmentController.checkDoctorAvailability);

/**
 * @route   GET /api/v1/appointments/stats
 * @desc    Obtener estadísticas de citas
 * @access  Private
 */
//router.get('/stats', appointmentController.getAppointmentStats);

/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Obtener una cita por ID
 * @access  Private
 */
router.get('/:id', appointmentIdValidation, validationMiddleware, appointmentController.getAppointmentById);

/**
 * @route   POST /api/v1/appointments
 * @desc    Crear una nueva cita
 * @access  Private
 */
router.post('/', createAppointmentValidation, validationMiddleware, appointmentController.createAppointment);

/**
 * @route   PUT /api/v1/appointments/:id
 * @desc    Actualizar una cita
 * @access  Private
 */
router.put('/:id', updateAppointmentValidation, validationMiddleware, appointmentController.updateAppointment);

/**
 * @route   PUT /api/v1/appointments/:id/status
 * @desc    Cambiar estado de una cita
 * @access  Private
 */
//router.put('/:id/status', changeStatusValidation, validationMiddleware, appointmentController.changeAppointmentStatus);

/**
 * @route   PUT /api/v1/appointments/:id/attend
 * @desc    Marcar cita como atendida
 * @access  Private
 */
router.put('/:id/attend', appointmentIdValidation, validationMiddleware, appointmentController.markAsAttended);

/**
 * @route   DELETE /api/v1/appointments/:id
 * @desc    Cancelar una cita
 * @access  Private
 */
router.delete('/:id', appointmentIdValidation, validationMiddleware, appointmentController.cancelAppointment);

module.exports = router;
