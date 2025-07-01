// server/services/appointmentService.js
const { Appointment, Patient, Doctor, User, Consultation, AuditLog } = require('../models');
const { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, AUDIT_ACTIONS } = require('../config/constants');
const { Op } = require('sequelize');

class AppointmentService {
  /**
   * Validar datos de cita
   */
  static validateAppointmentData(appointmentData) {
    const { patient_id, doctor_id, date_time } = appointmentData;

    if (!patient_id || !doctor_id || !date_time) {
      throw new Error('ID de paciente, ID de médico y fecha/hora son requeridos');
    }

    // Validar que la fecha no sea en el pasado
    const appointmentDate = new Date(date_time);
    const now = new Date();
    
    if (appointmentDate < now) {
      throw new Error('No se puede agendar una cita en el pasado');
    }

    return true;
  }

  /**
   * Verificar disponibilidad del médico
   */
  static async checkDoctorAvailability(doctor_id, date_time, excludeAppointmentId = null) {
    const appointmentDate = new Date(date_time);
    const startTime = new Date(appointmentDate.getTime() - 30 * 60000); // 30 minutos antes
    const endTime = new Date(appointmentDate.getTime() + 30 * 60000); // 30 minutos después

    const whereClause = {
      doctor_id,
      date_time: {
        [Op.between]: [startTime, endTime]
      },
      status: {
        [Op.notIn]: [APPOINTMENT_STATUSES.CANCELLED]
      },
      is_active: true
    };

    // Excluir cita actual si es una actualización
    if (excludeAppointmentId) {
      whereClause.id = { [Op.ne]: excludeAppointmentId };
    }

    const conflictingAppointment = await Appointment.findOne({
      where: whereClause
    });

    return conflictingAppointment === null;
  }

  /**
   * Verificar que el médico existe y está activo
   */
  static async validateDoctor(doctor_id) {
    const doctor = await Doctor.findOne({
      where: {
        id: doctor_id,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'user',
          where: { is_active: true }
        }
      ]
    });

    if (!doctor) {
      throw new Error('Médico no encontrado o inactivo');
    }

    return doctor;
  }

  /**
   * Verificar que el paciente existe y está activo
   */
  static async validatePatient(patient_id) {
    const patient = await Patient.findOne({
      where: {
        id: patient_id,
        is_active: true
      }
    });

    if (!patient) {
      throw new Error('Paciente no encontrado o inactivo');
    }

    return patient;
  }

  /**
   * Crear una nueva cita
   */
  static async createAppointment(appointmentData, userId, userInfo) {
    // Validar datos básicos
    this.validateAppointmentData(appointmentData);

    const { patient_id, doctor_id, date_time } = appointmentData;

    // Validar que el paciente existe
    await this.validatePatient(patient_id);

    // Validar que el médico existe
    await this.validateDoctor(doctor_id);

    // Verificar disponibilidad del médico
    const isAvailable = await this.checkDoctorAvailability(doctor_id, date_time);
    if (!isAvailable) {
      throw new Error('El médico no está disponible en el horario seleccionado');
    }

    // Crear la cita
    const appointment = await Appointment.create({
      ...appointmentData,
      status: appointmentData.status || APPOINTMENT_STATUSES.PENDING,
      type: appointmentData.type || APPOINTMENT_TYPES.MEDICAL_CONSULTATION
    });

    // Registrar auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.CREATE,
      entity_type: 'Appointment',
      entity_id: appointment.id,
      new_data: appointment.toJSON(),
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent
    });

    return appointment;
  }

  /**
   * Obtener lista de citas con filtros
   */
  static async getAppointments(filters = {}) {
    const {
      doctor_id,
      patient_id,
      date_from,
      date_to,
      status,
      type,
      page = 1,
      limit = 10,
      sort_by = 'date_time',
      sort_order = 'ASC'
    } = filters;

    const offset = (page - 1) * limit;
    const whereClause = { is_active: true };

    // Aplicar filtros
    if (doctor_id) whereClause.doctor_id = doctor_id;
    if (patient_id) whereClause.patient_id = patient_id;
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    // Filtro de fechas
    if (date_from || date_to) {
      whereClause.date_time = {};
      if (date_from) whereClause.date_time[Op.gte] = new Date(date_from);
      if (date_to) whereClause.date_time[Op.lte] = new Date(date_to);
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'paternal_surname', 'maternal_surname', 'document_number', 'history_number']
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['first_name', 'last_name']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort_by, sort_order.toUpperCase()]]
    });

    return {
      appointments: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_records: count,
        records_per_page: parseInt(limit)
      }
    };
  }

  /**
   * Obtener una cita por ID
   */
  static async getAppointmentById(appointmentId) {
    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        is_active: true
      },
      include: [
        {
          model: Patient,
          as: 'patient'
        },
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['first_name', 'last_name', 'email']
            }
          ]
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false
        }
      ]
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    return appointment;
  }

  /**
   * Actualizar una cita
   */
  static async updateAppointment(appointmentId, updateData, userId, userInfo) {
    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        is_active: true
      }
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    // Si se está actualizando la fecha/hora o el médico, verificar disponibilidad
    if (updateData.date_time || updateData.doctor_id) {
      const newDateTime = updateData.date_time || appointment.date_time;
      const newDoctorId = updateData.doctor_id || appointment.doctor_id;

      // Validar que no sea en el pasado
      if (updateData.date_time) {
        const appointmentDate = new Date(updateData.date_time);
        const now = new Date();
        
        if (appointmentDate < now) {
          throw new Error('No se puede reprogramar una cita en el pasado');
        }
      }

      // Verificar disponibilidad del médico
      const isAvailable = await this.checkDoctorAvailability(newDoctorId, newDateTime, appointmentId);
      if (!isAvailable) {
        throw new Error('El médico no está disponible en el horario seleccionado');
      }
    }

    const oldData = appointment.toJSON();
    await appointment.update(updateData);

    // Registrar auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent
    });

    return appointment;
  }

  /**
   * Cancelar una cita
   */
  static async cancelAppointment(appointmentId, reason, userId, userInfo) {
    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        is_active: true
      }
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (appointment.status === APPOINTMENT_STATUSES.CANCELLED) {
      throw new Error('La cita ya está cancelada');
    }

    if (appointment.status === APPOINTMENT_STATUSES.ATTENDED) {
      throw new Error('No se puede cancelar una cita que ya fue atendida');
    }

    const oldData = appointment.toJSON();
    await appointment.update({
      status: APPOINTMENT_STATUSES.CANCELLED,
      notes: reason || 'Cita cancelada'
    });

    // Registrar auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      additional_info: {
        action_type: 'cancellation',
        reason: reason
      }
    });

    return appointment;
  }

  /**
   * Marcar cita como atendida
   */
  static async markAsAttended(appointmentId, userId, userInfo) {
    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        is_active: true
      }
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    if (appointment.status === APPOINTMENT_STATUSES.ATTENDED) {
      throw new Error('La cita ya está marcada como atendida');
    }

    if (appointment.status === APPOINTMENT_STATUSES.CANCELLED) {
      throw new Error('No se puede marcar como atendida una cita cancelada');
    }

    const oldData = appointment.toJSON();
    await appointment.update({
      status: APPOINTMENT_STATUSES.ATTENDED
    });

    // Registrar auditoría
    await AuditLog.createLog({
      user_id: userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: userInfo.ip,
      user_agent: userInfo.userAgent,
      additional_info: {
        action_type: 'mark_attended'
      }
    });

    return appointment;
  }

  /**
   * Obtener agenda diaria de un médico
   */
  static async getDoctorDailySchedule(doctorId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.findAll({
      where: {
        doctor_id: doctorId,
        date_time: {
          [Op.between]: [startOfDay, endOfDay]
        },
        is_active: true
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'paternal_surname', 'maternal_surname', 'document_number', 'history_number']
        }
      ],
      order: [['date_time', 'ASC']]
    });

    return appointments;
  }

  /**
   * Obtener estadísticas de citas
   */
  static async getAppointmentStatistics(filters = {}) {
    const { doctor_id, date_from, date_to } = filters;
    
    const whereClause = { is_active: true };
    
    if (doctor_id) whereClause.doctor_id = doctor_id;
    
    if (date_from || date_to) {
      whereClause.date_time = {};
      if (date_from) whereClause.date_time[Op.gte] = new Date(date_from);
      if (date_to) whereClause.date_time[Op.lte] = new Date(date_to);
    }

    const totalAppointments = await Appointment.count({ where: whereClause });
    
    const statusCounts = await Appointment.findAll({
      where: whereClause,
      attributes: [
        'status',
        [Appointment.sequelize.fn('COUNT', Appointment.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const typeCounts = await Appointment.findAll({
      where: whereClause,
      attributes: [
        'type',
        [Appointment.sequelize.fn('COUNT', Appointment.sequelize.col('id')), 'count']
      ],
      group: ['type']
    });

    return {
      total_appointments: totalAppointments,
      by_status: statusCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.dataValues.count);
        return acc;
      }, {}),
      by_type: typeCounts.reduce((acc, item) => {
        acc[item.type] = parseInt(item.dataValues.count);
        return acc;
      }, {})
    };
  }
}

module.exports = AppointmentService;
