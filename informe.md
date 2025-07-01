# Informe Completo del Proyecto: Backend del Sistema de Historia Clínica Electrónica (HCE) - VERSIÓN ACTUALIZADA

**PARA:** Centro Médico Digital - Piura, Perú  
**FECHA:** 28 de Junio de 2025  
**PROYECTO:** Sistema de Historia Clínica Electrónica (HCE) - Backend API  
**UBICACIÓN:** Piura, Piura, Perú  
**RAZÓN SOCIAL:** Digital Médica Piura

## 1. Objetivo del Proyecto (Visión General)

El objetivo principal es desarrollar un **Sistema de Historia Clínica Electrónica (HCE)** especializado para centros médicos en Perú, que centralice la gestión de atenciones médicas ambulatorias y se integre con los sistemas existentes del centro médico.

### 1.1 Contexto del Centro Médico
El centro médico cuenta actualmente con:
- ✅ **Sistema de Cobranza** - Gestión de pagos y facturación
- ✅ **Sistema PACS** - Almacenamiento de imágenes médicas (Radiografías, TAC, etc.)
- ✅ **Sistema LIS** - Gestión de laboratorio y resultados
- ❌ **Sistema HCE** - **FALTANTE** - Gestión de atenciones médicas ambulatorias

### 1.2 Propósito del Sistema HCE
- **Centralizar** la gestión de atenciones médicas ambulatorias
- **Integrar** información de sistemas PACS, LIS y Cobranza
- **Proporcionar** al médico una vista unificada del paciente durante la consulta
- **Cumplir** con normativas peruanas de salud (MINSA, SUSALUD)
- **Preparar** la base para futura implementación de facturación directa
- **Mejorar** la calidad de atención médica con información consolidada

## 2. Alcance del Proyecto - Sistema HCE Integrado

### 2.1 Funcionalidades Core del MVP

#### 2.1.1 Gestión de Atenciones Médicas
- **Historia Clínica Digital** - Registro completo de consultas médicas
- **Gestión de Pacientes** - Con validación de DNI peruano y datos demográficos
- **Agenda Médica** - Sincronización con sistema de cobranza existente
- **Diagnósticos CIE-10** - Codificación según estándares peruanos
- **Prescripciones Médicas** - Con validación de medicamentos DIGEMID
- **Órdenes Médicas** - Para laboratorio e imagenología

#### 2.1.2 Integraciones Críticas con Sistemas Existentes

**🔗 Sistema de Cobranza (PRIORITARIO)**
- Recepción automática de citas programadas
- Sincronización de datos de pacientes
- Estados de pago y facturación
- Reconciliación de servicios médicos

**🔗 Sistema PACS - Imagenología (CRÍTICO)**
- Consulta de estudios radiológicos por paciente
- Visualización de informes de imágenes médicas
- Integración con identificadores únicos de paciente
- Soporte para: Radiografías, TAC, Resonancias, Ecografías

**🔗 Sistema LIS - Laboratorio (CRÍTICO)**
- Consulta de resultados de laboratorio por paciente
- Histórico de exámenes realizados
- Integración con códigos de laboratorio
- Soporte para: Análisis clínicos, microbiología, patología

#### 2.1.3 Cumplimiento Normativo Peruano
- **MINSA** - Reportes epidemiológicos y sanitarios
- **SUSALUD** - Integración para reportes de atención
- **Ley de Protección de Datos Personales** - Seguridad y privacidad
- **Normativas de Historia Clínica** - Según regulación peruana

#### 2.1.4 Preparación para Facturación Futura
- Estructura de datos compatible con facturación electrónica
- Códigos de servicios médicos estandarizados
- Integración preparada con SUNAT (futuro)
- Gestión de tarifarios médicos

### 2.2 Exclusiones del MVP Actual

**❌ No Incluido en esta Fase:**
- Interfaz de usuario (solo API backend)
- Telemedicina o consultas virtuales
- Facturación directa (preparación solamente)
- Reportes avanzados de Business Intelligence
- Envío de órdenes a PACS/LIS (solo consulta)
- Integración directa con SUNAT (preparación para futuro)
- Módulo de farmacia o inventario médico

**🔮 Funcionalidades Futuras Planificadas:**
- Implementación de facturación electrónica
- Módulo de telemedicina
- Dashboard analítico avanzado
- Integración con sistemas de seguros (SIS, EsSalud)
- App móvil para médicos
- Integración con RENIEC para validación automática

3. Requerimientos Funcionales (RF)
El backend debe proporcionar las siguientes funcionalidades a través de su API:

RF1: Módulo de Usuarios y Seguridad
{{ ... }}

RF1.1 Autenticación de Usuario:

Endpoint: POST /api/v1/auth/login

Input: email, password.

Output: JWT (Access Token, Refresh Token), user_id, role, user_data (nombre completo, email).

RF1.2 Registro de Usuario (Solo Admin):

Endpoint: POST /api/v1/users (Protegido por rol 'Admin').

Input: email (único), password, nombres, apellidoPaterno, apellidoMaterno, role_id, isActive (boolean, default true).

RF1.3 Gestión de Roles y Permisos (RBAC):

Roles: ADMIN, MEDICO, ASISTENTE.

Implementar middleware de autorización para proteger endpoints basados en el rol del usuario autenticado.

RF1.4 Restablecimiento de Contraseña:

RF1.4.1 Solicitud de Restablecimiento:

Endpoint: POST /api/v1/auth/forgot-password

Input: email.

Lógica: Generar un token único, guardarlo con fecha de expiración y enviarlo al email del usuario.

RF1.4.2 Verificación de Token y Restablecimiento:

Endpoint: POST /api/v1/auth/reset-password

Input: token, new_password, confirm_new_password.

Lógica: Validar token, verificar new_password y confirm_new_password, actualizar contraseña.

RF2: Módulo de Gestión de Pacientes

RF2.1 Creación de Paciente:

Endpoint: POST /api/v1/patients

Input:

tipoDocumento (ENUM: 'DNI', 'CARNET_EXTRANJERIA', 'PASAPORTE', 'RUC', 'OTROS')

numeroDocumento (UNIQUE)

nombres

apellidoPaterno

apellidoMaterno

fechaNacimiento (YYYY-MM-DD), sexo (ENUM: 'M', 'F', 'OTRO'), estadoCivil (ENUM), nacionalidad

direccion, distrito, provincia, departamento (referencia a catálogos si necesario)

telefonoMovil, telefonoFijo, email

numeroHistoriaClinica (UNIQUE, asignado por el HCE o sistema externo)

codigoExternoPaciente (Opcional, ID del paciente en otros sistemas)

grupoSanguineo, factorRh

antecedentesCronicos (Array de strings o JSON de condiciones)

medicacionActual (Array de strings o JSON de medicamentos que toma actualmente)

alergias (Array de objetos { alergia:string, reaccion:string, severidad:ENUM('LEVE', 'MODERADA', 'GRAVE') })

contactoEmergencia (Objeto: { nombre:string, telefono:string, relacion:string })

Output: patient_id, numeroHistoriaClinica, datos del paciente creado.

RF2.2 Consulta de Paciente (Por ID o Documento):

Endpoint: GET /api/v1/patients/{id} o GET /api/v1/patients?tipoDocumento={type}&numeroDocumento={num}

Output: Datos completos del paciente.

RF2.3 Búsqueda de Pacientes (Con Paginación):

Endpoint: GET /api/v1/patients?search={query}&tipoDocumento={type}&limit={limit}&offset={offset} (búsqueda por nombre completo, nombres, apellidoPaterno, apellidoMaterno, numeroDocumento, numeroHistoriaClinica).

Output: Lista paginada de pacientes.

RF2.4 Actualización de Paciente:

Endpoint: PUT /api/v1/patients/{id}

RF3: Módulo de Gestión de Agenda (Citas)

RF3.1 Creación de Cita:

Endpoint: POST /api/v1/appointments

Input: patient_id, doctor_id, fecha (YYYY-MM-DD), hora (HH:MM), service_type_id, descripcionServicio (texto, ej. "Consulta médica general"), infoPago (ENUM: 'PAGADO', 'PENDIENTE', 'ANULADO', 'SEGURO'), codigoExternoCita (Opcional, ID de la cita en sistema externo), estado (ENUM: 'PENDIENTE', 'CONFIRMADA', 'EN_CONSULTA', 'ATENDIDA', 'CANCELADA', 'REPROGRAMADA', default 'PENDIENTE').

Output: appointment_id.

RF3.2 Consulta de Citas (Con Filtros):

Endpoints:

GET /api/v1/appointments?doctor_id={id}&start_date={date}&end_date={date}&status={status} (Para agenda de médico)

GET /api/v1/appointments?patient_id={id} (Para historial de citas de paciente)

GET /api/v1/appointments?date={date}&status={status}&service_type={type}&infoPago={paymentStatus} (Para agenda global)

Output: Lista de citas con detalles de paciente, médico, servicio e información de pago.

RF3.3 Actualización de Cita:

Endpoint: PUT /api/v1/appointments/{id}

Permitir actualizar fecha, hora, doctor_id, estado, infoPago, descripcionServicio, codigoExternoCita.

RF4: Módulo de Atención Médica (Historia Clínica) - Estructura Detallada

RF4.1 Creación de Atención Médica:

Endpoint: POST /api/v1/medical_attentions

Input: patient_id, doctor_id (del usuario autenticado), appointment_id (opcional si es emergencia, UNIQUE entre atenciones), fechaAtencion (datetime), tipoAtencion (ENUM: 'CONSULTA', 'EMERGENCIA', 'CONTROL'), motivoConsulta, anamnesis, antecedentes (JSON o texto libre), examenFisico (texto libre).

Output: attention_id.

RF4.2 Gestión de Signos Vitales:

Endpoint: POST /api/v1/medical_attentions/{attention_id}/vitals (crear/actualizar si ya existe para esa atención)

Input: pa_sistolica, pa_diastolica, fc, fr, temp, satO2, peso, talla.

Lógica: Calcular y almacenar IMC automáticamente (peso / (talla^2)).

RF4.3 Gestión de Diagnósticos (Tabla Diagnostico con FK a AtencionMedica):

Endpoint: POST /api/v1/medical_attentions/{attention_id}/diagnoses (añadir)

Endpoint: DELETE /api/v1/diagnoses/{diagnosis_id}

Input: { cie_code: string, description: string, type: ENUM('PRESUNTIVO', 'DEFINITIVO', 'DESCARTADO') }.

RF4.4 Gestión de Prescripciones (Tabla Prescripcion con FK a AtencionMedica):

Endpoint: POST /api/v1/medical_attentions/{attention_id}/prescriptions (añadir)

Endpoint: DELETE /api/v1/prescriptions/{prescription_id}

Input: { medicamento_id: string, dosis: string, via: string, frecuencia: string, duracion: string, cantidad: number, indicaciones: string }.

Lógica: Validar contra alergias conocidas del paciente (recuperar de Paciente.alergias) y, si hay una coincidencia, agregar un indicador de alerta en la respuesta.

RF4.5 Gestión de Órdenes Médicas (Tabla OrdenMedica con FK a AtencionMedica):

Endpoint: POST /api/v1/medical_attentions/{attention_id}/orders (añadir)

Endpoint: DELETE /api/v1/orders/{order_id}

Input: { tipo: ENUM('LABORATORIO', 'IMAGEN', 'INTERCONSULTA', 'PROCEDIMIENTO'), detalle: string, indicaciones: string }.

RF4.6 Gestión de Evoluciones (Tabla Evolucion con FK a AtencionMedica):

Endpoint: POST /api/v1/medical_attentions/{attention_id}/evolutions

Input: notas (texto).

Lógica: Registrar automáticamente fecha_hora y user_id del médico que realiza la evolución.

RF4.7 Consulta de Atención Médica Detallada:

Endpoint: GET /api/v1/medical_attentions/{id}

Output: Todos los datos estructurados de una atención, incluyendo las sub-colecciones (signos vitales, diagnósticos, prescripciones, órdenes, adjuntos, evoluciones).

RF4.8 Finalización de Atención:

Endpoint: PUT /api/v1/medical_attentions/{id}/finalize

Lógica: Cambiar el estado de la atención a "Finalizada". Bloquear la edición de los campos principales de la atención. Actualizar el estado de la cita asociada a 'ATENDIDA'.

RF5: Módulo de Gestión de Archivos Adjuntos (Tabla Adjunto con FK a AtencionMedica)

RF5.1 Subida de Archivo:

Endpoint: POST /api/v1/medical_attentions/{attention_id}/attachments

Input: file (Multipart Form Data), fileName, fileType, description.

Lógica: Almacenar el archivo de forma segura (configurar almacenamiento local o integración con S3/proveedor de nube). Guardar attachment_id, fileName, fileType, description, urlPath en la base de datos.

Output: attachment_id, urlPath (URL de acceso seguro al archivo).

RF5.2 Consulta de Archivos Adjuntos:

Endpoint: GET /api/v1/medical_attentions/{attention_id}/attachments

Output: Lista de metadatos de archivos (ID, nombre, URL, tipo, descripción).

RF6: Módulo de Catálogos (Maestros)

RF6.1 Consulta de Diagnósticos (CIE-10/11): GET /api/v1/catalogs/diagnoses?search={query}

RF6.2 Consulta de Medicamentos: GET /api/v1/catalogs/medications?search={query}

RF6.3 Consulta de Exámenes/Procedimientos: GET /api/v1/catalogs/procedures?search={query}

RF6.4 Plantillas de Texto: GET /api/v1/catalogs/templates/{type}

RF7: Integración con Sistemas Externos (CRÍTICO)

RF7.1 Integración con Sistema de Ventas/Cobranza:

Endpoint: POST /api/v1/integracion/venta-servicio

Autenticación: Requiere API Key o token específico del sistema externo en el header.

Contenido JSON Esperado:

JSON

{
  "transaccionVenta": {
    "idTransaccionVentas": "UNIQUE_ID_FROM_SALES_SYSTEM", // CRÍTICO para idempotencia
    "fechaHoraVenta": "YYYY-MM-DDTHH:MM:SSZ",
    "montoPagado": 150.00,
    "metodoPago": "Tarjeta",
    "estadoPago": "Pagado"
  },
  "paciente": {
    "tipoDocumento": "DNI",
    "numeroDocumento": "DNI_DEL_PACIENTE", // Clave principal para UPSERT de paciente
    "nombres": "NombrePaciente",
    "apellidoPaterno": "ApellidoPaterno",
    "apellidoMaterno": "ApellidoMaterno",
    "fechaNacimiento": "YYYY-MM-DD",
    "sexo": "M/F",
    "telefonoMovil": "9XXXXXXXX",
    "email": "paciente@example.com",
    "numeroHistoriaClinica": "HCE_12345" // Opcional, si el sistema de ventas ya lo conoce
    // Otros datos demográficos y clínicos que el sistema de ventas pueda tener.
  },
  "servicioMedico": {
    "idServicioVentas": "ID_SERVICIO_EN_VENTAS",
    "nombreServicio": "Consulta Médica General",
    "medicoAsignadoIdentificador": "ID_MEDICO_O_DNI_EN_VENTAS", // Para mapear a medico_id en HCE
    "fechaCita": "YYYY-MM-DD",
    "horaCita": "HH:MM", // Asegurar formato coherente
    "observacionesVenta": "Pago adelantado."
  },
  "referenciaCitaHCE": "ID_DE_CITA_HCE_SI_YA_FUE_GENERADA_PREVIAMENTE" // Opcional, ID interno de la cita en HCE
}
Lógica de Procesamiento:

Validación: Estricta de todos los campos recibidos.

Sincronización Paciente (UPSERT):

Buscar paciente por tipoDocumento y numeroDocumento.

Si existe: Actualizar sus datos demográficos si hay cambios (ej. email, telefono).

Si no existe: Crear nuevo registro de paciente.

Sincronización de Citas (Reconciliación Inteligente):

Prioridad 1 (por referenciaCitaHCE): Si referenciaCitaHCE se provee y es un ID válido en HCE, actualizar esa cita (ej. infoPago, idTransaccionVentas).

Prioridad 2 (por codigoExternoCita): Si el servicioMedico incluye un codigoExternoCita y este coincide con una cita en HCE, actualizarla.

Prioridad 3 (por Coincidencia de Datos): Si no hay referenciaCitaHCE ni codigoExternoCita o son inválidos, buscar una cita PENDIENTE que coincida con paciente.tipoDocumento, paciente.numeroDocumento, servicioMedico.medicoAsignadoIdentificador, servicioMedico.fechaCita, y servicioMedico.horaCita.

Si se encuentra coincidencia: Actualizar el estado de la cita (ej. a 'CONFIRMADA' o 'PAGADA') y asociar idTransaccionVentas.

Si NO se encuentra coincidencia: Crear una nueva cita en HCE con los datos recibidos, marcándola como 'CONFIRMADA' (por la venta) y asociando idTransaccionVentas y codigoExternoCita.

Respuesta: 200 OK si éxito (incluir patient_id y appointment_id del HCE si se creó/actualizó). 4xx para errores de validación, 5xx para errores internos.

Idempotencia: La lógica debe ser idempotente para idTransaccionVentas para evitar duplicados en transacciones.

RF7.2 Integración con PACS (Picture Archiving and Communication System):

Propósito: Obtener informes de estudios de imagenología (radiografías, tomografías, ecografías, etc.) asociados a un paciente.

Mecanismo: El backend del HCE actuará como proxy. Recibirá una solicitud del frontend, realizará una llamada a la API del PACS y devolverá la respuesta normalizada al frontend.

Endpoint HCE (Consumido por Frontend): GET /api/v1/integracion/pacs/studies?patient_id={hce_patient_id}

Lógica de Backend HCE (Interna):

Recuperar el paciente del HCE por hce_patient_id.

Obtener el identificador de paciente que el PACS reconoce (ej. numeroDocumento, codigoExternoPaciente o un ID específico de PACS almacenado en HCE).

Realizar una llamada HTTP GET a la API del PACS (ej. http://pacs.api.example.com/api/studies?patient_id={pacs_patient_id}).

Autenticación HCE -> PACS: Usar un token o API Key preconfigurada para autenticarse con el PACS.

Recibir la respuesta del PACS.

Transformar/Normalizar la respuesta: Mapear los campos del PACS a un formato consistente para el frontend del HCE (ej. studyId, studyDate, modality, description, reportUrl, thumbnailUrl). Manejar estudios sin informe.

Retornar la respuesta normalizada (JSON) al frontend.

Manejo de Errores: Capturar y loggear errores de conexión, timeout o respuestas inválidas del PACS.

RF7.3 Integración con LIS (Laboratory Information System):

Propósito: Obtener resultados de exámenes de laboratorio de un paciente.

Mecanismo: El backend del HCE actuará como proxy. Recibirá una solicitud del frontend, realizará una llamada a la API del LIS y devolverá la respuesta normalizada al frontend.

Endpoint HCE (Consumido por Frontend): GET /api/v1/integracion/lis/results?patient_id={hce_patient_id}

Lógica de Backend HCE (Interna):

Recuperar el paciente del HCE por hce_patient_id.

Obtener el identificador de paciente que el LIS reconoce (ej. numeroDocumento, codigoExternoPaciente o un ID específico de LIS almacenado en HCE).

Realizar una llamada HTTP GET a la API del LIS (ej. http://lis.api.example.com/api/results?patient_id={lis_patient_id}).

Autenticación HCE -> LIS: Usar un token o API Key preconfigurada para autenticarse con el LIS.

Recibir la respuesta del LIS.

Transformar/Normalizar la respuesta: Mapear los campos del LIS a un formato consistente para el frontend del HCE (ej. resultId, testDate, testName, resultValue, units, referenceRange, reportUrl, status).

Retornar la respuesta normalizada (JSON) al frontend.

Manejo de Errores: Capturar y loggear errores de conexión, timeout o respuestas inválidas del LIS.

4. Requerimientos No Funcionales (RNF)
RNF1: Seguridad:

Autenticación: JWT para usuarios internos; API Key/token específico para integraciones externas.

Autorización: Implementación estricta de RBAC en todos los endpoints.

Cifrado: HTTPS/TLS para todas las comunicaciones API. Cifrado en reposo para datos sensibles (ej., passwords, DNI).

Protección contra Vulnerabilidades: Implementación de medidas contra SQL Injection, XSS (en inputs a DB), CSRF (si aplica), Rate Limiting en endpoints sensibles (ej., login, forgot-password).

Logging de Seguridad: Registro exhaustivo de eventos de seguridad (intentos de acceso fallidos, cambios de roles, accesos a datos sensibles, operaciones de integración).

RNF2: Rendimiento:

Latencia de API: Las operaciones CRUD básicas deben responder en <200ms. Consultas complejas e integraciones con sistemas externos deben responder en <1000ms.

Concurrencia: Soportar al menos 100 usuarios concurrentes sin degradación significativa del rendimiento.

Optimización de Consultas: Uso de índices de base de datos adecuados, optimización de consultas Sequelize.

RNF3: Escalabilidad:

Arquitectura Modular: Diseño que permita la adición de nuevas funcionalidades y el escalado horizontal de servicios.

Sin Estado (Stateless): Los servicios API deben ser mayormente sin estado para facilitar la escalabilidad horizontal.

RNF4: Confiabilidad y Disponibilidad:

Alta Disponibilidad (objetivo 99.9%).

Manejo robusto de errores con mensajes claros y consistentes, códigos de estado HTTP apropiados.

Estrategia de Respaldo y Recuperación ante desastres para base de datos y archivos.

RNF5: Mantenibilidad:

Código limpio, modular, adherente a buenas prácticas y convenciones de codificación.

Documentación de Código: Comentarios claros, README completo, postman collection/swagger para API.

Pruebas Automatizadas: Cobertura de pruebas unitarias e de integración para las funcionalidades críticas.

RNF6: Observabilidad:

Logging centralizado y estructurado (JSON logs) con niveles de log (DEBUG, INFO, WARN, ERROR).

Monitoreo de métricas de rendimiento, errores, uso de recursos (CPU, memoria, latencia de BD).

RNF7: Cumplimiento:

Asegurar que el manejo de datos sensibles (salud) cumpla con las normativas de privacidad y protección de datos locales (en Piura, Perú), incluyendo medidas para la confidencialidad y el acceso restringido.

5. Estructura del Backend Sugerida (Componentes Clave)
Se recomienda una arquitectura monolítica modular para el backend, utilizando la siguiente estructura de directorios y componentes:

/src
├── /config                 # Configuración de la aplicación (conexión a BD, secrets, API_KEYS de servicios externos, timeouts, etc.)
├── /models                 # Definiciones de Sequelize ORM (Esquemas de la BD y Relaciones)
│   ├── User.js
│   ├── Patient.js
│   ├── Doctor.js           # Si los doctores son una entidad separada de los usuarios con rol Médico
│   ├── Appointment.js
│   ├── MedicalAttention.js
│   ├── Diagnosis.js        # FK a MedicalAttention
│   ├── Prescription.js     # FK a MedicalAttention
│   ├── MedicalOrder.js     # FK a MedicalAttention
│   ├── Attachment.js       # FK a MedicalAttention
│   ├── Evolution.js        # FK a MedicalAttention
│   ├── VitalSign.js        # FK a MedicalAttention
│   ├── ResetPasswordToken.js # Para gestionar tokens de restablecimiento
│   ├── index.js            # Para inicializar Sequelize y definir todas las asociaciones entre modelos
├── /repositories           # Capa de acceso a datos (DAO) que interactúa con los modelos Sequelize, encapsulando las operaciones CRUD de BD
│   ├── UserRepository.js
│   ├── PatientRepository.js
│   └── ...
├── /services               # Lógica de negocio principal, orquestación de operaciones complejas, validaciones.
│   ├── AuthService.js      # Lógica de autenticación, generación de tokens, restablecimiento de contraseña
│   ├── PatientService.js   # Lógica de negocio para pacientes
│   ├── AppointmentService.js
│   ├── MedicalAttentionService.js # Coordina la creación de atención y sus sub-tablas
│   ├── IntegrationService.js # Lógica de alto nivel para coordinar integraciones externas
│   └── ...
├── /controllers            # Manejadores de rutas. Reciben solicitudes, validan input, llaman a servicios, formatean respuestas.
│   ├── AuthController.js
│   ├── PatientController.js
│   └── ...
├── /routes                 # Definición de endpoints API y los controladores asociados.
│   ├── authRoutes.js
│   ├── patientRoutes.js
│   └── ...
├── /middlewares            # Funciones intermediarias (ej. autenticación JWT, autorización RBAC, manejo de errores)
├── /integrations           # Clientes HTTP y lógica específica para interactuar con APIs externas
│   ├── salesSystemClient.js  # Cliente para la API del sistema de ventas
│   ├── pacsClient.js         # Cliente para la API del PACS
│   └── lisClient.js          # Cliente para la API del LIS
├── /utils                  # Funciones de utilidad (hashing de contraseñas, formateadores de datos, generadores de ID, validadores)
├── /logs                   # Directorio para almacenar archivos de log
├── /tests                  # Directorio para pruebas unitarias, de integración, end-to-end
├── app.js                  # Configuración principal de Express, middlewares globales
└── server.js               # Punto de entrada de la aplicación, inicializa la BD y arranca el servidor
6. Tecnologías Clave del Backend
Lenguaje de Programación: Node.js

Framework Web: Express.js

ORM (Object-Relational Mapper): Sequelize.js (para interacción con PostgreSQL y definición de modelos).

Base de Datos: PostgreSQL (robusto, relacional, soporta JSONB para campos flexibles).

Autenticación/Autorización:

jsonwebtoken: Para generar y verificar JWTs.

bcryptjs: Para hashing y verificación segura de contraseñas.

Validación de Esquemas: Joi (para validación de esquemas de entrada en los controladores).

Cliente HTTP: axios (para realizar peticiones HTTP a APIs externas como PACS/LIS).

Manejo de Archivos: multer (para subida de archivos), y lógica para interactuar con el sistema de archivos local o servicios de almacenamiento en la nube.

Logging: winston o pino (para logging estructurado y avanzado).

Contenerización: Docker (para facilitar el empaquetado, despliegue y gestión de entornos de desarrollo/producción).

Herramientas de Testing: Jest (framework de testing), Supertest (para pruebas de integración de API).