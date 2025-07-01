// server/controllers/appointmentController.js
const AppointmentService = require('../services/appointmentService');
const { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } = require('../config/constants');

// Crear una nueva cita
exports.createAppointment = async (req, res) => {
  try {
    const appointmentData = {
      patient_id: req.body.patient_id,
      doctor_id: req.body.doctor_id,
      type: req.body.type,
      date_time: req.body.date_time,
      duration_minutes: req.body.duration_minutes || 30,
      description: req.body.description,
      external_code: req.body.external_code,
      payment_amount: req.body.payment_amount,
      payment_method: req.body.payment_method,
      notes: req.body.notes,
      status: req.body.payment_amount ? APPOINTMENT_STATUSES.PAID : APPOINTMENT_STATUSES.PENDING
    };

    const userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const appointment = await AppointmentService.createAppointment(
      appointmentData,
      req.user.id,
      userInfo
    );

    // Obtener la cita creada con las relaciones
    const createdAppointment = await AppointmentService.getAppointmentById(appointment.id);

    res.status(201).json({
      message: 'Cita creada exitosamente',
      appointment: createdAppointment
    });

  } catch (error) {
    console.error('Error al crear cita:', error);
    
    if (error.message.includes('requeridos') || 
        error.message.includes('pasado') ||
        error.message.includes('no encontrado') ||
        error.message.includes('inactivo')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message.includes('no está disponible')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener lista de citas con filtros y paginación
exports.getAppointments = async (req, res) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      doctor_id: req.query.doctor_id,
      patient_id: req.query.patient_id,
      status: req.query.status,
      type: req.query.type,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const result = await AppointmentService.getAppointments(filters);

    res.status(200).json(result);

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

    const appointment = await AppointmentService.getAppointmentById(id);

    res.status(200).json({
      appointment
    });

  } catch (error) {
    console.error('Error al obtener cita:', error);
    
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    
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

    const userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const appointment = await AppointmentService.updateAppointment(
      id,
      updateData,
      req.user.id,
      userInfo
    );

    res.status(200).json({
      message: 'Cita actualizada exitosamente',
      appointment
    });

  } catch (error) {
    console.error('Error al actualizar cita:', error);
    
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('pasado') || 
        error.message.includes('ya fue atendida')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message.includes('no está disponible')) {
      return res.status(409).json({ error: error.message });
    }
    
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

    const userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const appointment = await AppointmentService.cancelAppointment(
      id,
      reason,
      req.user.id,
      userInfo
    );

    res.status(200).json({
      message: 'Cita cancelada exitosamente',
      appointment
    });

  } catch (error) {
    console.error('Error al cancelar cita:', error);
    
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('ya está cancelada') ||
        error.message.includes('ya fue atendida')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Marcar cita como atendida
exports.markAsAttended = async (req, res) => {
  try {
    const { id } = req.params;

    const userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const appointment = await AppointmentService.markAsAttended(
      id,
      req.user.id,
      userInfo
    );

    res.status(200).json({
      message: 'Cita marcada como atendida exitosamente',
      appointment
    });

  } catch (error) {
    console.error('Error al marcar cita como atendida:', error);
    
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('ya está marcada') ||
        error.message.includes('cancelada')) {
      return res.status(400).json({ error: error.message });
    }
    
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

    const appointments = await AppointmentService.getDoctorDailySchedule(doctor_id, date);

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
