// server/routes/v1/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const authController = require('../../controllers/authController');
const authMiddleware = require('../../middleware/authMiddleware');
const validationMiddleware = require('../../middleware/validationMiddleware');

const router = express.Router();

/**
 * API v1 - Rutas de Autenticación
 * Todas las rutas están prefijadas con /api/v1/auth
 */

// Validaciones para login
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe proporcionar un email válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
];

// Validaciones para cambio de contraseña
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

/**
 * @route   POST /api/v1/auth/login
 * @desc    Iniciar sesión de usuario
 * @access  Public
 */
router.post('/login', loginValidation, validationMiddleware, authController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Cerrar sesión de usuario
 * @access  Private
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Obtener perfil del usuario actual
 * @access  Private
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Cambiar contraseña del usuario
 * @access  Private
 */
router.put('/change-password', authMiddleware, changePasswordValidation, validationMiddleware, authController.changePassword);

/**
 * @route   GET /api/v1/auth/verify
 * @desc    Verificar validez del token JWT
 * @access  Private
 */
router.get('/verify', authMiddleware, authController.verifyToken);

module.exports = router;
