// server/services/patientService.js
const { Patient, Appointment, AuditLog } = require('../models');
const { DOCUMENT_TYPES, AUDIT_ACTIONS } = require('../config/constants');
const { Op } = require('sequelize');

class PatientService {
  /**
   * Validar datos del paciente
   */
  static validatePatientData(patientData) {
    const { document_type, document_number, first_name, paternal_surname } = patientData;

    if (!document_type || !document_number || !first_name || !paternal_surname) {
      throw new Error('Tipo de documento, número de documento, nombre y apellido paterno son requeridos');
    }

    // Validar formato del DNI si es peruano
    if (document_type === DOCUMENT_TYPES.DNI && !/^\d{8}$/.test(document_number)) {
      throw new Error('DNI inválido (debe tener exactamente 8 dígitos)');
    }

    return true;
  }

  /**
   * Verificar si existe un paciente con el mismo documento
   */
  static async checkExistingPatient(document_type, document_number) {
    return await Patient.findOne({
      where: {
        document_type,
        document_number,
        is_active: true
      }
    });
  }

  /**
   * Generar número de historia clínica único
   */
  static async generateHistoryNumber() {
    const lastPatient = await Patient.findOne({
      order: [['created_at', 'DESC']],
      where: {
        history_number: {
          [Op.like]: 'HC%'
        }
      }
    });

    if (lastPatient && lastPatient.history_number) {
      const lastNumber = parseInt(lastPatient.history_number.replace('HC', ''));
      return `HC${String(lastNumber + 1).padStart(6, '0')}`;
    }

    return 'HC000001';
  }

  /**
   * Crear un nuevo paciente
   */
  static async createPatient(patientData, userId, userInfo) {
    // Validar datos
    this.validatePatientData(patientData);

    const { document_type, document_number } = patientData;

    // Verificar si ya existe
    const existingPatient = await this.checkExistingPatient(document_type, document_number);
    if (existingPatient) {
      throw new Error('Ya existe un paciente con este tipo y número de documento');
    }

    // Generar número de historia clínica si no se proporciona
    let historyNumber = patientData.history_number;
    if (!historyNumber) {
      historyNumber = await this.generateHistoryNumber();
    } else {
      // Verificar que el número de historia no esté en uso
      const existingHistory = await Patient.findOne({
        where: {
          history_number: historyNumber,
          is_active: true
        }
      });

      if (existingHistory) {
        throw new Error('El número de historia clínica ya está en uso');
      }
    }

    // Crear el paciente
    const patient = await Patient.create({
      ...patientData,
      history_number: historyNumber,
      email: patientData.email ? patientData.email.toLowerCase() : null
    });

    // Registrar auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.CREATE,
      entity_type: 'Patient',
      entity_id: patient.id,
      new_data: patient.toJSON(),
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent
    });

    return patient;
  }

  /**
   * Obtener lista de pacientes con filtros y paginación
   */
  static async getPatients(filters = {}) {
    const {
      search,
      document_type,
      gender,
      is_active = true,
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = filters;

    const offset = (page - 1) * limit;
    const whereClause = { is_active };

    // Filtros específicos
    if (document_type) {
      whereClause.document_type = document_type;
    }

    if (gender) {
      whereClause.gender = gender;
    }

    // Búsqueda por texto
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { paternal_surname: { [Op.iLike]: `%${search}%` } },
        { maternal_surname: { [Op.iLike]: `%${search}%` } },
        { document_number: { [Op.iLike]: `%${search}%` } },
        { history_number: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Patient.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort_by, sort_order.toUpperCase()]],
      attributes: {
        exclude: ['created_at', 'updated_at']
      }
    });

    return {
      patients: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_records: count,
        records_per_page: parseInt(limit)
      }
    };
  }

  /**
   * Obtener un paciente por ID
   */
  static async getPatientById(patientId) {
    const patient = await Patient.findOne({
      where: {
        id: patientId,
        is_active: true
      },
      include: [
        {
          model: Appointment,
          as: 'appointments',
          where: { is_active: true },
          required: false,
          limit: 5,
          order: [['date_time', 'DESC']]
        }
      ]
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    return patient;
  }

  /**
   * Buscar paciente por documento
   */
  static async searchByDocument(document_type, document_number) {
    const patient = await Patient.findOne({
      where: {
        document_type,
        document_number,
        is_active: true
      }
    });

    if (!patient) {
      throw new Error('Paciente no encontrado con el documento especificado');
    }

    return patient;
  }

  /**
   * Actualizar un paciente
   */
  static async updatePatient(patientId, updateData, userId, userInfo) {
    const patient = await Patient.findOne({
      where: {
        id: patientId,
        is_active: true
      }
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    // Validar datos si se están actualizando campos críticos
    if (updateData.document_type || updateData.document_number || 
        updateData.first_name || updateData.paternal_surname) {
      this.validatePatientData({
        document_type: updateData.document_type || patient.document_type,
        document_number: updateData.document_number || patient.document_number,
        first_name: updateData.first_name || patient.first_name,
        paternal_surname: updateData.paternal_surname || patient.paternal_surname
      });
    }

    // Verificar duplicados si se cambia el documento
    if ((updateData.document_type && updateData.document_type !== patient.document_type) ||
        (updateData.document_number && updateData.document_number !== patient.document_number)) {
      
      const existingPatient = await this.checkExistingPatient(
        updateData.document_type || patient.document_type,
        updateData.document_number || patient.document_number
      );

      if (existingPatient && existingPatient.id !== patient.id) {
        throw new Error('Ya existe otro paciente con este tipo y número de documento');
      }
    }

    const oldData = patient.toJSON();

    // Actualizar email en minúsculas si se proporciona
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    await patient.update(updateData);

    // Registrar auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity_type: 'Patient',
      entity_id: patient.id,
      old_data: oldData,
      new_data: patient.toJSON(),
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent
    });

    return patient;
  }

  /**
   * Eliminar un paciente (soft delete)
   */
  static async deletePatient(patientId, userId, userInfo) {
    const patient = await Patient.findOne({
      where: {
        id: patientId,
        is_active: true
      }
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    const oldData = patient.toJSON();

    await patient.update({ is_active: false });

    // Registrar auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.DELETE,
      entity_type: 'Patient',
      entity_id: patient.id,
      old_data: oldData,
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      additional_info: {
        soft_delete: true
      }
    });

    return { message: 'Paciente eliminado correctamente' };
  }
}

module.exports = PatientService;
