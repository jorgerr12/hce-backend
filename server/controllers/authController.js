// server/controllers/authController.js
const { validationResult } = require('express-validator');
const AuthService = require('../services/authService');

/**
 * Controlador de autenticación - API v1
 * Maneja login, logout, cambio de contraseña y perfil de usuario
 * Delega la lógica de negocio al AuthService
 */

/**
 * Login de usuario
 * @route POST /api/v1/auth/login
 * @access Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await AuthService.loginUser(email, password, userInfo);

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: result.user,
        token: result.token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    
    if (error.message === 'Credenciales inválidas' || 
        error.message === 'Usuario no encontrado') {
      return res.status(401).json({
        success: false,
        error: 'Email o contraseña incorrectos'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Logout de usuario
 * @route POST /api/v1/auth/logout
 * @access Private
 */
exports.logout = async (req, res) => {
  try {
    const userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await AuthService.logout(req.user.userId, userInfo);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener perfil del usuario actual
 * @route GET /api/v1/auth/profile
 * @access Private
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await AuthService.getProfile(req.user.userId);

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Cambiar contraseña
 * @route PUT /api/v1/auth/change-password
 * @access Private
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await AuthService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword,
      userInfo
    );

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    
    if (error.message === 'Usuario no encontrado' || 
        error.message === 'Contraseña actual incorrecta' ||
        error.message.includes('debe tener al menos')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Verificar token (middleware endpoint)
 * @route GET /api/v1/auth/verify
 * @access Private
 */
exports.verifyToken = async (req, res) => {
  try {
    // Si llegamos aquí, el token es válido (verificado por authMiddleware)
    res.status(200).json({
      success: true,
      valid: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

