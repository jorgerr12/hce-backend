// server/routes/v1/index.js
const express = require('express');
const authRoutes = require('./authRoutes');
const patientRoutes = require('./patientRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const externalRoutes = require('./externalRoutes');

const router = express.Router();

/**
 * API v1 Routes
 * Todas las rutas de la versión 1 de la API
 */

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de pacientes
router.use('/patients', patientRoutes);

// Rutas de citas
router.use('/appointments', appointmentRoutes);

// Rutas de integración externa
router.use('/external', externalRoutes);

module.exports = router;
