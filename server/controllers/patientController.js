// server/controllers/patientController.js
const { Patient, Appointment, AuditLog } = require('../models');
const { DOCUMENT_TYPES, AUDIT_ACTIONS } = require('../config/constants');
const { Op } = require('sequelize');

// Crear un nuevo paciente
exports.createPatient = async (req, res) => {
  try {
    const {
      document_type,
      document_number,
      first_name,
      paternal_surname,
      maternal_surname,
      history_number,
      external_code,
      birth_date,
      gender,
      email,
      phone,
      address,
      emergency_contact_name,
      emergency_contact_phone
    } = req.body;

    // Validaciones básicas
    if (!document_type || !document_number || !first_name || !paternal_surname) {
      return res.status(400).json({
        error: 'Tipo de documento, número de documento, nombre y apellido paterno son requeridos'
      });
    }

    // Validar formato del DNI si es peruano
    if (document_type === DOCUMENT_TYPES.DNI && !/^\d{8}$/.test(document_number)) {
      return res.status(400).json({
        error: 'DNI inválido (debe tener exactamente 8 dígitos)'
      });
    }

    // Verificar si ya existe un paciente con el mismo documento
    const existingPatient = await Patient.findOne({
      where: {
        document_type,
        document_number,
        is_active: true
      }
    });

    if (existingPatient) {
      return res.status(409).json({
        error: 'Ya existe un paciente con este tipo y número de documento'
      });
    }

    // Generar número de historia si no se proporciona
    let finalHistoryNumber = history_number;
    if (!finalHistoryNumber) {
      const lastPatient = await Patient.findOne({
        order: [['created_at', 'DESC']],
        attributes: ['history_number']
      });
      
      let nextNumber = 1;
      if (lastPatient && lastPatient.history_number) {
        const match = lastPatient.history_number.match(/HCE-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      finalHistoryNumber = `HCE-${nextNumber.toString().padStart(6, '0')}`;
    }

    // Crear el paciente
    const patient = await Patient.create({
      document_type,
      document_number,
      first_name,
      paternal_surname,
      maternal_surname,
      history_number: finalHistoryNumber,
      external_code,
      birth_date,
      gender,
      email: email ? email.toLowerCase() : null,
      phone,
      address,
      emergency_contact_name,
      emergency_contact_phone
    });

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: req.user.userId,
      action: AUDIT_ACTIONS.CREATE,
      entity_type: 'Patient',
      entity_id: patient.id,
      new_data: patient.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'Paciente creado exitosamente',
      patient: {
        id: patient.id,
        document_type: patient.document_type,
        document_number: patient.document_number,
        full_name: patient.getFullName(),
        history_number: patient.history_number,
        created_at: patient.created_at
      }
    });

  } catch (error) {
    console.error('Error al crear paciente:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Ya existe un paciente con este número de historia clínica'
      });
    }
    
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener lista de pacientes con filtros y paginación
exports.getPatients = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      document_type,
      gender,
      is_active = true
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { is_active };

    // Agregar filtros
    if (document_type) {
      whereClause.document_type = document_type;
    }

    if (gender) {
      whereClause.gender = gender;
    }

    // Búsqueda por texto (nombre, apellido, documento o historia)
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { paternal_surname: { [Op.iLike]: `%${search}%` } },
        { maternal_surname: { [Op.iLike]: `%${search}%` } },
        { document_number: { [Op.iLike]: `%${search}%` } },
        { history_number: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: patients } = await Patient.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['updated_at'] }
    });

    // Agregar información calculada
    const patientsWithInfo = patients.map(patient => ({
      ...patient.toJSON(),
      full_name: patient.getFullName(),
      age: patient.getAge()
    }));

    res.status(200).json({
      patients: patientsWithInfo,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_records: count,
        records_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener un paciente por ID
exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findOne({
      where: { 
        id, 
        is_active: true 
      },
      include: [
        {
          model: Appointment,
          as: 'appointments',
          where: { is_active: true },
          required: false,
          order: [['date_time', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    const patientData = {
      ...patient.toJSON(),
      full_name: patient.getFullName(),
      age: patient.getAge()
    };

    res.status(200).json({
      patient: patientData
    });

  } catch (error) {
    console.error('Error al obtener paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Buscar paciente por documento
exports.searchByDocument = async (req, res) => {
  try {
    const { document_type, document_number } = req.query;

    if (!document_type || !document_number) {
      return res.status(400).json({
        error: 'Tipo de documento y número de documento son requeridos'
      });
    }

    const patient = await Patient.findOne({
      where: {
        document_type,
        document_number,
        is_active: true
      }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    const patientData = {
      ...patient.toJSON(),
      full_name: patient.getFullName(),
      age: patient.getAge()
    };

    res.status(200).json({
      patient: patientData
    });

  } catch (error) {
    console.error('Error al buscar paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Actualizar un paciente
exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Buscar el paciente
    const patient = await Patient.findOne({
      where: { id, is_active: true }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    // Guardar datos anteriores para auditoría
    const oldData = patient.toJSON();

    // Validar DNI si se está actualizando
    if (updateData.document_type === DOCUMENT_TYPES.DNI && 
        updateData.document_number && 
        !/^\d{8}$/.test(updateData.document_number)) {
      return res.status(400).json({
        error: 'DNI inválido (debe tener exactamente 8 dígitos)'
      });
    }

    // Verificar duplicados si se cambia el documento
    if (updateData.document_type || updateData.document_number) {
      const existingPatient = await Patient.findOne({
        where: {
          document_type: updateData.document_type || patient.document_type,
          document_number: updateData.document_number || patient.document_number,
          is_active: true,
          id: { [Op.ne]: id }
        }
      });

      if (existingPatient) {
        return res.status(409).json({
          error: 'Ya existe otro paciente con este tipo y número de documento'
        });
      }
    }

    // Actualizar email a minúsculas si se proporciona
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    // Actualizar el paciente
    await patient.update(updateData);

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: req.user.userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity_type: 'Patient',
      entity_id: patient.id,
      old_data: oldData,
      new_data: patient.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.status(200).json({
      message: 'Paciente actualizado exitosamente',
      patient: {
        id: patient.id,
        full_name: patient.getFullName(),
        history_number: patient.history_number,
        updated_at: patient.updated_at
      }
    });

  } catch (error) {
    console.error('Error al actualizar paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Eliminar un paciente (soft delete)
exports.deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findOne({
      where: { id, is_active: true }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    // Guardar datos para auditoría
    const oldData = patient.toJSON();

    // Soft delete
    await patient.update({ is_active: false });

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: req.user.userId,
      action: AUDIT_ACTIONS.DELETE,
      entity_type: 'Patient',
      entity_id: patient.id,
      old_data: oldData,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.status(200).json({
      message: 'Paciente eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

