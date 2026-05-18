# Documentación de Rutas - Módulo de Autenticación (Auth)

## Tabla de Contenidos
1. [Registrar Usuario](#1-registrar-usuario)
2. [Iniciar Sesión](#2-iniciar-sesión)
3. [Obtener Perfil](#3-obtener-perfil)
4. [Listar Padres (desde users)](#4-listar-padres-desde-users)
5. [Obtener Hijos (desde users)](#5-obtener-hijos-desde-users)

---

## 1. Registrar Usuario

**Ruta:** `POST /auth/register`

**Autenticación:** NO requerida (público)

**Body (JSON):**
```json
{
  "nombres": "string",        // OBLIGATORIO
  "apellidos": "string",      // OBLIGATORIO
  "carnet": "string",         // OBLIGATORIO (único)
  "password": "string",       // OBLIGATORIO
  "rol": "PROFESOR | PADRE",  // OBLIGATORIO
  "username": "string",       // Opcional (default: carnet)
  "correo": "string",         // Opcional
  "celular": "string"        // Opcional
}
```

**Valores válidos para `rol`:**
- `PROFESOR`
- `PADRE`

> **Nota:** El rol `ADMIN` no está permitido en esta ruta. Contacte al administrador para crear usuarios ADMIN.

**Respuesta exitosa (201):**
```json
{
  "mensaje": "Usuario registrado exitosamente",
  "id_persona": "uuid",
  "username": "string",
  "rol": "PROFESOR"
}
```

**Posibles errores:**
- `400`: Faltan campos obligatorios o rol inválido
- `409`: El carnet o username ya existe

---

## 2. Iniciar Sesión

**Ruta:** `POST /auth/login`

**Autenticación:** NO requerida (público)

**Body (JSON):**
```json
{
  "username": "string",       // OBLIGATORIO
  "password": "string"       // OBLIGATORIO
}
```

**Respuesta exitosa (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "nombres": "string",
  "rol": "PROFESOR"
}
```

> El `access_token` debe usarse en el header `Authorization: Bearer <token>` para las rutas protegidas.

**Posibles errores:**
- `400`: Faltan username o password
- `401`: Credenciales incorrectas (usuario inactivo o contraseña wrong)

---

## 3. Obtener Perfil

**Ruta:** `GET /auth/perfil`

**Autenticación:** REQUERIDA (JWT)

**Headers:**
```
Authorization: Bearer <token_jwt>
```

**Respuesta exitosa (200):**
```json
{
  "sub": "uuid",
  "rol": "PROFESOR | PADRE | ADMIN",
  "id_persona": "uuid"
}
```

**Posibles errores:**
- `401`: Token no válido o ausente

---

## 4. Listar Padres (desde users)

**Ruta:** `GET /users/padres`

**Rol requerido:** `ADMIN`

**Headers:**
```
Authorization: Bearer <token_jwt>
```

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

## 5. Obtener Hijos (desde users)

**Ruta:** `GET /users/estudiantes/mis-hijos`

**Rol requerido:** `PADRE`

**Headers:**
```
Authorization: Bearer <token_jwt>
```

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

## Resumen de Rutas

| Ruta | Método | Autenticación | Roles permitidos |
|------|--------|---------------|-------------------|
| /auth/register | POST | No | Público |
| /auth/login | POST | No | Público |
| /auth/perfil | GET | JWT | Todos |
| /users/padres | GET | JWT | ADMIN |
| /users/estudiantes/mis-hijos | GET | JWT | PADRE |

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Solicitud exitosa |
| 201 | Recurso creado exitosamente |
| 400 | Error en la solicitud (datos inválidos) |
| 401 | No autorizado (credenciales inválidas) |
| 409 | Conflicto (registro duplicado) |

---

## Notas Adicionales

1. **JWT:** Todas las rutas protegidas (excepto register y login) requieren el token en el header `Authorization: Bearer <token>`

2. **Roles válidos para register:** Solo `PROFESOR` y `PADRE`. El rol `ADMIN` debe ser creado directamente en la base de datos.

3. **Paginación:** Las rutas de listado soportan `page` y `limit` como query parameters (default: page=1, limit=20)

4. **Listado de estudiantes para padres:** Los padres solo pueden ver a sus hijos vinculados mediante la ruta `GET /users/estudiantes/mis-hijos`