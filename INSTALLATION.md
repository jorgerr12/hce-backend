# Guía de Instalación y Configuración - HCE Salud Vital Backend

## Requisitos Previos

### Software Requerido

1. **Node.js** (versión 18.x o superior)
   ```bash
   # Verificar instalación
   node --version
   npm --version
   ```

2. **PostgreSQL** (versión 12.x o superior)
   ```bash
   # Verificar instalación
   psql --version
   ```

3. **Git** (para clonar el repositorio)
   ```bash
   git --version
   ```

## Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd hce-backend
```

### 2. Instalar Dependencias

```bash
# Instalar dependencias de producción y desarrollo
npm install
```

### 3. Configurar Base de Datos

#### Crear Base de Datos

```sql
-- Conectar a PostgreSQL como superusuario
psql -U postgres

-- Crear base de datos principal
CREATE DATABASE hce_db;

-- Crear base de datos de pruebas (opcional)
CREATE DATABASE hce_test_db;

-- Crear usuario específico (opcional pero recomendado)
CREATE USER hce_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE hce_db TO hce_user;
GRANT ALL PRIVILEGES ON DATABASE hce_test_db TO hce_user;

-- Salir de psql
\q
```

### 4. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar archivo .env con tus configuraciones
nano .env
```

#### Configuración del archivo .env

```env
# Configuración del servidor
NODE_ENV=development
PORT=3000

# Configuración JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui_2025
JWT_EXPIRES_IN=24h

# Configuración de la base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=hce_user
DB_PASSWORD=secure_password
DB_NAME=hce_db

# Configuración de logs
LOG_LEVEL=info

# Configuración de CORS
CORS_ORIGIN=*

# Configuración de encriptación (opcional)
ENCRYPTION_KEY=clave_de_encriptacion_aes256_muy_segura_2025
```

### 5. Inicializar la Base de Datos

```bash
# Ejecutar el servidor para que sincronice los modelos
npm run dev
```

El servidor automáticamente:
- Creará todas las tablas necesarias
- Establecerá las relaciones entre tablas
- Creará datos de prueba en modo desarrollo

### 6. Verificar Instalación

#### Verificar Estado del Servidor

```bash
# En otra terminal, verificar que el servidor esté funcionando
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{
  "status": "OK",
  "message": "HCE Salud Vital Backend API está funcionando",
  "timestamp": "2025-06-11T...",
  "version": "1.0.0",
  "environment": "development"
}
```

#### Verificar API

```bash
# Obtener información de la API
curl http://localhost:3000/api
```

### 7. Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas con cobertura
npm run test:coverage

# Ejecutar pruebas en modo watch (desarrollo)
npm run test:watch
```

## Comandos Disponibles

### Desarrollo

```bash
# Iniciar servidor en modo desarrollo (con auto-reload)
npm run dev

# Iniciar servidor en modo producción
npm start
```

### Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas con reporte de cobertura
npm run test:coverage

# Ejecutar pruebas en modo watch
npm run test:watch

# Ejecutar pruebas para CI/CD
npm run test:ci
```

## Datos de Prueba

En modo desarrollo, el sistema crea automáticamente los siguientes usuarios de prueba:

### Usuario Administrador
- **Email**: admin@saludvital.pe
- **Contraseña**: admin123
- **Rol**: Administrador

### Usuario Médico
- **Email**: doctor@saludvital.pe
- **Contraseña**: doctor123
- **Rol**: Médico
- **CMP**: CMP-12345

### Paciente de Prueba
- **DNI**: 12345678
- **Nombre**: María González López
- **Historia**: HCE-000001

## Uso de la API

### Autenticación

1. **Obtener Token**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@saludvital.pe",
       "password": "admin123"
     }'
   ```

2. **Usar Token en Requests**
   ```bash
   curl -X GET http://localhost:3000/api/patients \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

### Ejemplos de Uso

#### Crear Paciente

```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_type": "dni",
    "document_number": "87654321",
    "first_name": "Carlos",
    "paternal_surname": "Mendoza",
    "maternal_surname": "Silva",
    "birth_date": "1985-05-15",
    "gender": "M",
    "email": "carlos.mendoza@email.com",
    "phone": "987654321"
  }'
```

#### Crear Cita

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "PATIENT_UUID",
    "doctor_id": "DOCTOR_UUID",
    "type": "consulta_medica",
    "date_time": "2025-06-15T10:00:00Z",
    "description": "Consulta de control"
  }'
```

## Configuración para Producción

### 1. Variables de Entorno de Producción

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=clave_jwt_super_segura_para_produccion
DB_HOST=tu_servidor_db
DB_USER=usuario_produccion
DB_PASSWORD=password_muy_seguro
DB_NAME=hce_production_db
CORS_ORIGIN=https://tu-frontend-domain.com
LOG_LEVEL=warn
```

### 2. Configuración de Seguridad

- Cambiar todas las claves secretas
- Configurar CORS para dominios específicos
- Usar HTTPS en producción
- Configurar firewall para PostgreSQL
- Implementar backup automático de base de datos

### 3. Monitoreo

```bash
# Instalar PM2 para gestión de procesos
npm install -g pm2

# Iniciar aplicación con PM2
pm2 start server/index.js --name hce-backend

# Configurar auto-restart
pm2 startup
pm2 save
```

## Solución de Problemas

### Error de Conexión a Base de Datos

```bash
# Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# Verificar conexión
psql -h localhost -U hce_user -d hce_db
```

### Error de Permisos

```bash
# Verificar permisos de usuario en base de datos
psql -U postgres -c "SELECT * FROM pg_user WHERE usename = 'hce_user';"
```

### Error de Dependencias

```bash
# Limpiar cache de npm
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error de Puerto en Uso

```bash
# Verificar qué proceso usa el puerto 3000
lsof -i :3000

# Cambiar puerto en .env
PORT=3001
```

## Estructura de Logs

Los logs se generan automáticamente y incluyen:

- **Requests HTTP**: Usando Morgan
- **Errores de aplicación**: Usando Winston
- **Auditoría**: En tabla `audit_logs`

### Ubicación de Logs

- **Desarrollo**: Consola
- **Producción**: Archivos en `/logs/` (si se configura)

## Backup y Restauración

### Backup de Base de Datos

```bash
# Crear backup
pg_dump -h localhost -U hce_user hce_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup comprimido
pg_dump -h localhost -U hce_user hce_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restauración

```bash
# Restaurar desde backup
psql -h localhost -U hce_user hce_db < backup_file.sql

# Restaurar desde backup comprimido
gunzip -c backup_file.sql.gz | psql -h localhost -U hce_user hce_db
```

## Soporte

Para soporte técnico o reportar problemas:

1. Revisar logs de la aplicación
2. Verificar configuración de base de datos
3. Consultar documentación técnica en `TECHNICAL_DOCS.md`
4. Contactar al equipo de desarrollo

---

**¡Instalación Completada!** 🎉

El sistema HCE Salud Vital Backend está listo para usar. Consulta la documentación técnica para más detalles sobre la API y funcionalidades avanzadas.

