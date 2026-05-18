# Documentación de Rutas - Módulo de Usuarios (Estudiantes y Profesores)

## Tabla de Contenidos
1. [Crear Estudiante](#1-crear-estudiante)
2. [Crear Padre de Familia](#2-crear-padre-de-familia)
3. [Crear Profesor](#3-crear-profesor)
4. [Vincular Familiar](#4-vincular-familiar)
5. [Listar Todos los Estudiantes](#5-listar-todos-los-estudiantes)
6. [Listar Estudiantes por Profesor](#6-listar-estudiantes-por-profesor)
7. [Obtener Hijos (Padre)](#7-obtener-hijos-padre)
8. [Obtener Estudiante por ID](#8-obtener-estudiante-por-id)
9. [Listar Todos los Padres](#9-listar-todos-los-padres)
10. [Listar Todos los Profesores](#10-listar-todos-los-profesores)

---

## Autenticación
Todas las rutas requieren token JWT y RolesGuard.

**Headers requeridos:**
```
Authorization: Bearer <token_jwt>
```

**Parámetros de paginación (para todas las rutas GET con listado):**
| Parámetro | Tipo | Descripción | Default |
|-----------|------|-------------|---------|
| page | number | Página actual | 1 |
| limit | Cantidad de registros por página | 20 |

---

## 1. Crear Estudiante

**Ruta:** `POST /users/estudiante`

**Rol requerido:** `ADMIN`

**Body (JSON):**
```json
{
  "nombres": "string",        // OBLIGATORIO
  "apellidos": "string",      // OBLIGATORIO
  "carnet": "string",         // OBLIGATORIO (único)
  "correo": "string",         // Opcional
  "celular": "string",        // Opcional
  "codigo_rude": "string",    // Opcional (único)
  "fecha_nac": "string"       // Opcional (formato YYYY-MM-DD)
}
```

**Respuesta exitosa (201):**
```json
{
  "mensaje": "Estudiante registrado exitosamente (Sin credenciales de acceso)",
  "datos": {
    "id_persona": "uuid",
    "nombres": "string",
    "apellidos": "string",
    "carnet": "string",
    "correo": "string | null",
    "celular": "string | null",
    "estudiante": {
      "id_persona": "uuid",
      "codigo_rude": "string | null",
      "fecha_nac": "Date | null"
    }
  }
}
```

**Posibles errores:**
- `400`: Faltan campos obligatorios (nombres, apellidos, carnet)
- `409`: El carnet o código RUDE ya existe

---

## 2. Crear Padre de Familia

**Ruta:** `POST /users/padre`

**Rol requerido:** `ADMIN`

**Body (JSON):**
```json
{
  "nombres": "string",        // OBLIGATORIO
  "apellidos": "string",      // OBLIGATORIO
  "carnet": "string",         // OBLIGATORIO (único)
  "password": "string",       // OBLIGATORIO
  "username": "string",       // Opcional (default: carnet)
  "correo": "string",         // Opcional
  "celular": "string",        // Opcional
  "parentesco": "string"      // Opcional
}
```

**Respuesta exitosa (201):**
```json
{
  "mensaje": "Padre de familia registrado exitosamente",
  "id_padre": "uuid",
  "username": "string"
}
```

**Posibles errores:**
- `400`: Faltan campos obligatorios
- `409`: El carnet o username ya existe

---

## 3. Crear Profesor

**Ruta:** `POST /users/profesor`

**Rol requerido:** `ADMIN`

**Caso A: Nuevo profesor (persona no existe)**
```json
{
  "nombres": "string",        // OBLIGATORIO
  "apellidos": "string",      // OBLIGATORIO
  "carnet": "string",         // OBLIGATORIO
  "password": "string",       // OBLIGATORIO
  "username": "string",       // Opcional (default: carnet)
  "correo": "string",         // Opcional
  "celular": "string",        // Opcional
  "especialidad": "string"    // Opcional
}
```

**Caso B: Completar perfil (persona existe sin usuario)**
```json
{
  "carnet": "string",         // OBLIGATORIO
  "password": "string",       // OBLIGATORIO
  "username": "string",       // Opcional
  "especialidad": "string"    // Opcional
}
```

**Respuesta exitosa (201) - Nuevo profesor:**
```json
{
  "mensaje": "Profesor registrado exitosamente y listo para asignar cargas",
  "id_profesor": "uuid",
  "username": "string"
}
```

**Respuesta exitosa (201) - Completar perfil:**
```json
{
  "mensaje": "Perfil de profesor completado exitosamente",
  "id_profesor": "uuid",
  "username": "string"
}
```

**Posibles errores:**
- `400`: Faltan campos obligatorios
- `409`: El carnet ya está registrado como profesor, la persona existe sin usuario, o el carnet pertenece a otro rol

---

## 4. Vincular Familiar

**Ruta:** `POST /users/vincular`

**Rol requerido:** `ADMIN`

**Body (JSON):**
```json
{
  "id_padre": "string",       // OBLIGATORIO (UUID del padre)
  "id_estudiante": "string"   // OBLIGATORIO (UUID del estudiante)
}
```

**Respuesta exitosa (201):**
```json
{
  "mensaje": "Estudiante y Padre vinculados correctamente",
  "vinculo": {
    "id_padre": "uuid",
    "id_estudiante": "uuid"
  }
}
```

**Posibles errores:**
- `400`: Faltan campos obligatorios
- `404`: No existe el padre o el estudiante
- `409`: Ya están vinculados

---

## 5. Listar Todos los Estudiantes

**Ruta:** `GET /users/estudiantes`

**Roles requeridos:** `ADMIN`, `PROFESOR`

**Query Parameters:**
```
?page=1&limit=20
```

**Respuesta exitosa (200):**
```json
{
  "data": [
    {
      "id_persona": "uuid",
      "persona": {
        "id_persona": "uuid",
        "nombres": "string",
        "apellidos": "string",
        "carnet": "string",
        "correo": "string | null",
        "celular": "string | null"
      }
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**Notas:**
- Si el rol es `PROFESOR`, solo retorna estudiantes de sus cursos asignados

---

## 6. Listar Estudiantes por Profesor

**Ruta:** `GET /users/estudiantes`

**Rol requerido:** `PROFESOR`

**Query Parameters:**
```
?page=1&limit=20
```

**Notas:**
- Retorna solo los estudiantes Inscritos en los cursos del profesor en la gestión actual
- Solo estudiantes con estado de inscripción `EFECTIVO`

---

## 7. Obtener Hijos (Padre)

**Ruta:** `GET /users/estudiantes/mis-hijos`

**Rol requerido:** `PADRE`

**Query Parameters:**
```
?page=1&limit=20
```

**Respuesta exitosa (200):**
```json
{
  "data": [
    {
      "id_persona": "uuid",
      "persona": {
        "id_persona": "uuid",
        "nombres": "string",
        "apellidos": "string",
        "carnet": "string",
        "correo": "string | null",
        "celular": "string | null"
      },
      "inscripciones": [
        {
          "id_inscripcion": "uuid",
          "estado": "EFECTIVO",
          "curso": {
            "id_curso": "uuid",
            "gestion": 2026,
            "grado": 1,
            "paralelo": "A",
            "nivel": "PRIMARIA"
          }
        }
      ]
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## 8. Obtener Estudiante por ID

**Ruta:** `GET /users/estudiantes/:id`

**Roles requeridos:** `ADMIN`, `PROFESOR`, `PADRE`

**Parámetros de ruta:**
- `id` - UUID del estudiante

**Respuesta exitosa (200):**
```json
{
  "id_persona": "uuid",
  "codigo_rude": "string | null",
  "fecha_nac": "Date | null",
  "persona": {
    "id_persona": "uuid",
    "nombres": "string",
    "apellidos": "string",
    "carnet": "string",
    "correo": "string | null",
    "celular": "string | null"
  },
  "tutores": [
    {
      "id_padre": "uuid",
      "id_estudiante": "uuid",
      "padre": {
        "persona": {
          "nombres": "string",
          "apellidos": "string",
          "carnet": "string"
        }
      }
    }
  ]
}
```

**Posibles errores:**
- `403`: El profesor no tiene acceso a este estudiante
- `404`: Estudiante no encontrado

---

## 9. Listar Todos los Padres

**Ruta:** `GET /users/padres`

**Rol requerido:** `ADMIN`

**Query Parameters:**
```
?page=1&limit=20
```

**Respuesta exitosa (200):**
```json
{
  "data": [
    {
      "id_persona": "uuid",
      "parentesco": "string | null",
      "persona": {
        "id_persona": "uuid",
        "nombres": "string",
        "apellidos": "string",
        "carnet": "string",
        "correo": "string | null",
        "celular": "string | null",
        "usuario": {
          "username": "string"
        }
      }
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

## 10. Listar Todos los Profesores

**Ruta:** `GET /users/profesores`

**Rol requerido:** `ADMIN`

**Query Parameters:**
```
?page=1&limit=20
```

**Respuesta exitosa (200):**
```json
{
  "data": [
    {
      "id_persona": "uuid",
      "especialidad": "string | null",
      "persona": {
        "id_persona": "uuid",
        "nombres": "string",
        "apellidos": "string",
        "carnet": "string",
        "correo": "string | null",
        "celular": "string | null",
        "usuario": {
          "username": "string"
        }
      }
    }
  ],
  "meta": {
    "total": 20,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Resumen de Roles por Ruta

| Ruta | ADMIN | PROFESOR | PADRE |
|------|-------|----------|-------|
| POST /users/estudiante | ✅ | ❌ | ❌ |
| POST /users/padre | ✅ | ❌ | ❌ |
| POST /users/profesor | ✅ | ❌ | ❌ |
| POST /users/vincular | ✅ | ❌ | ❌ |
| GET /users/estudiantes | ✅ | ✅ | ❌ |
| GET /users/estudiantes/mis-hijos | ❌ | ❌ | ✅ |
| GET /users/estudiantes/:id | ✅ | ✅ | ✅ |
| GET /users/padres | ✅ | ❌ | ❌ |
| GET /users/profesores | ✅ | ❌ | ❌ |

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Solicitud exitosa |
| 201 | Recurso creado exitosamente |
| 400 | Error en la solicitud (datos inválidos) |
| 403 | Acceso denegado |
| 404 | Recurso no encontrado |
| 409 | Conflicto (registro duplicado) |