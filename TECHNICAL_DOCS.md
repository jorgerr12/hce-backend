# Documentación Técnica - HCE Salud Vital Backend

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Modelos de Datos](#modelos-de-datos)
4. [API Endpoints](#api-endpoints)
5. [Autenticación y Autorización](#autenticación-y-autorización)
6. [Middleware](#middleware)
7. [Validaciones](#validaciones)
8. [Auditoría](#auditoría)
9. [Pruebas](#pruebas)
10. [Configuración](#configuración)
11. [Despliegue](#despliegue)

## Introducción

El sistema HCE Salud Vital es una plataforma backend desarrollada en Node.js con Express, PostgreSQL y Sequelize para la gestión integral de historias clínicas electrónicas. Está diseñado para centros médicos en Perú y cumple con normativas nacionales e internacionales.

### Características Principales

- **Gestión de Pacientes**: CRUD completo con soft delete
- **Sistema de Citas**: Agendamiento y gestión con estados
- **Consultas Médicas**: Registro completo de consultas y prescripciones
- **Autenticación JWT**: Sistema seguro con roles
- **Integración Externa**: APIs para sistemas de cobranza
- **Auditoría Completa**: Logs de todas las operaciones
- **Rate Limiting**: Protección contra ataques
- **Validaciones**: Validación exhaustiva de datos

## Arquitectura del Sistema

### Estructura de Capas

```
┌─────────────────────────────────────┐
│           API Gateway               │
│     (Express + Middleware)          │
├─────────────────────────────────────┤
│           Controllers               │
│      (Lógica de Negocio)           │
├─────────────────────────────────────┤
│             Models                  │
│        (Sequelize ORM)             │
├─────────────────────────────────────┤
│           Database                  │
│         (PostgreSQL)               │
└─────────────────────────────────────┘
```

### Estructura de Directorios

```
server/
├── config/           # Configuración (DB, constantes)
├── controllers/      # Lógica de negocio
├── models/          # Modelos de Sequelize
├── routes/          # Rutas de la API
├── middleware/      # Middleware personalizado
├── test/            # Pruebas unitarias e integración
└── index.js         # Punto de entrada
```

## Modelos de Datos

### Diagrama de Relaciones

```
User ──────┐
           │ 1:1
           ▼
         Doctor ──────┐
                      │ 1:N
                      ▼
Patient ──────────► Appointment ──────┐
   │                                  │ 1:1
   │                                  ▼
   │                              Consultation ──────┐
   │                                                 │ 1:N
   │                                                 ▼
   └─────────────────────────────────────────► Prescription

User ──────┐
           │ 1:N
           ▼
        AuditLog
```

### Modelos Principales

#### User
- **Propósito**: Gestión de usuarios del sistema
- **Campos clave**: email, password, role, is_active
- **Roles**: admin, medico, enfermero, recepcionista

#### Patient
- **Propósito**: Información de pacientes
- **Campos clave**: document_type, document_number, history_number
- **Validaciones**: DNI peruano (8 dígitos), email único

#### Doctor
- **Propósito**: Perfil médico extendido
- **Campos clave**: cmp_number, specialties, consultation_fee
- **Relación**: 1:1 con User

#### Appointment
- **Propósito**: Gestión de citas médicas
- **Estados**: pendiente, confirmada, cancelada, atendida, pagada, no_pagada
- **Tipos**: consulta_medica, emergencia, procedimiento, consulta_control

#### Consultation
- **Propósito**: Registro de consultas médicas
- **Incluye**: signos vitales, anamnesis, diagnósticos, plan de tratamiento
- **Relación**: 1:1 con Appointment

#### Prescription
- **Propósito**: Prescripciones médicas
- **Campos**: medicamento, dosis, frecuencia, duración
- **Estados**: active, completed, canceled

#### AuditLog
- **Propósito**: Auditoría de operaciones
- **Registra**: usuario, acción, entidad, datos anteriores/nuevos

## API Endpoints

### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/login` | Iniciar sesión | No |
| POST | `/logout` | Cerrar sesión | Sí |
| GET | `/profile` | Obtener perfil | Sí |
| POST | `/change-password` | Cambiar contraseña | Sí |
| GET | `/verify-token` | Verificar token | Sí |

### Pacientes (`/api/patients`)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/` | Listar pacientes | Sí |
| POST | `/` | Crear paciente | Sí |
| GET | `/search` | Buscar por documento | Sí |
| GET | `/:id` | Obtener por ID | Sí |
| PUT | `/:id` | Actualizar paciente | Sí |
| DELETE | `/:id` | Eliminar (soft delete) | Sí |

### Citas (`/api/appointments`)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/` | Listar citas | Sí |
| POST | `/` | Crear cita | Sí |
| GET | `/:id` | Obtener por ID | Sí |
| PUT | `/:id` | Actualizar cita | Sí |
| POST | `/:id/cancel` | Cancelar cita | Sí |
| POST | `/:id/mark-attended` | Marcar como atendida | Sí |
| GET | `/doctor/:doctor_id/daily` | Citas del día | Sí |

### Integración Externa (`/api/external`)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/appointments` | Sincronizar cita | No* |
| POST | `/payment-status` | Actualizar pago | No* |
| GET | `/appointments/:code/status` | Estado de sincronización | No* |
| GET | `/sync/statistics` | Estadísticas | No* |

*Nota: En producción debería tener autenticación por API key*

## Autenticación y Autorización

### JWT (JSON Web Tokens)

- **Algoritmo**: HS256
- **Expiración**: 24 horas (configurable)
- **Payload**: userId, email, role
- **Header**: `Authorization: Bearer <token>` o `x-auth-token: <token>`

### Roles y Permisos

#### Administrador (`admin`)
- Acceso completo a todas las funcionalidades
- Gestión de usuarios
- Acceso a auditoría

#### Médico (`medico`)
- Gestión completa de pacientes
- Gestión de citas (propias)
- Registro de consultas y prescripciones
- Acceso a historiales médicos

#### Enfermero (`enfermero`)
- Consulta de información de pacientes
- Registro de signos vitales
- Sin acceso a prescripciones

#### Recepcionista (`recepcionista`)
- Gestión básica de pacientes
- Gestión de citas
- Sin acceso a información médica sensible

## Middleware

### authMiddleware
- **Propósito**: Verificación de tokens JWT
- **Funcionalidad**: Decodifica token, verifica usuario activo
- **Ubicación**: `server/middleware/authMiddleware.js`

### roleMiddleware
- **Propósito**: Control de acceso basado en roles
- **Funciones**: requireAdmin, requireDoctor, requireMedicalStaff
- **Ubicación**: `server/middleware/roleMiddleware.js`

### validationMiddleware
- **Propósito**: Manejo de errores de validación
- **Integración**: express-validator
- **Ubicación**: `server/middleware/validationMiddleware.js`

### auditMiddleware
- **Propósito**: Logging automático de auditoría
- **Funcionalidad**: Registra operaciones CRUD
- **Ubicación**: `server/middleware/auditMiddleware.js`

### rateLimitMiddleware
- **Propósito**: Protección contra ataques de fuerza bruta
- **Configuraciones**: General, login, creación, búsqueda
- **Ubicación**: `server/middleware/rateLimitMiddleware.js`

## Validaciones

### Validaciones de Entrada

#### Pacientes
- **DNI**: Exactamente 8 dígitos numéricos
- **Email**: Formato válido, único
- **Nombres**: Longitud mínima/máxima
- **Fecha nacimiento**: No puede ser futura

#### Citas
- **Fecha/hora**: No puede ser en el pasado
- **Duración**: Entre 15 y 240 minutos
- **Disponibilidad**: Verificación de conflictos

#### Autenticación
- **Email**: Formato válido
- **Contraseña**: Mínimo 6 caracteres
- **Token**: Verificación de expiración

### Validaciones de Negocio

#### Integridad Referencial
- Verificación de existencia de pacientes/médicos
- Validación de estados de citas
- Consistencia de datos relacionados

#### Reglas de Negocio
- Un médico no puede tener citas superpuestas
- Las citas solo se pueden cancelar con 2+ horas de anticipación
- Los pacientes no pueden tener documentos duplicados

## Auditoría

### Registro de Operaciones

Todas las operaciones importantes se registran automáticamente:

- **Creación**: Datos completos del nuevo registro
- **Actualización**: Datos anteriores y nuevos
- **Eliminación**: Datos del registro eliminado
- **Autenticación**: Login/logout de usuarios

### Información Registrada

- **Usuario**: ID del usuario que realizó la acción
- **Acción**: Tipo de operación (create, update, delete, login)
- **Entidad**: Tipo y ID de la entidad afectada
- **Datos**: Estado anterior y nuevo (para updates)
- **Metadatos**: IP, User-Agent, timestamp

### Consulta de Auditoría

```javascript
// Obtener historial de una entidad
const history = await AuditLog.getEntityHistory('Patient', patientId);

// Obtener actividad de un usuario
const activity = await AuditLog.getUserActivity(userId);
```

## Pruebas

### Configuración de Pruebas

- **Framework**: Jest
- **Supertest**: Para pruebas de API
- **Base de datos**: Separada para pruebas
- **Cobertura**: Reportes automáticos

### Tipos de Pruebas

#### Pruebas Unitarias
- Controladores individuales
- Middleware
- Modelos y validaciones

#### Pruebas de Integración
- Flujos completos de API
- Autenticación end-to-end
- Integración con base de datos

### Ejecución de Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar con cobertura
npm run test:coverage

# Modo watch para desarrollo
npm run test:watch

# Para CI/CD
npm run test:ci
```

## Configuración

### Variables de Entorno

```env
# Servidor
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=hce_db

# CORS
CORS_ORIGIN=*

# Logs
LOG_LEVEL=info
```

### Configuración de Base de Datos

```javascript
// config/db.js
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  }
);
```

## Despliegue

### Requisitos del Sistema

- **Node.js**: 18.x o superior
- **PostgreSQL**: 12.x o superior
- **Memoria**: Mínimo 512MB RAM
- **Almacenamiento**: 1GB disponible

### Pasos de Despliegue

1. **Preparación del Servidor**
   ```bash
   # Instalar Node.js y PostgreSQL
   # Configurar base de datos
   createdb hce_production_db
   ```

2. **Configuración de la Aplicación**
   ```bash
   # Clonar repositorio
   git clone <repository-url>
   cd hce-backend
   
   # Instalar dependencias
   npm install --production
   
   # Configurar variables de entorno
   cp .env.example .env
   # Editar .env con valores de producción
   ```

3. **Inicialización de Base de Datos**
   ```bash
   # Ejecutar migraciones
   npm run migrate
   
   # Crear datos iniciales (opcional)
   npm run seed
   ```

4. **Inicio del Servicio**
   ```bash
   # Modo producción
   npm start
   
   # Con PM2 (recomendado)
   pm2 start server/index.js --name hce-backend
   ```

### Configuración de Nginx (Opcional)

```nginx
server {
    listen 80;
    server_name api.saludvital.pe;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Monitoreo y Logs

- **Logs de aplicación**: Winston + Morgan
- **Logs de sistema**: PM2 logs
- **Métricas**: Endpoint `/health` para health checks
- **Auditoría**: Tabla `audit_logs` en base de datos

### Backup y Recuperación

```bash
# Backup de base de datos
pg_dump hce_production_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restauración
psql hce_production_db < backup_file.sql
```

---

**Versión**: 1.0.0  
**Fecha**: 11/06/2025  
**Equipo**: HCE Salud Vital Development Team

