// server/middleware/auditMiddleware.js
const { AuditLog } = require('../models');
const { AUDIT_ACTIONS } = require('../config/constants');

// Middleware para logging automático de auditoría
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // Guardar el método original de res.json para interceptar la respuesta
    const originalJson = res.json;
    
    res.json = function(data) {
      // Llamar al método original primero
      const result = originalJson.call(this, data);
      
      // Solo crear log si la operación fue exitosa (status 2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Ejecutar el logging de forma asíncrona sin bloquear la respuesta
        setImmediate(async () => {
          try {
            await createAuditLog(req, res, action, entityType, data);
          } catch (error) {
            console.error('Error al crear log de auditoría:', error);
          }
        });
      }
      
      return result;
    };
    
    next();
  };
};

// Función para crear el log de auditoría
const createAuditLog = async (req, res, action, entityType, responseData) => {
  try {
    const logData = {
      user_id: req.user ? req.user.userId : null,
      action: action || getActionFromMethod(req.method),
      entity_type: entityType,
      entity_id: extractEntityId(req, responseData),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      additional_info: {
        method: req.method,
        path: req.path,
        query: req.query,
        timestamp: new Date().toISOString()
      }
    };

    // Agregar datos específicos según el tipo de operación
    if (req.method === 'POST' && responseData) {
      logData.new_data = extractRelevantData(responseData);
    } else if (req.method === 'PUT' && req.body) {
      logData.new_data = req.body;
    } else if (req.method === 'DELETE') {
      logData.additional_info.deleted = true;
    }

    await AuditLog.createLog(logData);
  } catch (error) {
    console.error('Error en createAuditLog:', error);
  }
};

// Función para determinar la acción basada en el método HTTP
const getActionFromMethod = (method) => {
  switch (method) {
    case 'POST':
      return AUDIT_ACTIONS.CREATE;
    case 'PUT':
    case 'PATCH':
      return AUDIT_ACTIONS.UPDATE;
    case 'DELETE':
      return AUDIT_ACTIONS.DELETE;
    default:
      return 'read';
  }
};

// Función para extraer el ID de la entidad
const extractEntityId = (req, responseData) => {
  // Intentar obtener ID de los parámetros de la URL
  if (req.params.id) {
    return req.params.id;
  }
  
  // Intentar obtener ID de la respuesta
  if (responseData) {
    if (responseData.id) {
      return responseData.id;
    }
    if (responseData.patient && responseData.patient.id) {
      return responseData.patient.id;
    }
    if (responseData.appointment && responseData.appointment.id) {
      return responseData.appointment.id;
    }
  }
  
  return null;
};

// Función para extraer datos relevantes de la respuesta
const extractRelevantData = (responseData) => {
  if (!responseData) return null;
  
  // Remover datos sensibles o innecesarios
  const sensitiveFields = ['password', 'token', 'secret'];
  const cleanData = JSON.parse(JSON.stringify(responseData));
  
  const removeSensitiveFields = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          removeSensitiveFields(obj[key]);
        }
      }
    }
  };
  
  removeSensitiveFields(cleanData);
  return cleanData;
};

// Middleware específicos para diferentes entidades
const auditPatient = auditMiddleware(null, 'Patient');
const auditAppointment = auditMiddleware(null, 'Appointment');
const auditConsultation = auditMiddleware(null, 'Consultation');
const auditPrescription = auditMiddleware(null, 'Prescription');
const auditUser = auditMiddleware(null, 'User');

// Middleware para operaciones críticas que siempre deben ser auditadas
const criticalAuditMiddleware = (entityType, customAction = null) => {
  return async (req, res, next) => {
    // Guardar datos originales para comparación en operaciones de actualización
    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        // Aquí podrías obtener los datos originales de la base de datos
        // para compararlos con los nuevos datos
        req.originalData = await getOriginalData(entityType, req.params.id);
      } catch (error) {
        console.error('Error al obtener datos originales:', error);
      }
    }
    
    // Continuar con el middleware de auditoría normal
    return auditMiddleware(customAction, entityType)(req, res, next);
  };
};

// Función auxiliar para obtener datos originales (implementación básica)
const getOriginalData = async (entityType, entityId) => {
  try {
    const models = require('../models');
    const Model = models[entityType];
    
    if (Model && entityId) {
      const entity = await Model.findByPk(entityId);
      return entity ? entity.toJSON() : null;
    }
  } catch (error) {
    console.error('Error al obtener datos originales:', error);
  }
  
  return null;
};

module.exports = {
  auditMiddleware,
  auditPatient,
  auditAppointment,
  auditConsultation,
  auditPrescription,
  auditUser,
  criticalAuditMiddleware
};

