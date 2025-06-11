// server/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Doctor, AuditLog } = require('../models');
const { AUDIT_ACTIONS } = require('../config/constants');

// Generar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
    }
  );
};

// Login de usuario
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que se proporcionen email y password
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({
      where: { 
        email: email.toLowerCase(),
        is_active: true 
      },
      include: [
        {
          model: Doctor,
          as: 'doctorProfile',
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Actualizar último login
    await user.update({ last_login: new Date() });

    // Generar token
    const token = generateToken(user);

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: user.id,
      action: AUDIT_ACTIONS.LOGIN,
      entity_type: 'User',
      entity_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      additional_info: {
        login_time: new Date(),
        email: user.email
      }
    });

    // Preparar respuesta (sin incluir la contraseña)
    const userResponse = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      last_login: user.last_login,
      doctorProfile: user.doctorProfile
    };

    res.status(200).json({
      message: 'Login exitoso',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Logout de usuario
exports.logout = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.LOGOUT,
      entity_type: 'User',
      entity_id: userId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      additional_info: {
        logout_time: new Date()
      }
    });

    res.status(200).json({
      message: 'Logout exitoso'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener perfil del usuario actual
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Doctor,
          as: 'doctorProfile',
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      user
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Cambiar contraseña
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validar datos requeridos
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    // Validar longitud de nueva contraseña
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Buscar usuario
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Contraseña actual incorrecta'
      });
    }

    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await user.update({ password: hashedNewPassword });

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: 'change_password',
      entity_type: 'User',
      entity_id: userId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      additional_info: {
        change_time: new Date()
      }
    });

    res.status(200).json({
      message: 'Contraseña cambiada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Verificar token (middleware endpoint)
exports.verifyToken = async (req, res) => {
  try {
    // Si llegamos aquí, el token es válido (verificado por authMiddleware)
    res.status(200).json({
      valid: true,
      user: req.user
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

