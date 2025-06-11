// server/routes/appointmentRoutes.js
const express = require('express');
const { body, query, param } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } = require('../config/constants');

const router = express.Router();

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
    .withMessage('Método de pago debe tener máximo 50 caracteres'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notas deben tener máximo 1000 caracteres')
];

// Validaciones para actualizar cita
const updateAppointmentValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de cita inválido'),
  body('patient_id')
    .optional()
    .isUUID()
    .withMessage('ID de paciente inválido'),
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
  body('status')
    .optional()
    .isIn(Object.values(APPOINTMENT_STATUSES))
    .withMessage('Estado de cita inválido'),
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
    .withMessage('Método de pago debe tener máximo 50 caracteres'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notas deben tener máximo 1000 caracteres')
];

// Validaciones para obtener citas
const getAppointmentsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entre 1 y 100'),
  query('doctor_id')
    .optional()
    .isUUID()
    .withMessage('ID de médico inválido'),
  query('patient_id')
    .optional()
    .isUUID()
    .withMessage('ID de paciente inválido'),
  query('status')
    .optional()
    .isIn(Object.values(APPOINTMENT_STATUSES))
    .withMessage('Estado de cita inválido'),
  query('type')
    .optional()
    .isIn(Object.values(APPOINTMENT_TYPES))
    .withMessage('Tipo de cita inválido'),
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Fecha desde debe ser una fecha válida'),
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Fecha hasta debe ser una fecha válida'),
  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active debe ser un valor booleano')
];

// Validación para cancelar cita
const cancelAppointmentValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de cita inválido'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Motivo debe tener máximo 500 caracteres')
];

// Validación para citas del día del médico
const doctorDailyAppointmentsValidation = [
  query("date")
    .optional()
    .isISO8601()
    .withMessage("Fecha debe ser una fecha válida")
];

// Validación para ID de cita
const appointmentIdValidation = [
  param("id")
    .isUUID()
    .withMessage("ID de cita inválido")
];

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD
router.post("/", createAppointmentValidation, validationMiddleware, appointmentController.createAppointment);
router.get("/", getAppointmentsValidation, validationMiddleware, appointmentController.getAppointments);
router.get("/:id", appointmentIdValidation, validationMiddleware, appointmentController.getAppointmentById);
router.put("/:id", updateAppointmentValidation, validationMiddleware, appointmentController.updateAppointment);

// Rutas de acciones específicas
router.post("/:id/cancel", cancelAppointmentValidation, validationMiddleware, appointmentController.cancelAppointment);
router.post("/:id/mark-attended", appointmentIdValidation, validationMiddleware, appointmentController.markAsAttended);

// Rutas especiales
router.get("/doctor/:doctor_id/daily", param("doctor_id").isUUID().withMessage("ID de médico inválido"), doctorDailyAppointmentsValidation, validationMiddleware, appointmentController.getDoctorDailyAppointments);

module.exports = router;

