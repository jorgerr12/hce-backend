// server/routes/patientRoutes.js
const express = require('express');
const { body, query, param } = require('express-validator');
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const { DOCUMENT_TYPES, GENDERS } = require('../config/constants');

const router = express.Router();

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
    .withMessage('Email inválido'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Teléfono debe tener máximo 20 caracteres')
];

// Validaciones para actualizar paciente
const updatePatientValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de paciente inválido'),
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
    .withMessage('Email inválido'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Teléfono debe tener máximo 20 caracteres')
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

// Validaciones para obtener pacientes
const getPatientsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entre 1 y 100'),
  query('document_type')
    .optional()
    .isIn(Object.values(DOCUMENT_TYPES))
    .withMessage('Tipo de documento inválido'),
  query('gender')
    .optional()
    .isIn(Object.values(GENDERS))
    .withMessage('Género inválido'),
  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active debe ser un valor booleano')
];

// Validación para ID de paciente
const patientIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de paciente inválido')
];

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD
router.post('/', createPatientValidation, validationMiddleware, patientController.createPatient);
router.get('/', getPatientsValidation, validationMiddleware, patientController.getPatients);
router.get('/search', searchByDocumentValidation, validationMiddleware, patientController.searchByDocument);
router.get('/:id', patientIdValidation, validationMiddleware, patientController.getPatientById);
router.put('/:id', updatePatientValidation, validationMiddleware, patientController.updatePatient);
router.delete('/:id', patientIdValidation, validationMiddleware, patientController.deletePatient);

module.exports = router;

