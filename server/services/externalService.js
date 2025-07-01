// server/services/externalService.js
const { Patient, Doctor, Appointment, AuditLog } = require('../models');
const { DOCUMENT_TYPES, APPOINTMENT_STATUSES, APPOINTMENT_TYPES, AUDIT_ACTIONS } = require('../config/constants');
const { Op } = require('sequelize');

class ExternalService {
  /**
   * Validar datos de sincronización desde sistema de cobranza
   */
  static validateBillingSync(data) {
    const { patient, appointment } = data;

    if (!patient || !appointment) {
      throw new Error('Datos de paciente y cita son requeridos');
    }

    const { dni, names } = patient;
    const { doctor_id, date_time, external_code } = appointment;

    if (!dni || !names || !doctor_id || !date_time || !external_code) {
      throw new Error('DNI, nombres, médico, fecha/hora y código externo son requeridos');
    }

    // Validar formato del DNI
    if (!/^\d{8}$/.test(dni)) {
      throw new Error('DNI inválido (debe tener exactamente 8 dígitos)');
    }

    return true;
  }

  /**
   * Procesar datos de paciente desde sistema externo
   */
  static processPatientData(patientData) {
    const { dni, names, gender, email, phone, birth_date } = patientData;

    // Separar nombres (asumiendo formato "Nombres Apellido1 Apellido2")
    const nameParts = names.trim().split(' ');
    let first_name, paternal_surname, maternal_surname;

    if (nameParts.length >= 3) {
      first_name = nameParts.slice(0, -2).join(' ');
      paternal_surname = nameParts[nameParts.length - 2];
      maternal_surname = nameParts[nameParts.length - 1];
    } else if (nameParts.length === 2) {
      first_name = nameParts[0];
      paternal_surname = nameParts[1];
      maternal_surname = null;
    } else {
      first_name = names;
      paternal_surname = 'N/A';
      maternal_surname = null;
    }

    return {
      document_type: DOCUMENT_TYPES.DNI,
      document_number: dni,
      first_name,
      paternal_surname,
      maternal_surname,
      birth_date: birth_date || null,
      gender: gender || null,
      email: email ? email.toLowerCase() : null,
      phone: phone || null,
      external_code: `BILLING_${dni}`
    };
  }

  /**
   * Sincronizar paciente desde sistema externo
   */
  static async syncPatientFromBilling(patientData, userInfo) {
    const processedData = this.processPatientData(patientData);

    // Buscar paciente existente
    let patient = await Patient.findOne({
      where: {
        document_type: processedData.document_type,
        document_number: processedData.document_number,
        is_active: true
      }
    });

    if (!patient) {
      // Generar número de historia clínica
      const lastPatient = await Patient.findOne({
        order: [['created_at', 'DESC']],
        where: {
          history_number: {
            [Op.like]: 'HC%'
          }
        }
      });

      let historyNumber = 'HC000001';
      if (lastPatient && lastPatient.history_number) {
        const lastNumber = parseInt(lastPatient.history_number.replace('HC', ''));
        historyNumber = `HC${String(lastNumber + 1).padStart(6, '0')}`;
      }

      // Crear nuevo paciente
      patient = await Patient.create({
        ...processedData,
        history_number: historyNumber
      });

      // Log de creación de paciente
      await AuditLog.createLog({
        user_id: null,
        action: AUDIT_ACTIONS.CREATE,
        entity_type: 'Patient',
        entity_id: patient.id,
        new_data: patient.toJSON(),
        ip_address: userInfo.ip,
        user_agent: userInfo.userAgent,
        additional_info: {
          source: 'billing_system',
          created_from_appointment_sync: true
        }
      });
    }

    return patient;
  }

  /**
   * Sincronizar cita desde sistema de cobranza
   */
  static async syncAppointmentFromBilling(syncData, userInfo) {
    // Validar datos
    this.validateBillingSync(syncData);

    const { patient: patientData, appointment: appointmentData } = syncData;

    // Sincronizar paciente
    const patient = await this.syncPatientFromBilling(patientData, userInfo);

    // Verificar que el médico existe
    const doctor = await Doctor.findByPk(appointmentData.doctor_id);
    if (!doctor) {
      throw new Error('Médico no encontrado');
    }

    // Verificar si ya existe una cita con el mismo código externo
    let appointment = await Appointment.findOne({
      where: {
        external_code: appointmentData.external_code,
        is_active: true
      }
    });

    if (appointment) {
      // Actualizar cita existente
      const oldData = appointment.toJSON();
      
      await appointment.update({
        patient_id: patient.id,
        doctor_id: appointmentData.doctor_id,
        date_time: appointmentData.date_time,
        type: appointmentData.type || APPOINTMENT_TYPES.MEDICAL_CONSULTATION,
        description: appointmentData.description || 'Cita sincronizada desde sistema de cobranza',
        status: appointmentData.status || APPOINTMENT_STATUSES.CONFIRMED,
        price: appointmentData.price || null,
        notes: appointmentData.notes || null
      });

      // Log de actualización
      await AuditLog.createLog({
        user_id: null,
        action: AUDIT_ACTIONS.UPDATE,
        entity_type: 'Appointment',
        entity_id: appointment.id,
        old_data: oldData,
        new_data: appointment.toJSON(),
        ip_address: userInfo.ip,
        user_agent: userInfo.userAgent,
        additional_info: {
          source: 'billing_system',
          sync_type: 'update'
        }
      });
    } else {
      // Crear nueva cita
      appointment = await Appointment.create({
        patient_id: patient.id,
        doctor_id: appointmentData.doctor_id,
        date_time: appointmentData.date_time,
        type: appointmentData.type || APPOINTMENT_TYPES.MEDICAL_CONSULTATION,
        description: appointmentData.description || 'Cita sincronizada desde sistema de cobranza',
        status: appointmentData.status || APPOINTMENT_STATUSES.CONFIRMED,
        price: appointmentData.price || null,
        notes: appointmentData.notes || null,
        external_code: appointmentData.external_code
      });

      // Log de creación
      await AuditLog.createLog({
        user_id: null,
        action: AUDIT_ACTIONS.CREATE,
        entity_type: 'Appointment',
        entity_id: appointment.id,
        new_data: appointment.toJSON(),
        ip_address: userInfo.ip,
        user_agent: userInfo.userAgent,
        additional_info: {
          source: 'billing_system',
          sync_type: 'create'
        }
      });
    }

    return {
      patient,
      appointment,
      sync_status: appointment.id ? 'success' : 'error'
    };
  }

  /**
   * Obtener estado de sincronización de una cita
   */
  static async getAppointmentSyncStatus(externalCode) {
    const appointment = await Appointment.findOne({
      where: {
        external_code: externalCode,
        is_active: true
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'paternal_surname', 'maternal_surname', 'document_number']
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: require('../models').User,
              as: 'user',
              attributes: ['first_name', 'last_name']
            }
          ]
        }
      ]
    });

    if (!appointment) {
      throw new Error('Cita no encontrada con el código externo especificado');
    }

    return {
      appointment_id: appointment.id,
      external_code: appointment.external_code,
      status: appointment.status,
      date_time: appointment.date_time,
      patient: appointment.patient,
      doctor: appointment.doctor,
      last_sync: appointment.updated_at
    };
  }

  /**
   * Actualizar estado de pago desde sistema externo
   */
  static async updatePaymentStatus(paymentData, userInfo) {
    const { external_code, payment_status, payment_amount, payment_date, payment_method } = paymentData;

    if (!external_code || !payment_status) {
      throw new Error('Código externo y estado de pago son requeridos');
    }

    const appointment = await Appointment.findOne({
      where: {
        external_code,
        is_active: true
      }
    });

    if (!appointment) {
      throw new Error('Cita no encontrada con el código externo especificado');
    }

    const oldData = appointment.toJSON();

    // Actualizar información de pago
    const updateData = {
      payment_status,
      payment_amount: payment_amount || appointment.payment_amount,
      payment_date: payment_date || appointment.payment_date,
      payment_method: payment_method || appointment.payment_method
    };

    await appointment.update(updateData);

    // Log de actualización de pago
    await AuditLog.createLog({
      user_id: null,
      action: AUDIT_ACTIONS.UPDATE,
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      additional_info: {
        source: 'billing_system',
        update_type: 'payment_status',
        payment_status,
        payment_amount,
        payment_date
      }
    });

    return appointment;
  }

  /**
   * Obtener estadísticas de sincronización
   */
  static async getSyncStatistics(filters = {}) {
    const { date_from, date_to } = filters;
    
    let dateFilter = {};
    if (date_from || date_to) {
      dateFilter.created_at = {};
      if (date_from) dateFilter.created_at[Op.gte] = new Date(date_from);
      if (date_to) dateFilter.created_at[Op.lte] = new Date(date_to);
    }

    // Contar citas sincronizadas
    const syncedAppointments = await Appointment.count({
      where: {
        external_code: { [Op.ne]: null },
        is_active: true,
        ...dateFilter
      }
    });

    // Contar pacientes sincronizados
    const syncedPatients = await Patient.count({
      where: {
        external_code: { [Op.ne]: null },
        is_active: true,
        ...dateFilter
      }
    });

    // Estadísticas por estado de cita
    const statusCounts = await Appointment.findAll({
      where: {
        external_code: { [Op.ne]: null },
        is_active: true,
        ...dateFilter
      },
      attributes: [
        'status',
        [Appointment.sequelize.fn('COUNT', Appointment.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    return {
      total_synced_appointments: syncedAppointments,
      total_synced_patients: syncedPatients,
      appointments_by_status: statusCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.dataValues.count);
        return acc;
      }, {}),
      period: {
        from: date_from || 'inicio',
        to: date_to || 'presente'
      }
    };
  }

  /**
   * Validar webhook de sistema externo
   */
  static validateWebhookSignature(payload, signature, secret) {
    // Implementar validación de firma webhook si es necesario
    // Por ejemplo, usando HMAC SHA256
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature;
  }

  /**
   * Procesar webhook de sistema externo
   */
  static async processWebhook(webhookData, userInfo) {
    const { event_type, data } = webhookData;

    switch (event_type) {
      case 'appointment.created':
      case 'appointment.updated':
        return await this.syncAppointmentFromBilling(data, userInfo);
      
      case 'payment.updated':
        return await this.updatePaymentStatus(data, userInfo);
      
      default:
        throw new Error(`Tipo de evento no soportado: ${event_type}`);
    }
  }
}

module.exports = ExternalService;
