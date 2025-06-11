# HCE Salud Vital - Backend API

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express](https://img.shields.io/badge/Express-5.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12.x-blue)
![Sequelize](https://img.shields.io/badge/Sequelize-6.x-orange)
![Jest](https://img.shields.io/badge/Jest-30.x-red)

Sistema de Historia Clínica Electrónica (HCE) desarrollado en Node.js con Express, PostgreSQL y Sequelize para centros médicos en Perú.

## 🚀 Características Principales

- ✅ **Gestión Completa de Pacientes** - CRUD con soft delete y validaciones
- ✅ **Sistema de Citas Médicas** - Agendamiento con estados y sincronización externa
- ✅ **Consultas y Prescripciones** - Registro completo de atenciones médicas
- ✅ **Autenticación JWT** - Sistema seguro con roles y permisos
- ✅ **Integración Externa** - APIs para sistemas de cobranza, PACS y LIS
- ✅ **Auditoría Completa** - Logs automáticos de todas las operaciones
- ✅ **Rate Limiting** - Protección contra ataques de fuerza bruta
- ✅ **Validaciones Exhaustivas** - Validación de datos con express-validator
- ✅ **Pruebas Automatizadas** - Cobertura completa con Jest
- ✅ **Documentación Técnica** - Documentación completa de API y arquitectura

## 🏗️ Arquitectura

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

## 📋 Requisitos

- **Node.js** 18.x o superior
- **PostgreSQL** 12.x o superior
- **npm** 8.x o superior

## ⚡ Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd hce-backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 4. Crear base de datos
createdb hce_db

# 5. Iniciar servidor
npm run dev
```

## 🔧 Configuración Detallada

Para una guía completa de instalación y configuración, consulta [INSTALLATION.md](./INSTALLATION.md).

## 📚 Documentación

- **[Guía de Instalación](./INSTALLATION.md)** - Instalación paso a paso
- **[Documentación Técnica](./TECHNICAL_DOCS.md)** - Arquitectura y API completa
- **[Especificaciones](./pasted_content.txt)** - Requerimientos originales del proyecto

## 🧪 Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar con cobertura
npm run test:coverage

# Modo watch para desarrollo
npm run test:watch
```

## 🔐 Autenticación

El sistema utiliza JWT (JSON Web Tokens) para autenticación:

```bash
# Obtener token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@saludvital.pe", "password": "admin123"}'

# Usar token en requests
curl -X GET http://localhost:3000/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 👥 Roles de Usuario

| Rol | Permisos |
|-----|----------|
| **Administrador** | Acceso completo al sistema |
| **Médico** | Gestión de pacientes, citas y consultas |
| **Enfermero** | Consulta de pacientes y registro de signos vitales |
| **Recepcionista** | Gestión básica de pacientes y citas |

## 🌐 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/profile` - Obtener perfil del usuario

### Pacientes
- `GET /api/patients` - Listar pacientes
- `POST /api/patients` - Crear paciente
- `GET /api/patients/:id` - Obtener paciente
- `PUT /api/patients/:id` - Actualizar paciente
- `DELETE /api/patients/:id` - Eliminar paciente

### Citas
- `GET /api/appointments` - Listar citas
- `POST /api/appointments` - Crear cita
- `GET /api/appointments/:id` - Obtener cita
- `PUT /api/appointments/:id` - Actualizar cita
- `POST /api/appointments/:id/cancel` - Cancelar cita

### Integración Externa
- `POST /api/external/appointments` - Sincronizar cita desde sistema de cobranza
- `POST /api/external/payment-status` - Actualizar estado de pago

Para la documentación completa de la API, consulta [TECHNICAL_DOCS.md](./TECHNICAL_DOCS.md).

## 🔒 Seguridad

- **Autenticación JWT** con expiración configurable
- **Rate Limiting** para prevenir ataques de fuerza bruta
- **Validación exhaustiva** de todos los inputs
- **Auditoría completa** de operaciones
- **Soft delete** para preservar integridad de datos
- **CORS** configurable para control de acceso

## 📊 Monitoreo

- **Health Check**: `GET /health`
- **API Info**: `GET /api`
- **Logs de Auditoría**: Tabla `audit_logs`
- **Métricas de Rate Limiting**: Headers automáticos

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start

# Con PM2 (recomendado)
pm2 start server/index.js --name hce-backend
```

## 🧪 Datos de Prueba

En modo desarrollo, el sistema crea automáticamente:

- **Admin**: admin@saludvital.pe / admin123
- **Médico**: doctor@saludvital.pe / doctor123
- **Paciente**: María González (DNI: 12345678)

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Cumplimiento Normativo

- ✅ **Ley 29733 (Perú)** - Protección de datos personales
- ✅ **Resolución MINSA** - Uso de CIE-10 para diagnósticos
- ✅ **Estándares HL7 FHIR** - Interoperabilidad en salud

## 📄 Licencia

Este proyecto está bajo la Licencia ISC. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Para soporte técnico:
- Consulta la [documentación técnica](./TECHNICAL_DOCS.md)
- Revisa la [guía de instalación](./INSTALLATION.md)
- Contacta al equipo de desarrollo

---

**HCE Salud Vital** - Sistema de Historia Clínica Electrónica v1.0.0  
Desarrollado con ❤️ para centros médicos en Perú

