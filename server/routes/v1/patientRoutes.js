// server/routes/v1/patientRoutes.js
const express = require('express');
const { body, query, param } = require('express-validator');
const patientController = require('../../controllers/patientController');
const authMiddleware = require('../../middleware/authMiddleware');
const validationMiddleware = require('../../middleware/validationMiddleware');
const { DOCUMENT_TYPES, GENDERS } = require('../../config/constants');

const router = express.Router();

/**
 * API v1 - Rutas de Pacientes
 * Todas las rutas están prefijadas con /api/v1/patients
 */

// Validaciones para crear paciente
const createPatientValidation = [
  body('document_type')
    .isIn(Object.values(DOCUMENT_TYPES))
    .withMessage('Tipo de documento inválido'),
  body('document_number')
    .notEmpty()
    .withMessage('Número de documento es requerido')
    .isLength({ min: 1, max: 20 })
    .withMessage('Número de documento debe tener entre 1 y 20 caracteres'),
  body('first_name')
    .notEmpty()
    .withMessage('Nombre es requerido')
    .isLength({ min: 1, max: 100 })
    .withMessage('Nombre debe tener entre 1 y 100 caracteres'),
  body('paternal_surname')
    .notEmpty()
    .withMessage('Apellido paterno es requerido')
    .isLength({ min: 1, max: 100 })
    .withMessage('Apellido paterno debe tener entre 1 y 100 caracteres'),
  body('maternal_surname')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Apellido materno debe tener máximo 100 caracteres'),
  body('history_number')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Número de historia debe tener máximo 20 caracteres'),
  body('birth_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento debe ser una fecha válida'),
  body('gender')
    .optional()
    .isIn(Object.values(GENDERS))
    .withMessage('Género inválido'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email debe ser válido'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Teléfono debe tener máximo 20 caracteres'),
  body('address')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Dirección debe tener máximo 255 caracteres'),
  body('emergency_contact_name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Nombre de contacto de emergencia debe tener máximo 200 caracteres'),
  body('emergency_contact_phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Teléfono de contacto de emergencia debe tener máximo 20 caracteres')
];

// Validaciones para actualizar paciente
const updatePatientValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de paciente debe ser un UUID válido'),
  body('document_type')
    .optional()
    .isIn(Object.values(DOCUMENT_TYPES))
    .withMessage('Tipo de documento inválido'),
  body('document_number')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Número de documento debe tener entre 1 y 20 caracteres'),
  body('first_name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nombre debe tener entre 1 y 100 caracteres'),
  body('paternal_surname')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Apellido paterno debe tener entre 1 y 100 caracteres'),
  body('maternal_surname')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Apellido materno debe tener máximo 100 caracteres'),
  body('birth_date')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento debe ser una fecha válida'),
  body('gender')
    .optional()
    .isIn(Object.values(GENDERS))
    .withMessage('Género inválido'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email debe ser válido'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Teléfono debe tener máximo 20 caracteres'),
  body('address')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Dirección debe tener máximo 255 caracteres'),
  body('emergency_contact_name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Nombre de contacto de emergencia debe tener máximo 200 caracteres'),
  body('emergency_contact_phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Teléfono de contacto de emergencia debe tener máximo 20 caracteres')
];

// Validaciones para ID de paciente
const patientIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de paciente debe ser un UUID válido')
];

// Validaciones para búsqueda por documento
const searchByDocumentValidation = [
  query('document_type')
    .isIn(Object.values(DOCUMENT_TYPES))
    .withMessage('Tipo de documento inválido'),
  query('document_number')
    .notEmpty()
    .withMessage('Número de documento es requerido')
];

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

/**
 * @route   GET /api/v1/patients
 * @desc    Obtener lista de pacientes con filtros y paginación
 * @access  Private
 */
router.get('/', patientController.getPatients);

/**
 * @route   GET /api/v1/patients/search
 * @desc    Buscar paciente por documento
 * @access  Private
 */
router.get('/search', searchByDocumentValidation, validationMiddleware, patientController.searchByDocument);

/**
 * @route   GET /api/v1/patients/:id
 * @desc    Obtener un paciente por ID
 * @access  Private
 */
router.get('/:id', patientIdValidation, validationMiddleware, patientController.getPatientById);

/**
 * @route   POST /api/v1/patients
 * @desc    Crear un nuevo paciente
 * @access  Private
 */
router.post('/', createPatientValidation, validationMiddleware, patientController.createPatient);

/**
 * @route   PUT /api/v1/patients/:id
 * @desc    Actualizar un paciente
 * @access  Private
 */
router.put('/:id', updatePatientValidation, validationMiddleware, patientController.updatePatient);

/**
 * @route   DELETE /api/v1/patients/:id
 * @desc    Eliminar un paciente (soft delete)
 * @access  Private
 */
router.delete('/:id', patientIdValidation, validationMiddleware, patientController.deletePatient);

module.exports = router;
