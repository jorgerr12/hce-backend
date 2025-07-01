// server/controllers/patientController.js
const PatientService = require('../services/patientService');
const { validationResult } = require('express-validator');

/**
 * Crear un nuevo paciente
 * @route POST /api/v1/patients
 * @access Private
 */
exports.createPatient = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const patient = await PatientService.createPatient(
      req.body,
      req.user.userId,
      userInfo
    );

    res.status(201).json({
      success: true,
      message: 'Paciente creado exitosamente',
      data: {
        patient: {
          id: patient.id,
          document_type: patient.document_type,
          document_number: patient.document_number,
          first_name: patient.first_name,
          paternal_surname: patient.paternal_surname,
          maternal_surname: patient.maternal_surname,
          history_number: patient.history_number,
          birth_date: patient.birth_date,
          gender: patient.gender,
          email: patient.email,
          phone: patient.phone
        }
      }
    });

  } catch (error) {
    console.error('Error al crear paciente:', error);
    
    if (error.message.includes('Ya existe') || error.message.includes('inválido')) {
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
 * Obtener lista de pacientes con filtros y paginación
 * @route GET /api/v1/patients
 * @access Private
 */
exports.getPatients = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      document_type: req.query.document_type,
      gender: req.query.gender,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : true,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };

    const result = await PatientService.getPatients(filters);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener un paciente por ID
 * @route GET /api/v1/patients/:id
 * @access Private
 */
exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await PatientService.getPatientById(id);

    res.status(200).json({
      success: true,
      data: {
        patient
      }
    });

  } catch (error) {
    console.error('Error al obtener paciente:', error);
    
    if (error.message === 'Paciente no encontrado') {
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
 * Buscar paciente por documento
 * @route GET /api/v1/patients/search
 * @access Private
 */
exports.searchByDocument = async (req, res) => {
  try {
    const { document_type, document_number } = req.query;

    if (!document_type || !document_number) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de documento y número de documento son requeridos'
      });
    }

    const patient = await PatientService.searchByDocument(document_type, document_number);

    res.status(200).json({
      success: true,
      data: {
        patient
      }
    });

  } catch (error) {
    console.error('Error al buscar paciente:', error);
    
    if (error.message === 'Paciente no encontrado con el documento especificado') {
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
 * Actualizar un paciente
 * @route PUT /api/v1/patients/:id
 * @access Private
 */
exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

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

    const patient = await PatientService.updatePatient(
      id,
      updateData,
      req.user.userId,
      userInfo
    );

    res.status(200).json({
      success: true,
      message: 'Paciente actualizado exitosamente',
      data: {
        patient: {
          id: patient.id,
          document_type: patient.document_type,
          document_number: patient.document_number,
          first_name: patient.first_name,
          paternal_surname: patient.paternal_surname,
          maternal_surname: patient.maternal_surname,
          history_number: patient.history_number,
          email: patient.email,
          phone: patient.phone,
          updated_at: patient.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    
    if (error.message === 'Paciente no encontrado' || 
        error.message.includes('Ya existe') || 
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
 * Eliminar un paciente (soft delete)
 * @route DELETE /api/v1/patients/:id
 * @access Private
 */
exports.deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await PatientService.deletePatient(
      id,
      req.user.userId,
      userInfo
    );

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    
    if (error.message === 'Paciente no encontrado') {
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
