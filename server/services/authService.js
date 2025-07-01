// server/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Doctor, AuditLog } = require('../models');
const { USER_ROLES, AUDIT_ACTIONS } = require('../config/constants');

class AuthService {
  /**
   * Generar JWT token
   */
  static generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  }

  /**
   * Verificar credenciales de usuario
   */
  static async validateCredentials(email, password) {
    if (!email || !password) {
      throw new Error('Email y contraseña son requeridos');
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
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    return user;
  }

  /**
   * Autenticar usuario y generar token
   */
  static async authenticateUser(email, password, userInfo) {
    const user = await this.validateCredentials(email, password);

    // Generar token
    const token = this.generateToken(user);

    // Preparar datos de respuesta
    const userData = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
      doctorProfile: user.doctorProfile || null
    };

    // Registrar auditoría de login
    await AuditLog.createLog({
      user_id: user.id,
      action: AUDIT_ACTIONS.LOGIN,
      entity_type: 'User',
      entity_id: user.id,
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      additional_info: {
        login_time: new Date().toISOString(),
        role: user.role
      }
    });

    return {
      token,
      user: userData
    };
  }

  /**
   * Validar datos de usuario para registro
   */
  static validateUserRegistration(userData) {
    const { email, password, first_name, last_name, role } = userData;

    if (!email || !password || !first_name || !last_name || !role) {
      throw new Error('Email, contraseña, nombre, apellido y rol son requeridos');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Formato de email inválido');
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    // Validar rol
    if (!Object.values(USER_ROLES).includes(role)) {
      throw new Error('Rol inválido');
    }

    return true;
  }

  /**
   * Verificar si el email ya existe
   */
  static async checkEmailExists(email) {
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase()
      }
    });

    return existingUser !== null;
  }

  /**
   * Crear nuevo usuario
   */
  static async createUser(userData, createdByUserId, userInfo) {
    // Validar datos
    this.validateUserRegistration(userData);

    const { email, password, first_name, last_name, role, is_active = true } = userData;

    // Verificar si el email ya existe
    const emailExists = await this.checkEmailExists(email);
    if (emailExists) {
      throw new Error('Ya existe un usuario con este email');
    }

    // Encriptar contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      first_name,
      last_name,
      role,
      is_active
    });

    // Registrar auditoría
    await AuditLog.createLog({
      user_id: createdByUserId,
      action: AUDIT_ACTIONS.CREATE,
      entity_type: 'User',
      entity_id: user.id,
      new_data: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active
      },
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent
    });

    // Retornar usuario sin contraseña
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * Cambiar contraseña de usuario
   */
  static async changePassword(userId, currentPassword, newPassword, userInfo) {
    if (!currentPassword || !newPassword) {
      throw new Error('Contraseña actual y nueva contraseña son requeridas');
    }

    if (newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }

    // Buscar usuario
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidCurrentPassword) {
      throw new Error('Contraseña actual incorrecta');
    }

    // Encriptar nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    await user.update({ password: hashedNewPassword });

    // Registrar auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity_type: 'User',
      entity_id: user.id,
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      additional_info: {
        action_type: 'password_change',
        timestamp: new Date().toISOString()
      }
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Obtener perfil de usuario
   */
  static async getUserProfile(userId) {
    const user = await User.findOne({
      where: {
        id: userId,
        is_active: true
      },
      include: [
        {
          model: Doctor,
          as: 'doctorProfile',
          required: false
        }
      ],
      attributes: {
        exclude: ['password']
      }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }
  /**
   * Logout de usuario (registrar en auditoría)
   */

  static async loginUser(email, password, userInfo) {


    // Validar que se proporcionen email y password
    if (!email || !password) {
      throw new Error('Email y contraseña son requeridos');
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
      throw new Error('Usuario no encontrado');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // Actualizar último login
    await user.update({ last_login: new Date() });

    // Generar token
    const token = this.generateToken(user);

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: user.id,
      action: AUDIT_ACTIONS.LOGIN,
      entity_type: 'User',
      entity_id: user.id,
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
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

    return {
      message: 'Login exitoso',
      token,
      user: userResponse
    };
  }
    

  /**
   * Logout de usuario (registrar en auditoría)
   */
  static async logoutUser(userId, userInfo) {
    // Registrar auditoría de logout
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.LOGOUT,
      entity_type: 'User',
      entity_id: userId,
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      additional_info: {
        logout_time: new Date().toISOString()
      }
    });

    return { message: 'Logout exitoso' };
  }

  /**
   * Verificar permisos de usuario
   */
  static hasPermission(userRole, requiredRoles) {
    if (!Array.isArray(requiredRoles)) {
      requiredRoles = [requiredRoles];
    }

    return requiredRoles.includes(userRole);
  }

  /**
   * Verificar si el usuario es administrador
   */
  static isAdmin(userRole) {
    return userRole === USER_ROLES.ADMIN;
  }

  /**
   * Verificar si el usuario es médico
   */
  static isDoctor(userRole) {
    return userRole === USER_ROLES.DOCTOR;
  }
}

module.exports = AuthService;
