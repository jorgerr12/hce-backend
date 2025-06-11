// server/middleware/roleMiddleware.js
const { USER_ROLES } = require('../config/constants');

// Middleware para verificar roles específicos
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación para acceder a este recurso'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para acceder a este recurso',
        required_roles: allowedRoles,
        user_role: req.user.role
      });
    }

    next();
  };
};

// Middleware para verificar si es administrador
const requireAdmin = requireRole(USER_ROLES.ADMIN);

// Middleware para verificar si es médico
const requireDoctor = requireRole(USER_ROLES.DOCTOR);

// Middleware para verificar si es médico o administrador
const requireDoctorOrAdmin = requireRole(USER_ROLES.DOCTOR, USER_ROLES.ADMIN);

// Middleware para verificar si es personal médico (médico o enfermero)
const requireMedicalStaff = requireRole(USER_ROLES.DOCTOR, USER_ROLES.NURSE);

// Middleware para verificar si es personal autorizado (todos excepto recepcionista para ciertas operaciones)
const requireAuthorizedStaff = requireRole(USER_ROLES.ADMIN, USER_ROLES.DOCTOR, USER_ROLES.NURSE);

// Middleware para verificar acceso a datos de paciente
const requirePatientAccess = (req, res, next) => {
  const userRole = req.user.role;
  
  // Administradores y médicos tienen acceso completo
  if ([USER_ROLES.ADMIN, USER_ROLES.DOCTOR].includes(userRole)) {
    return next();
  }
  
  // Enfermeros pueden ver pero no modificar ciertos datos
  if (userRole === USER_ROLES.NURSE) {
    // Verificar si es una operación de lectura
    if (['GET'].includes(req.method)) {
      return next();
    } else {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Los enfermeros solo pueden consultar información de pacientes'
      });
    }
  }
  
  // Recepcionistas tienen acceso limitado
  if (userRole === USER_ROLES.RECEPTIONIST) {
    // Solo pueden acceder a información básica de pacientes
    if (req.method === 'GET' && (req.path.includes('/search') || req.path.includes('/basic'))) {
      return next();
    } else {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Acceso limitado a información de pacientes'
      });
    }
  }
  
  return res.status(403).json({
    error: 'Acceso denegado',
    message: 'No tienes permisos para acceder a información de pacientes'
  });
};

// Middleware para verificar acceso a consultas médicas
const requireConsultationAccess = (req, res, next) => {
  const userRole = req.user.role;
  
  // Solo médicos y administradores pueden acceder a consultas médicas
  if ([USER_ROLES.ADMIN, USER_ROLES.DOCTOR].includes(userRole)) {
    return next();
  }
  
  return res.status(403).json({
    error: 'Acceso denegado',
    message: 'Solo médicos y administradores pueden acceder a consultas médicas'
  });
};

// Middleware para verificar si el médico puede acceder a sus propias citas
const requireOwnAppointmentsOrAdmin = async (req, res, next) => {
  const userRole = req.user.role;
  
  // Administradores tienen acceso completo
  if (userRole === USER_ROLES.ADMIN) {
    return next();
  }
  
  // Médicos solo pueden acceder a sus propias citas
  if (userRole === USER_ROLES.DOCTOR && req.user.doctorProfile) {
    // Si se especifica doctor_id en query o params, verificar que sea el mismo
    const requestedDoctorId = req.query.doctor_id || req.params.doctor_id;
    
    if (requestedDoctorId && requestedDoctorId !== req.user.doctorProfile.id) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo puedes acceder a tus propias citas'
      });
    }
    
    // Agregar filtro automático por doctor_id
    req.query.doctor_id = req.user.doctorProfile.id;
    return next();
  }
  
  return res.status(403).json({
    error: 'Acceso denegado',
    message: 'No tienes permisos para acceder a esta información'
  });
};

module.exports = {
  requireRole,
  requireAdmin,
  requireDoctor,
  requireDoctorOrAdmin,
  requireMedicalStaff,
  requireAuthorizedStaff,
  requirePatientAccess,
  requireConsultationAccess,
  requireOwnAppointmentsOrAdmin
};

