// server/test/patient.test.js
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../index');
const { User, Patient, Doctor } = require('../models');
const { USER_ROLES, DOCUMENT_TYPES, GENDERS } = require('../config/constants');

describe('Patient Controller', () => {
  let authToken;
  let adminUser;
  let doctorUser;
  let doctor;

  beforeEach(async () => {
    // Crear usuario administrador para las pruebas
    adminUser = await User.create({
      email: 'admin@test.com',
      password: await bcrypt.hash('admin123', 10),
      first_name: 'Admin',
      last_name: 'Test',
      role: USER_ROLES.ADMIN
    });

    // Crear usuario médico
    doctorUser = await User.create({
      email: 'doctor@test.com',
      password: await bcrypt.hash('doctor123', 10),
      first_name: 'Doctor',
      last_name: 'Test',
      role: USER_ROLES.DOCTOR
    });

    // Crear perfil de médico
    doctor = await Doctor.create({
      user_id: doctorUser.id,
      cmp_number: 'CMP-12345',
      specialties: ['Medicina General']
    });

    // Obtener token de autenticación
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      });

    authToken = loginResponse.body.token;
  });

  describe('POST /api/patients', () => {
    test('Debe crear un paciente con datos válidos', async () => {
      const patientData = {
        document_type: DOCUMENT_TYPES.DNI,
        document_number: '12345678',
        first_name: 'Juan',
        paternal_surname: 'Pérez',
        maternal_surname: 'García',
        birth_date: '1990-01-01',
        gender: GENDERS.MALE,
        email: 'juan.perez@email.com',
        phone: '987654321'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Paciente creado exitosamente');
      expect(response.body.patient).toHaveProperty('id');
      expect(response.body.patient.history_number).toMatch(/HCE-\d{6}/);
    });

    test('Debe rechazar DNI inválido', async () => {
      const patientData = {
        document_type: DOCUMENT_TYPES.DNI,
        document_number: '123456789', // 9 dígitos (inválido)
        first_name: 'Juan',
        paternal_surname: 'Pérez'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('DNI inválido (debe tener exactamente 8 dígitos)');
    });

    test('Debe rechazar datos faltantes', async () => {
      const patientData = {
        document_type: DOCUMENT_TYPES.DNI,
        // Falta document_number
        first_name: 'Juan',
        paternal_surname: 'Pérez'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBe(400);
      expect(response.body.validation_errors).toBeDefined();
    });

    test('Debe rechazar paciente duplicado', async () => {
      const patientData = {
        document_type: DOCUMENT_TYPES.DNI,
        document_number: '12345678',
        first_name: 'Juan',
        paternal_surname: 'Pérez'
      };

      // Crear primer paciente
      await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      // Intentar crear paciente duplicado
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Ya existe un paciente con este tipo y número de documento');
    });

    test('Debe rechazar acceso sin autenticación', async () => {
      const patientData = {
        document_type: DOCUMENT_TYPES.DNI,
        document_number: '12345678',
        first_name: 'Juan',
        paternal_surname: 'Pérez'
      };

      const response = await request(app)
        .post('/api/patients')
        .send(patientData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Acceso denegado');
    });
  });

  describe('GET /api/patients', () => {
    beforeEach(async () => {
      // Crear algunos pacientes de prueba
      await Patient.create({
        document_type: DOCUMENT_TYPES.DNI,
        document_number: '11111111',
        first_name: 'María',
        paternal_surname: 'González',
        history_number: 'HCE-000001',
        gender: GENDERS.FEMALE
      });

      await Patient.create({
        document_type: DOCUMENT_TYPES.DNI,
        document_number: '22222222',
        first_name: 'Carlos',
        paternal_surname: 'López',
        history_number: 'HCE-000002',
        gender: GENDERS.MALE
      });
    });

    test('Debe obtener lista de pacientes', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patients).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total_records).toBe(2);
    });

    test('Debe filtrar pacientes por búsqueda', async () => {
      const response = await request(app)
        .get('/api/patients?search=María')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patients).toHaveLength(1);
      expect(response.body.patients[0].first_name).toBe('María');
    });

    test('Debe paginar resultados', async () => {
      const response = await request(app)
        .get('/api/patients?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patients).toHaveLength(1);
      expect(response.body.pagination.current_page).toBe(1);
      expect(response.body.pagination.total_pages).toBe(2);
    });
  });

  describe('GET /api/patients/search', () => {
    beforeEach(async () => {
      await Patient.create({
        document_type: DOCUMENT_TYPES.DNI,
        document_number: '33333333',
        first_name: 'Ana',
        paternal_surname: 'Martínez',
        history_number: 'HCE-000003'
      });
    });

    test('Debe buscar paciente por documento', async () => {
      const response = await request(app)
        .get('/api/patients/search?document_type=dni&document_number=33333333')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patient.first_name).toBe('Ana');
      expect(response.body.patient.document_number).toBe('33333333');
    });

    test('Debe retornar 404 si no encuentra paciente', async () => {
      const response = await request(app)
        .get('/api/patients/search?document_type=dni&document_number=99999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Paciente no encontrado');
    });

    test('Debe validar parámetros requeridos', async () => {
      const response = await request(app)
        .get('/api/patients/search?document_type=dni')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.validation_errors).toBeDefined();
    });
  });

  describe('PUT /api/patients/:id', () => {
    let patient;

    beforeEach(async () => {
      patient = await Patient.create({
        document_type: DOCUMENT_TYPES.DNI,
        document_number: '44444444',
        first_name: 'Pedro',
        paternal_surname: 'Ramírez',
        history_number: 'HCE-000004'
      });
    });

    test('Debe actualizar paciente exitosamente', async () => {
      const updateData = {
        first_name: 'Pedro José',
        email: 'pedro.ramirez@email.com'
      };

      const response = await request(app)
        .put(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Paciente actualizado exitosamente');

      // Verificar que se actualizó en la base de datos
      const updatedPatient = await Patient.findByPk(patient.id);
      expect(updatedPatient.first_name).toBe('Pedro José');
      expect(updatedPatient.email).toBe('pedro.ramirez@email.com');
    });

    test('Debe rechazar ID inválido', async () => {
      const response = await request(app)
        .put('/api/patients/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ first_name: 'Nuevo Nombre' });

      expect(response.status).toBe(400);
      expect(response.body.validation_errors).toBeDefined();
    });
  });

  describe('DELETE /api/patients/:id', () => {
    let patient;

    beforeEach(async () => {
      patient = await Patient.create({
        document_type: DOCUMENT_TYPES.DNI,
        document_number: '55555555',
        first_name: 'Luis',
        paternal_surname: 'Torres',
        history_number: 'HCE-000005'
      });
    });

    test('Debe eliminar paciente (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Paciente eliminado exitosamente');

      // Verificar soft delete
      const deletedPatient = await Patient.findByPk(patient.id);
      expect(deletedPatient.is_active).toBe(false);
    });

    test('Debe retornar 404 para paciente inexistente', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .delete(`/api/patients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Paciente no encontrado');
    });
  });
});

