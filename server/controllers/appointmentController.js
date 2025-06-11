// server/controllers/appointmentController.js
const { Appointment, Patient, Doctor, User, Consultation, AuditLog } = require('../models');
const { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, AUDIT_ACTIONS } = require('../config/constants');
const { Op } = require('sequelize');

// Crear una nueva cita
exports.createAppointment = async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      type,
      date_time,
      duration_minutes = 30,
      description,
      external_code,
      payment_amount,
      payment_method,
      notes
    } = req.body;

    // Validaciones básicas
    if (!patient_id || !doctor_id || !type || !date_time) {
      return res.status(400).json({
        error: 'Paciente, médico, tipo y fecha/hora son requeridos'
      });
    }

    // Validar que la fecha no sea en el pasado
    const appointmentDate = new Date(date_time);
    if (appointmentDate < new Date()) {
      return res.status(400).json({
        error: 'La fecha de la cita no puede ser en el pasado'
      });
    }

    // Verificar que el paciente existe y está activo
    const patient = await Patient.findOne({
      where: { id: patient_id, is_active: true }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Paciente no encontrado'
      });
    }

    // Verificar que el médico existe y está activo
    const doctor = await Doctor.findOne({
      where: { id: doctor_id, is_active: true },
      include: [
        {
          model: User,
          as: 'user',
          where: { is_active: true }
        }
      ]
    });

    if (!doctor) {
      return res.status(404).json({
        error: 'Médico no encontrado'
      });
    }

    // Verificar disponibilidad del médico (no debe tener otra cita en el mismo horario)
    const conflictingAppointment = await Appointment.findOne({
      where: {
        doctor_id,
        date_time: {
          [Op.between]: [
            new Date(appointmentDate.getTime() - (duration_minutes * 60000)),
            new Date(appointmentDate.getTime() + (duration_minutes * 60000))
          ]
        },
        status: {
          [Op.notIn]: [APPOINTMENT_STATUSES.CANCELLED]
        },
        is_active: true
      }
    });

    if (conflictingAppointment) {
      return res.status(409).json({
        error: 'El médico ya tiene una cita programada en ese horario'
      });
    }

    // Crear la cita
    const appointment = await Appointment.create({
      patient_id,
      doctor_id,
      type,
      date_time: appointmentDate,
      duration_minutes,
      description,
      status: payment_amount ? APPOINTMENT_STATUSES.PAID : APPOINTMENT_STATUSES.PENDING,
      external_code,
      payment_amount,
      payment_method,
      notes
    });

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: req.user.userId,
      action: AUDIT_ACTIONS.CREATE,
      entity_type: 'Appointment',
      entity_id: appointment.id,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    // Obtener la cita con información relacionada
    const appointmentWithDetails = await Appointment.findByPk(appointment.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'paternal_surname', 'maternal_surname', 'history_number']
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
      ]
    });

    res.status(201).json({
      message: 'Cita creada exitosamente',
      appointment: appointmentWithDetails
    });

  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener lista de citas con filtros y paginación
exports.getAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      doctor_id,
      patient_id,
      status,
      type,
      date_from,
      date_to,
      is_active = true
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { is_active };

    // Agregar filtros
    if (doctor_id) {
      whereClause.doctor_id = doctor_id;
    }

    if (patient_id) {
      whereClause.patient_id = patient_id;
    }

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    // Filtro por rango de fechas
    if (date_from || date_to) {
      whereClause.date_time = {};
      if (date_from) {
        whereClause.date_time[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        whereClause.date_time[Op.lte] = new Date(date_to);
      }
    }

    const { count, rows: appointments } = await Appointment.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date_time', 'ASC']],
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'paternal_surname', 'maternal_surname', 'history_number', 'document_number']
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
        },
        {
          model: Consultation,
          as: 'consultation',
          required: false,
          attributes: ['id', 'primary_diagnosis']
        }
      ]
    });

    res.status(200).json({
      appointments,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_records: count,
        records_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener una cita por ID
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findOne({
      where: { id, is_active: true },
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
      return res.status(404).json({
        error: 'Cita no encontrada'
      });
    }

    res.status(200).json({
      appointment
    });

  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Actualizar una cita
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const appointment = await Appointment.findOne({
      where: { id, is_active: true }
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Cita no encontrada'
      });
    }

    // Verificar si la cita puede ser modificada
    if (appointment.status === APPOINTMENT_STATUSES.ATTENDED) {
      return res.status(400).json({
        error: 'No se puede modificar una cita que ya fue atendida'
      });
    }

    // Guardar datos anteriores para auditoría
    const oldData = appointment.toJSON();

    // Validar nueva fecha si se está cambiando
    if (updateData.date_time) {
      const newDate = new Date(updateData.date_time);
      if (newDate < new Date()) {
        return res.status(400).json({
          error: 'La nueva fecha no puede ser en el pasado'
        });
      }

      // Verificar disponibilidad del médico si se cambia la fecha
      const conflictingAppointment = await Appointment.findOne({
        where: {
          doctor_id: updateData.doctor_id || appointment.doctor_id,
          date_time: {
            [Op.between]: [
              new Date(newDate.getTime() - ((updateData.duration_minutes || appointment.duration_minutes) * 60000)),
              new Date(newDate.getTime() + ((updateData.duration_minutes || appointment.duration_minutes) * 60000))
            ]
          },
          status: {
            [Op.notIn]: [APPOINTMENT_STATUSES.CANCELLED]
          },
          is_active: true,
          id: { [Op.ne]: id }
        }
      });

      if (conflictingAppointment) {
        return res.status(409).json({
          error: 'El médico ya tiene una cita programada en ese horario'
        });
      }
    }

    // Actualizar la cita
    await appointment.update(updateData);

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: req.user.userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.status(200).json({
      message: 'Cita actualizada exitosamente',
      appointment
    });

  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Cancelar una cita
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findOne({
      where: { id, is_active: true }
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Cita no encontrada'
      });
    }

    // Verificar si la cita puede ser cancelada
    if (appointment.status === APPOINTMENT_STATUSES.ATTENDED) {
      return res.status(400).json({
        error: 'No se puede cancelar una cita que ya fue atendida'
      });
    }

    if (!appointment.canBeCancelled()) {
      return res.status(400).json({
        error: 'No se puede cancelar la cita con menos de 2 horas de anticipación'
      });
    }

    // Guardar datos anteriores para auditoría
    const oldData = appointment.toJSON();

    // Cancelar la cita
    await appointment.update({
      status: APPOINTMENT_STATUSES.CANCELLED,
      notes: reason ? `${appointment.notes || ''}\nMotivo de cancelación: ${reason}` : appointment.notes
    });

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: req.user.userId,
      action: 'cancel',
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      additional_info: { reason }
    });

    res.status(200).json({
      message: 'Cita cancelada exitosamente'
    });

  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Marcar cita como atendida
exports.markAsAttended = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findOne({
      where: { id, is_active: true }
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Cita no encontrada'
      });
    }

    if (appointment.status === APPOINTMENT_STATUSES.ATTENDED) {
      return res.status(400).json({
        error: 'La cita ya está marcada como atendida'
      });
    }

    // Guardar datos anteriores para auditoría
    const oldData = appointment.toJSON();

    // Marcar como atendida
    await appointment.update({
      status: APPOINTMENT_STATUSES.ATTENDED
    });

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: req.user.userId,
      action: 'mark_attended',
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.status(200).json({
      message: 'Cita marcada como atendida exitosamente'
    });

  } catch (error) {
    console.error('Error al marcar cita como atendida:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener citas del día para un médico
exports.getDoctorDailyAppointments = async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.findAll({
      where: {
        doctor_id,
        date_time: {
          [Op.between]: [startOfDay, endOfDay]
        },
        is_active: true
      },
      order: [['date_time', 'ASC']],
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'paternal_surname', 'maternal_surname', 'history_number']
        }
      ]
    });

    res.status(200).json({
      date,
      appointments
    });

  } catch (error) {
    console.error('Error al obtener citas del día:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

