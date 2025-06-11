// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User, Doctor } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.header('x-auth-token');

    if (!token) {
      return res.status(401).json({
        error: 'Acceso denegado',
        message: 'No se proporcionó token de autenticación'
      });
    }

    try {
      // Verificar y decodificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verificar que el usuario aún existe y está activo
      const user = await User.findOne({
        where: { 
          id: decoded.userId, 
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
          error: 'Token inválido',
          message: 'Usuario no encontrado o inactivo'
        });
      }

      // Agregar información del usuario al request
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        doctorProfile: user.doctorProfile
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          message: 'El token de autenticación ha expirado'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Token inválido',
          message: 'El token de autenticación no es válido'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

module.exports = authMiddleware;

