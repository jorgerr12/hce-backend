// server/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/db');
const { syncDatabase, createSeedData } = require('./models');

// Importar middleware
const { generalRateLimit, loginRateLimit } = require('./middleware/rateLimitMiddleware');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const externalRoutes = require('./routes/externalRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());

// Rate limiting general
app.use(generalRateLimit);

// Configuración de CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HCE Salud Vital Backend API está funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Información general de la API
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Bienvenido a la API de HCE Salud Vital',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile',
        changePassword: 'POST /api/auth/change-password'
      },
      patients: {
        list: 'GET /api/patients',
        create: 'POST /api/patients',
        get: 'GET /api/patients/:id',
        update: 'PUT /api/patients/:id',
        delete: 'DELETE /api/patients/:id',
        search: 'GET /api/patients/search'
      },
      appointments: {
        list: 'GET /api/appointments',
        create: 'POST /api/appointments',
        get: 'GET /api/appointments/:id',
        update: 'PUT /api/appointments/:id',
        cancel: 'POST /api/appointments/:id/cancel',
        markAttended: 'POST /api/appointments/:id/mark-attended',
        doctorDaily: 'GET /api/appointments/doctor/:doctor_id/daily'
      },
      external: {
        syncAppointment: 'POST /api/external/appointments',
        paymentStatus: 'POST /api/external/payment-status',
        syncStatus: 'GET /api/external/appointments/:external_code/status',
        statistics: 'GET /api/external/sync/statistics'
      }
    }
  });
});

// Configurar rutas de la API
app.use("/api/auth", loginRateLimit, authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/external", externalRoutes);

// Middleware para manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe en este servidor`,
    suggestion: 'Consulta la documentación en /api para ver las rutas disponibles'
  });
});

// Middleware global para manejo de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  
  // Error de validación de Sequelize
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      message: 'Los datos proporcionados no son válidos',
      details: error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }))
    });
  }
  
  // Error de restricción única de Sequelize
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Conflicto de datos',
      message: 'Ya existe un registro con estos datos',
      details: error.errors.map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  // Error de conexión a la base de datos
  if (error.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      error: 'Error de conexión',
      message: 'No se puede conectar a la base de datos'
    });
  }
  
  // Error genérico
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Función para inicializar el servidor
const startServer = async () => {
  try {
    console.log('🔄 Iniciando servidor HCE Salud Vital...');
    
    // Probar conexión a la base de datos
    await testConnection();
    
    // Sincronizar modelos con la base de datos
    await syncDatabase({ alter: true });
    
    // Crear datos de prueba en desarrollo
    if (process.env.NODE_ENV === 'development') {
      await createSeedData();
    }
    
    // Iniciar el servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor HCE Salud Vital iniciado en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📊 Entorno: ${process.env.NODE_ENV}`);
      console.log(`📚 Documentación: http://localhost:${PORT}/api`);
      console.log(`❤️  Estado: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de cierre graceful
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 Recibida señal ${signal}. Cerrando servidor...`);
  
  try {
    await sequelize.close();
    console.log('✅ Conexión a la base de datos cerrada');
    console.log('👋 Servidor cerrado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al cerrar el servidor:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar el servidor
startServer();

module.exports = app;

