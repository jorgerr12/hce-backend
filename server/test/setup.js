// server/test/setup.js
const { sequelize } = require('../models');

// Configuración global para las pruebas
beforeAll(async () => {
  // Configurar base de datos de prueba
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'hce_test_db';
  process.env.JWT_SECRET = 'test_jwt_secret_key';
  
  try {
    // Sincronizar modelos para pruebas
    await sequelize.sync({ force: true });
    console.log('✅ Base de datos de prueba configurada');
  } catch (error) {
    console.error('❌ Error al configurar base de datos de prueba:', error);
  }
});

// Limpiar después de todas las pruebas
afterAll(async () => {
  try {
    await sequelize.close();
    console.log('✅ Conexión de prueba cerrada');
  } catch (error) {
    console.error('❌ Error al cerrar conexión de prueba:', error);
  }
});

// Limpiar datos entre pruebas
beforeEach(async () => {
  // Limpiar todas las tablas antes de cada prueba
  const models = require('../models');
  
  try {
    // Deshabilitar restricciones de clave foránea temporalmente
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    
    // Limpiar todas las tablas
    for (const modelName of Object.keys(models)) {
      if (models[modelName].destroy) {
        await models[modelName].destroy({ where: {}, force: true });
      }
    }
    
    // Rehabilitar restricciones de clave foránea
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
  } catch (error) {
    console.error('Error al limpiar datos de prueba:', error);
  }
});

