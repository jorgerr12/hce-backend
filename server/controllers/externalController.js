// server/controllers/externalController.js
const { Patient, Doctor, Appointment, AuditLog } = require('../models');
const { DOCUMENT_TYPES, APPOINTMENT_STATUSES, APPOINTMENT_TYPES, AUDIT_ACTIONS } = require('../config/constants');
const { Op } = require('sequelize');

// Sincronizar cita desde sistema de cobranza
exports.syncAppointmentFromBilling = async (req, res) => {
  try {
    const {
      patient: patientData,
      appointment: appointmentData
    } = req.body;

    // Validar datos requeridos
    if (!patientData || !appointmentData) {
      return res.status(400).json({
        error: 'Datos de paciente y cita son requeridos'
      });
    }

    const {
      dni,
      names,
      gender,
      email,
      phone,
      birth_date
    } = patientData;

    const {
      type,
      doctor_id,
      date_time,
      description,
      status,
      price,
      external_code
    } = appointmentData;

    // Validar campos obligatorios
    if (!dni || !names || !doctor_id || !date_time || !external_code) {
      return res.status(400).json({
        error: 'DNI, nombres, médico, fecha/hora y código externo son requeridos'
      });
    }

    // Validar formato del DNI
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({
        error: 'DNI inválido (debe tener exactamente 8 dígitos)'
      });
    }

    // Verificar si ya existe una cita con el mismo código externo
    const existingAppointment = await Appointment.findOne({
      where: { external_code, is_active: true }
    });

    if (existingAppointment) {
      // Si ya existe, actualizar el estado si es necesario
      if (existingAppointment.status !== status) {
        const oldData = existingAppointment.toJSON();
        
        await existingAppointment.update({
          status,
          payment_amount: price,
          payment_method: status === APPOINTMENT_STATUSES.PAID ? 'sistema_cobranza' : null
        });

        // Crear log de auditoría
        await AuditLog.createLog({
          user_id: null, // Sistema externo
          action: 'sync_update',
          entity_type: 'Appointment',
          entity_id: existingAppointment.id,
          old_data: oldData,
          new_data: existingAppointment.toJSON(),
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          additional_info: {
            source: 'billing_system',
            external_code
          }
        });

        return res.status(200).json({
          message: 'Cita actualizada desde sistema de cobranza',
          appointment_id: existingAppointment.id,
          action: 'updated'
        });
      } else {
        return res.status(200).json({
          message: 'Cita ya existe y está sincronizada',
          appointment_id: existingAppointment.id,
          action: 'no_change'
        });
      }
    }

    // Buscar o crear paciente
    let patient = await Patient.findOne({
      where: {
        document_type: DOCUMENT_TYPES.DNI,
        document_number: dni,
        is_active: true
      }
    });

    if (!patient) {
      // Parsear nombres (asumiendo formato "Nombre Apellido1 Apellido2")
      const nameParts = names.trim().split(' ');
      let first_name, paternal_surname, maternal_surname;

      if (nameParts.length >= 3) {
        first_name = nameParts[0];
        paternal_surname = nameParts[1];
        maternal_surname = nameParts.slice(2).join(' ');
      } else if (nameParts.length === 2) {
        first_name = nameParts[0];
        paternal_surname = nameParts[1];
        maternal_surname = null;
      } else {
        first_name = names;
        paternal_surname = 'Sin Apellido';
        maternal_surname = null;
      }

      // Generar número de historia
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
      
      const history_number = `HCE-${nextNumber.toString().padStart(6, '0')}`;

      // Crear paciente
      patient = await Patient.create({
        document_type: DOCUMENT_TYPES.DNI,
        document_number: dni,
        first_name,
        paternal_surname,
        maternal_surname,
        history_number,
        birth_date: birth_date || null,
        gender: gender || null,
        email: email ? email.toLowerCase() : null,
        phone: phone || null,
        external_code: `BILLING_${dni}`
      });

      // Log de creación de paciente
      await AuditLog.createLog({
        user_id: null,
        action: AUDIT_ACTIONS.CREATE,
        entity_type: 'Patient',
        entity_id: patient.id,
        new_data: patient.toJSON(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        additional_info: {
          source: 'billing_system',
          created_from_appointment_sync: true
        }
      });
    }

    // Verificar que el médico existe
    const doctor = await Doctor.findOne({
      where: { id: doctor_id, is_active: true }
    });

    if (!doctor) {
      return res.status(404).json({
        error: 'Médico no encontrado'
      });
    }

    // Verificar disponibilidad del médico
    const appointmentDate = new Date(date_time);
    const conflictingAppointment = await Appointment.findOne({
      where: {
        doctor_id,
        date_time: {
          [Op.between]: [
            new Date(appointmentDate.getTime() - (30 * 60000)), // 30 minutos antes
            new Date(appointmentDate.getTime() + (30 * 60000))  // 30 minutos después
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
        error: 'El médico ya tiene una cita programada en ese horario',
        conflicting_appointment_id: conflictingAppointment.id
      });
    }

    // Crear la cita
    const appointment = await Appointment.create({
      patient_id: patient.id,
      doctor_id,
      type: type || APPOINTMENT_TYPES.MEDICAL_CONSULTATION,
      date_time: appointmentDate,
      description: description || 'Cita sincronizada desde sistema de cobranza',
      status: status || APPOINTMENT_STATUSES.PENDING,
      external_code,
      payment_amount: price || null,
      payment_method: status === APPOINTMENT_STATUSES.PAID ? 'sistema_cobranza' : null,
      notes: 'Cita creada automáticamente desde sistema de cobranza'
    });

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: null,
      action: AUDIT_ACTIONS.CREATE,
      entity_type: 'Appointment',
      entity_id: appointment.id,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      additional_info: {
        source: 'billing_system',
        external_code,
        patient_created: !patient.external_code
      }
    });

    res.status(201).json({
      message: 'Cita sincronizada correctamente desde sistema de cobranza',
      appointment_id: appointment.id,
      patient_id: patient.id,
      action: 'created'
    });

  } catch (error) {
    console.error('Error al sincronizar cita desde sistema de cobranza:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estado de sincronización de una cita
exports.getAppointmentSyncStatus = async (req, res) => {
  try {
    const { external_code } = req.params;

    const appointment = await Appointment.findOne({
      where: { external_code, is_active: true },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'paternal_surname', 'history_number', 'document_number']
        },
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['id', 'cmp_number']
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        external_code
      });
    }

    res.status(200).json({
      appointment: {
        id: appointment.id,
        external_code: appointment.external_code,
        status: appointment.status,
        date_time: appointment.date_time,
        payment_amount: appointment.payment_amount,
        patient: appointment.patient,
        doctor: appointment.doctor,
        last_updated: appointment.updated_at
      }
    });

  } catch (error) {
    console.error('Error al obtener estado de sincronización:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Webhook para recibir actualizaciones de estado de pago
exports.updatePaymentStatus = async (req, res) => {
  try {
    const {
      external_code,
      status,
      payment_amount,
      payment_method,
      payment_date,
      transaction_id
    } = req.body;

    if (!external_code || !status) {
      return res.status(400).json({
        error: 'Código externo y estado son requeridos'
      });
    }

    const appointment = await Appointment.findOne({
      where: { external_code, is_active: true }
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        external_code
      });
    }

    // Guardar datos anteriores para auditoría
    const oldData = appointment.toJSON();

    // Actualizar estado de pago
    const updateData = { status };
    
    if (payment_amount) updateData.payment_amount = payment_amount;
    if (payment_method) updateData.payment_method = payment_method;
    
    // Agregar información de transacción en las notas
    if (transaction_id) {
      updateData.notes = `${appointment.notes || ''}\nID Transacción: ${transaction_id}`;
      if (payment_date) {
        updateData.notes += `\nFecha de pago: ${payment_date}`;
      }
    }

    await appointment.update(updateData);

    // Crear log de auditoría
    await AuditLog.createLog({
      user_id: null,
      action: 'payment_update',
      entity_type: 'Appointment',
      entity_id: appointment.id,
      old_data: oldData,
      new_data: appointment.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      additional_info: {
        source: 'billing_system',
        transaction_id,
        payment_date
      }
    });

    res.status(200).json({
      message: 'Estado de pago actualizado correctamente',
      appointment_id: appointment.id,
      new_status: status
    });

  } catch (error) {
    console.error('Error al actualizar estado de pago:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de sincronización
exports.getSyncStatistics = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    
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

    // Contar por estado
    const statusCounts = await Appointment.findAll({
      where: {
        external_code: { [Op.ne]: null },
        is_active: true,
        ...dateFilter
      },
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['status']
    });

    // Contar pacientes creados desde sincronización
    const syncedPatients = await Patient.count({
      where: {
        external_code: { [Op.like]: 'BILLING_%' },
        is_active: true,
        ...dateFilter
      }
    });

    res.status(200).json({
      statistics: {
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
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de sincronización:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

