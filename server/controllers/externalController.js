// server/controllers/externalController.js
const { validationResult } = require('express-validator');
const ExternalService = require('../services/externalService');

/**
 * Controlador de Integración Externa - API v1
 * Maneja sincronización con sistemas externos (cobranza, PACS, LIS)
 * Delega la lógica de negocio al ExternalService
 */

/**
 * Sincronizar cita desde sistema de cobranza
 * @route POST /api/v1/external/sync/appointment
 * @access Private
 */
exports.syncAppointmentFromBilling = async (req, res) => {
  try {
    const { patient: patientData, appointment: appointmentData } = req.body;

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

    const result = await ExternalService.syncAppointmentFromBilling(
      patientData,
      appointmentData,
      req.user.userId,
      userInfo
    );

    res.status(200).json({
      success: true,
      message: 'Cita sincronizada exitosamente',
      data: {
        patient: result.patient,
        appointment: result.appointment
      }
    });

  } catch (error) {
    console.error('Error al sincronizar cita:', error);
    
    if (error.message.includes('inválido') || 
        error.message.includes('requerido') ||
        error.message.includes('Ya existe')) {
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
 * Actualizar estado de pago de cita
 * @route PUT /api/v1/external/payment/status
 * @access Private
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { appointment_id, payment_status, payment_amount, payment_method, transaction_id } = req.body;

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

    const result = await ExternalService.updatePaymentStatus(
      appointment_id,
      payment_status,
      {
        payment_amount,
        payment_method,
        transaction_id
      },
      req.user.userId,
      userInfo
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        appointment: result.appointment
      }
    });

  } catch (error) {
    console.error('Error al actualizar estado de pago:', error);
    
    if (error.message === 'Cita no encontrada' ||
        error.message.includes('inválido')) {
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
 * Obtener estado de sincronización de una cita
 * @route GET /api/v1/external/sync/appointment/:external_code/status
 * @access Private
 */
exports.getAppointmentSyncStatus = async (req, res) => {
  try {
    const { external_code } = req.params;

    if (!external_code) {
      return res.status(400).json({
        success: false,
        error: 'Código externo es requerido'
      });
    }

    const result = await ExternalService.getAppointmentSyncStatus(external_code);

    res.status(200).json({
      success: true,
      data: {
        appointment: result.appointment,
        syncStatus: result.syncStatus,
        lastSync: result.lastSync
      }
    });

  } catch (error) {
    console.error('Error al obtener estado de sincronización:', error);
    
    if (error.message === 'Cita no encontrada con el código externo especificado') {
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

// Los siguientes métodos están comentados temporalmente hasta implementar en el service
// Se pueden habilitar cuando se implementen los métodos correspondientes en ExternalService

/**
 * Obtener estadísticas de sincronización
 * @route GET /api/v1/external/sync/stats
 * @access Private
 */

exports.getSyncStatistics = async (req, res) => {
  try {
    const stats = await ExternalService.getSyncStatistics();

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};


/**
 * Webhook para sistema de cobranza
 * @route POST /api/v1/external/webhook/billing
 * @access Private
 */
/*
exports.handleBillingWebhook = async (req, res) => {
  try {
    const result = await ExternalService.handleBillingWebhook(req.body);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error en webhook de cobranza:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
*/

/**
 * Webhook para sistema PACS
 * @route POST /api/v1/external/webhook/pacs
 * @access Private
 */
/*
exports.handlePacsWebhook = async (req, res) => {
  try {
    const result = await ExternalService.handlePacsWebhook(req.body);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error en webhook PACS:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
*/

/**
 * Webhook para sistema LIS
 * @route POST /api/v1/external/webhook/lis
 * @access Private
 */
/*
exports.handleLisWebhook = async (req, res) => {
  try {
    const result = await ExternalService.handleLisWebhook(req.body);

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error en webhook LIS:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
*/
