# Backend Colegio - Sistema de Gestión Académica

API RESTful para la gestión académica de un colegio, desarrollada con NestJS y PostgreSQL (Supabase).

## 📋 Descripción

Sistema backend que permite gestionar:
- **Autenticación y usuarios**: Login con JWT, gestión de roles (ADMIN, PROFESOR, PADRE)
- **Estudiantes**: Registro, gestión de información personal
- **Profesores**: Registro, cargas horarias, gestión de cursos
- **Padres de familia**: Vinculación con estudiantes hijos
- **Estructura académica**: Cursos, materias, cargas horarias
- **Inscripciones**: Matriculación de estudiantes en cursos
- **Calificaciones**: Gestión de notas por trimestre (Ser, Saber, Hacer, Decidir, Autoevaluación)
- **Importación masiva**: Carga de notas desde archivos CSV/Excel
- **Comunicados**: Emisión de notificaciones a padres

## 🛠️ Tecnologías

- **Framework**: NestJS 11
- **Lenguaje**: TypeScript
- **ORM**: Prisma 7
- **Base de datos**: PostgreSQL (Supabase)
- **Autenticación**: JWT + bcrypt
- **Validación**: class-validator + class-transformer
- **Archivos**: ExcelJS, csv-parser
- **Testing**: Jest
- **Package Manager**: pnpm

## 🚀 Instalación

```bash
# Instalar dependencias
pnpm install

# Generar cliente Prisma
pnpm db:generate
```

## ⚙️ Configuración

Crear archivo `.env` en la raíz del proyecto:

```env
# Configuración del colegio
NOMBRE_COLEGIO="Abraham Reyes"
JWT_SECRET="tu-secreto-jwt-aqui"

# Conexión a Supabase (producción - puerto 6543 con pgbouncer)
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"

# Conexión directa (para migraciones - puerto 5432)
DIRECT_URL="postgresql://user:password@host:5432/postgres"
```

## 📦 Scripts

```bash
# Desarrollo
pnpm start          # Iniciar servidor
pnpm start:dev      # Iniciar con watch mode

# Build
pnpm build          # Compilar TypeScript

# Base de datos
pnpm db:generate    # Generar cliente Prisma
pnpm db:push        # Aplicar cambios al schema
pnpm db:migrate     # Ejecutar migraciones

# Testing
pnpm test           # Ejecutar tests unitarios
pnpm test:cov       # Tests con coverage
pnpm test:e2e       # Tests end-to-end

# Calidad de código
pnpm lint           # Linting y fixing
pnpm format         # Formatear código
```

## 📁 Estructura del Proyecto

```
src/
├── auth/                 # Módulo de autenticación
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── dto/
├── users/                # Gestión de usuarios
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── dto/
├── academic/            # Estructura académica
│   ├── academic.service.ts
│   ├── academic.controller.ts
│   └── dto/
├── enrollments/         # Inscripciones
├── grades/              # Calificaciones
├── communications/       # Comunicados
├── prisma/              # Configuración Prisma
├── common/              # Componentes compartidos
│   ├── response.interceptor.ts
│   ├── exception.filter.ts
│   └── pagination.dto.ts
└── main.ts              # Punto de entrada
```

## 🗄️ Modelos de Datos

### Entidades Principales

| Modelo | Descripción |
|--------|-------------|
| **Persona** | Datos básicos de personas |
| **Usuario** | Credenciales y rol de acceso |
| **Estudiante** | Datos académicos del alumno |
| **Profesor** | Especialidad y cargas |
| **PadreFamilia** | Padres/tutores de estudiantes |
| **Curso** | Gestión, turno, grado, paralelo |
| **Materia** | Áreas curriculares |
| **CargaHoraria** | Asignación profesor-materia-curso |
| **Inscripcion** | Matriculación de estudiantes |
| **Calificacion** | Notas por trimestre |
| **Comunicado** | Notificaciones a padres |

### Enums

- **RolUsuario**: ADMIN, PROFESOR, PADRE
- **EstadoInscripcion**: EFECTIVO, RETIRADO, REPROBADO
- **TipoComunicado**: FELICITACION, INDISCIPLINA, CITACION, MATERIAL_FALTO

## 🔐 Autenticación

### Login
```
POST /auth/login
Body: { "username": "...", "password": "..." }
```

### Registro (solo ADMIN para nuevos usuarios)
```
POST /auth/register
Body: { "nombres": "...", "apellidos": "...", "carnet": "...", "password": "...", "rol": "PROFESOR|PADRE" }
```

## 🛡️ Control de Acceso por Roles

### ADMIN
- Acceso completo a todos los endpoints
- Gestión de usuarios, cursos, materias, cargas
- Inscripciones y calificaciones

### PROFESOR
- Solo ve información de sus cursos actuales
- Gestión de estudiantes inscritos en sus cursos
- Registro y carga de calificaciones
- Emisión de comunicados

### PADRE
- Solo ve información de sus hijos vinculados
- Consulta de calificaciones de sus hijos
- Consulta de comunicados

## 📝 Endpoints Principales

### Auth
- `POST /auth/login` - Iniciar sesión
- `POST /auth/register` - Registrar usuario (ADMIN)
- `GET /auth/perfil` - Obtener perfil

### Users
- `POST /users/estudiante` - Crear estudiante (ADMIN)
- `POST /users/padre` - Crear padre (ADMIN)
- `POST /users/profesor` - Crear profesor (ADMIN)
- `POST /users/vincular` - Vincular padre-estudiante (ADMIN)
- `GET /users/estudiantes` - Listar estudiantes
- `GET /users/estudiantes/mis-hijos` - Ver mis hijos (PADRE)
- `GET /users/padres` - Listar padres (ADMIN)
- `GET /users/profesores` - Listar profesores (ADMIN)

### Academic
- `POST /academic/curso` - Crear curso (ADMIN)
- `POST /academic/materia` - Crear materia (ADMIN)
- `POST /academic/carga-horaria` - Asignar carga (ADMIN)
- `GET /academic/cursos` - Listar cursos
- `GET /academic/materias` - Listar materias
- `GET /academic/carga-horaria/mis-cargas` - Mis cargas (PROFESOR)

### Enrollments
- `POST /enrollments` - Matricular estudiante
- `GET /enrollments` - Listar inscripciones

### Grades
- `GET /grades/estudiante/:id` - Notas por estudiante
- `GET /grades/curso/:id` - Notas por curso
- `GET /grades/carga/:id` - Notas por carga horaria
- `POST /grades/upload` - Importar notas (CSV/Excel)
- `GET /grades/plantilla/:id` - Descargar plantilla Excel

### Communications
- `POST /communications` - Crear comunicado
- `GET /communications/estudiante/:id` - Ver comunicados

## 📊 Paginación

Todos los endpoints de lista soportan paginación:

```
GET /endpoint?page=1&limit=20
```

Respuesta:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## 📥 Importación de Notas

### Plantilla Excel
```bash
GET /grades/plantilla/1?trimestre=1
```
Genera un archivo Excel con los estudiantes del curso.

### Cargar Notas
```bash
POST /grades/upload
Content-Type: multipart/form-data
Body: {
  "file": archivo.xlsx,
  "id_carga": "1",
  "trimestre": "1"
}
```

Formato del archivo:
| carnet | id_estudiante | nombres | apellidos | nota_ser | nota_saber | nota_hacer | nota_decidir | autoevaluacion |

## ✅ Testing

```bash
# Ejecutar todos los tests
pnpm test

# Tests con coverage
pnpm test:cov
```

Tests disponibles:
- auth.service.spec.ts
- users.service.spec.ts
- academic.service.spec.ts
- enrollments.service.spec.ts
- grades.service.spec.ts
- communications.service.spec.ts

## 🤝 Contribución

1. Fork del repositorio
2. Crear branch feature (`git checkout -b feature/...)
3. Commit de cambios (`git commit -m 'Add feature'`)
4. Push al branch (`git push origin feature/...`)
5. Crear Pull Request

## 📄 Licencia

UNLICENSED