// server/test/auth.test.js
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { User, Doctor } = require('../models');
const { USER_ROLES } = require('../config/constants');

describe('Auth Controller', () => {
  let testUser;
  let doctorUser;
  let doctor;

  beforeEach(async () => {
    // Crear usuario de prueba
    testUser = await User.create({
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      first_name: 'Test',
      last_name: 'User',
      role: USER_ROLES.ADMIN
    });

    // Crear usuario médico
    doctorUser = await User.create({
      email: 'doctor@example.com',
      password: await bcrypt.hash('doctor123', 10),
      first_name: 'Doctor',
      last_name: 'Test',
      role: USER_ROLES.DOCTOR
    });

    // Crear perfil de médico
    doctor = await Doctor.create({
      user_id: doctorUser.id,
      cmp_number: 'CMP-54321',
      specialties: ['Cardiología']
    });
  });

  describe('POST /api/auth/login', () => {
    test('Debe autenticar usuario con credenciales válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login exitoso');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined(); // No debe incluir password
    });

    test('Debe incluir perfil de médico si el usuario es médico', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'doctor@example.com',
          password: 'doctor123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.doctorProfile).toBeDefined();
      expect(response.body.user.doctorProfile.cmp_number).toBe('CMP-54321');
    });

    test('Debe rechazar credenciales inválidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciales inválidas');
    });

    test('Debe rechazar usuario inexistente', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciales inválidas');
    });

    test('Debe validar campos requeridos', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Falta password
        });

      expect(response.status).toBe(400);
      expect(response.body.validation_errors).toBeDefined();
    });

    test('Debe validar formato de email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.validation_errors).toBeDefined();
    });

    test('Debe actualizar último login', async () => {
      const beforeLogin = new Date();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.last_login).toBeDefined();
      expect(new Date(updatedUser.last_login)).toBeInstanceOf(Date);
      expect(new Date(updatedUser.last_login).getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;

    beforeEach(async () => {
      // Generar token válido
      authToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('Debe obtener perfil de usuario autenticado', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.password).toBeUndefined();
    });

    test('Debe rechazar acceso sin token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Acceso denegado');
    });

    test('Debe rechazar token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token inválido');
    });

    test('Debe rechazar token expirado', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Token expirado
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token expirado');
    });
  });

  describe('POST /api/auth/change-password', () => {
    let authToken;

    beforeEach(async () => {
      authToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('Debe cambiar contraseña con datos válidos', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Contraseña cambiada exitosamente');

      // Verificar que la contraseña se cambió
      const updatedUser = await User.findByPk(testUser.id);
      const isNewPasswordValid = await bcrypt.compare('newpassword123', updatedUser.password);
      expect(isNewPasswordValid).toBe(true);
    });

    test('Debe rechazar contraseña actual incorrecta', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Contraseña actual incorrecta');
    });

    test('Debe validar longitud de nueva contraseña', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: '123' // Muy corta
        });

      expect(response.status).toBe(400);
      expect(response.body.validation_errors).toBeDefined();
    });

    test('Debe requerir autenticación', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Acceso denegado');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      authToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('Debe hacer logout exitosamente', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout exitoso');
    });

    test('Debe requerir autenticación', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Acceso denegado');
    });
  });

  describe('GET /api/auth/verify-token', () => {
    let authToken;

    beforeEach(async () => {
      authToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('Debe verificar token válido', async () => {
      const response = await request(app)
        .get('/api/auth/verify-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    test('Debe rechazar token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/verify-token')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token inválido');
    });
  });
});

