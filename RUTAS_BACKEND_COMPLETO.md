# Documentación Completa de Rutas - Backend Colegio

## Tabla de Contenidos
1. [Módulo Auth](#módulo-auth)
2. [Módulo Users](#módulo-users)
3. [Módulo Academic](#módulo-academic)
4. [Módulo Grades](#módulo-grades)
5. [Módulo Enrollments](#módulo-enrollments)
6. [Módulo Communications](#módulo-communications)

---

## Autenticación Global

Todas las rutas (excepto las indicadas) requieren:
- **Header:** `Authorization: Bearer <token_jwt>`
- **Roles:** ADMIN, PROFESOR, PADRE según la ruta

**Parámetros de paginación (query):**
| Parámetro | Tipo | Default |
|-----------|------|---------|
| page | number | 1 |
| limit | number | 20 |

---

# MÓDULO AUTH

## 1. Registrar Usuario

**Ruta:** `POST /auth/register`

**Autenticación:** NO requerida

**Body:**
```json
{
  "nombres": "string",        // OBLIGATORIO
  "apellidos": "string",      // OBLIGATORIO
  "carnet": "string",         // OBLIGATORIO
  "password": "string",       // OBLIGATORIO
  "rol": "PROFESOR | PADRE",  // OBLIGATORIO
  "username": "string",       // Opcional
  "correo": "string",         // Opcional
  "celular": "string"         // Opcional
}
```

**Respuesta (201):**
```json
{
  "mensaje": "Usuario registrado exitosamente",
  "id_persona": "uuid",
  "username": "string",
  "rol": "PROFESOR"
}
```

**Errores:** 400, 409

---

## 2. Iniciar Sesión

**Ruta:** `POST /auth/login`

**Autenticación:** NO requerida

**Body:**
```json
{
  "username": "string",       // OBLIGATORIO
  "password": "string"       // OBLIGATORIO
}
```

**Respuesta (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "nombres": "string",
  "rol": "PROFESOR"
}
```

**Errores:** 400, 401

---

## 3. Obtener Perfil

**Ruta:** `GET /auth/perfil`

**Autenticación:** JWT requerida

**Roles:** Todos

**Respuesta (200):**
```json
{
  "sub": "uuid",
  "rol": "ADMIN",
  "id_persona": "uuid"
}
```

---

# MÓDULO USERS

## 4. Crear Estudiante

**Ruta:** `POST /users/estudiante`

**Roles:** ADMIN

**Body:**
```json
{
  "nombres": "string",        // OBLIGATORIO
  "apellidos": "string",      // OBLIGATORIO
  "carnet": "string",         // OBLIGATORIO
  "correo": "string",         // Opcional
  "celular": "string",        // Opcional
  "codigo_rude": "string",    // Opcional
  "fecha_nac": "string"       // Opcional (YYYY-MM-DD)
}
```

**Respuesta (201):**
```json
{
  "mensaje": "Estudiante registrado exitosamente (Sin credenciales de acceso)",
  "datos": {
    "id_persona": "uuid",
    "nombres": "string",
    "apellidos": "string",
    "carnet": "string",
    "estudiante": {
      "id_persona": "uuid",
      "codigo_rude": "string",
      "fecha_nac": "Date"
    }
  }
}
```

---

## 5. Crear Padre de Familia

**Ruta:** `POST /users/padre`

**Roles:** ADMIN

**Body:**
```json
{
  "nombres": "string",        // OBLIGATORIO
  "apellidos": "string",      // OBLIGATORIO
  "carnet": "string",         // OBLIGATORIO
  "password": "string",       // OBLIGATORIO
  "username": "string",       // Opcional
  "correo": "string",         // Opcional
  "celular": "string",        // Opcional
  "parentesco": "string"      // Opcional
}
```

**Respuesta (201):**
```json
{
  "mensaje": "Padre de familia registrado exitosamente",
  "id_padre": "uuid",
  "username": "string"
}
```

---

## 6. Crear Profesor

**Ruta:** `POST /users/profesor`

**Roles:** ADMIN

**Body (nuevo profesor):**
```json
{
  "nombres": "string",        // OBLIGATORIO
  "apellidos": "string",      // OBLIGATORIO
  "carnet": "string",         // OBLIGATORIO
  "password": "string",       // OBLIGATORIO
  "username": "string",       // Opcional
  "correo": "string",         // Opcional
  "celular": "string",        // Opcional
  "especialidad": "string"    // Opcional
}
```

**Body (completar perfil):**
```json
{
  "carnet": "string",         // OBLIGATORIO
  "password": "string",       // OBLIGATORIO
  "especialidad": "string"    // Opcional
}
```

**Respuesta (201):**
```json
{
  "mensaje": "Profesor registrado exitosamente y listo para asignar cargas",
  "id_profesor": "uuid",
  "username": "string"
}
```

---

## 7. Vincular Familiar

**Ruta:** `POST /users/vincular`

**Roles:** ADMIN

**Body:**
```json
{
  "id_padre": "string",       // OBLIGATORIO (UUID)
  "id_estudiante": "string"   // OBLIGATORIO (UUID)
}
```

**Respuesta (201):**
```json
{
  "mensaje": "Estudiante y Padre vinculados correctamente",
  "vinculo": {
    "id_padre": "uuid",
    "id_estudiante": "uuid"
  }
}
```

---

## 8. Listar Estudiantes

**Ruta:** `GET /users/estudiantes`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_persona": "uuid",
      "persona": {
        "nombres": "string",
        "apellidos": "string",
        "carnet": "string",
        "correo": "string",
        "celular": "string"
      }
    }
  ],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

**Nota:** PROFESOR solo ve estudiantes de sus cursos.

---

## 9. Obtener Hijos (Padre)

**Ruta:** `GET /users/estudiantes/mis-hijos`

**Roles:** PADRE

**Query:** `?page=1&limit=20`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_persona": "uuid",
      "persona": { "nombres": "string", "apellidos": "string" },
      "inscripciones": [
        {
          "estado": "EFECTIVO",
          "curso": {
            "gestion": 2026,
            "grado": 1,
            "paralelo": "A",
            "nivel": "PRIMARIA"
          }
        }
      ]
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

## 10. Obtener Estudiante por ID

**Ruta:** `GET /users/estudiantes/:id`

**Roles:** ADMIN, PROFESOR, PADRE

**Respuesta (200):**
```json
{
  "id_persona": "uuid",
  "codigo_rude": "string",
  "persona": {
    "nombres": "string",
    "apellidos": "string",
    "carnet": "string",
    "correo": "string",
    "celular": "string"
  },
  "tutores": [
    {
      "padre": {
        "persona": { "nombres": "string", "apellidos": "string" }
      }
    }
  ]
}
```

**Errores:** 403 (profesor sin acceso), 404

---

## 11. Listar Padres

**Ruta:** `GET /users/padres`

**Roles:** ADMIN

**Query:** `?page=1&limit=20`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_persona": "uuid",
      "parentesco": "string",
      "persona": {
        "nombres": "string",
        "apellidos": "string",
        "carnet": "string",
        "usuario": { "username": "string" }
      }
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

## 12. Listar Profesores

**Ruta:** `GET /users/profesores`

**Roles:** ADMIN

**Query:** `?page=1&limit=20`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_persona": "uuid",
      "especialidad": "string",
      "persona": {
        "nombres": "string",
        "apellidos": "string",
        "carnet": "string",
        "usuario": { "username": "string" }
      }
    }
  ],
  "meta": { "total": 20, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

# MÓDULO ACADEMIC

## 13. Crear Curso

**Ruta:** `POST /academic/curso`

**Roles:** ADMIN

**Body:**
```json
{
  "gestion": 2026,            // OBLIGATORIO
  "turno": "string",          // OBLIGATORIO (MATUTINO/VESPERTINO)
  "grado": "string",          // OBLIGATORIO (1-6)
  "paralelo": "string",       // OBLIGATORIO (A, B, C...)
  "nivel": "string"           // OBLIGATORIO (PRIMARIA/SECUNDARIA)
}
```

**Respuesta (201):**
```json
{
  "mensaje": "Curso creado exitosamente",
  "curso": { "id_curso": 1, "grado": "1", "paralelo": "A" }
}
```

---

## 14. Actualizar Curso

**Ruta:** `PUT /academic/curso/:id`

**Roles:** ADMIN

**Body:** Mismo que crear curso

**Respuesta (200):**
```json
{
  "mensaje": "Curso actualizado exitosamente",
  "curso": { "id_curso": 1 }
}
```

---

## 15. Eliminar Curso

**Ruta:** `DELETE /academic/curso/:id`

**Roles:** ADMIN

**Respuesta (200):**
```json
{ "mensaje": "Curso eliminado exitosamente" }
```

---

## 16. Crear Materia

**Ruta:** `POST /academic/materia`

**Roles:** ADMIN

**Body:**
```json
{
  "nombre": "string",         // OBLIGATORIO
  "area": "string"           // Opcional
}
```

**Respuesta (201):**
```json
{
  "mensaje": "Materia creada exitosamente",
  "materia": { "id_materia": 1, "nombre": "Matemática" }
}
```

---

## 17. Actualizar Materia

**Ruta:** `PUT /academic/materia/:id`

**Roles:** ADMIN

**Body:** Mismo que crear materia

**Respuesta (200):**
```json
{
  "mensaje": "Materia actualizada exitosamente"
}
```

---

## 18. Eliminar Materia

**Ruta:** `DELETE /academic/materia/:id`

**Roles:** ADMIN

**Respuesta (200):**
```json
{ "mensaje": "Materia eliminada exitosamente" }
```

---

## 19. Crear Carga Horaria

**Ruta:** `POST /academic/carga-horaria`

**Roles:** ADMIN

**Body:**
```json
{
  "id_profesor": "string",    // OBLIGATORIO (UUID)
  "id_materia": number,       // OBLIGATORIO
  "id_curso": number         // OBLIGATORIO
}
```

**Respuesta (201):**
```json
{
  "mensaje": "Carga horaria asignada exitosamente",
  "carga": { "id_carga": 1 }
}
```

---

## 20. Eliminar Carga Horaria

**Ruta:** `DELETE /academic/carga-horaria/:id`

**Roles:** ADMIN

**Respuesta (200):**
```json
{ "mensaje": "Carga horaria eliminada exitosamente" }
```

---

## 21. Listar Cursos

**Ruta:** `GET /academic/cursos`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_curso": 1,
      "gestion": 2026,
      "turno": "MATUTINO",
      "grado": "1",
      "paralelo": "A",
      "nivel": "PRIMARIA"
    }
  ],
  "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
}
```

**Nota:** PROFESOR solo ve sus cursos.

---

## 22. Listar Cursos por Gestión

**Ruta:** `GET /academic/cursos/gestion/:anio`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20`

**Respuesta (200):** Similar a listar cursos, filtrado por año.

---

## 23. Obtener Curso por ID

**Ruta:** `GET /academic/cursos/:id`

**Roles:** ADMIN, PROFESOR

**Respuesta (200):**
```json
{
  "id_curso": 1,
  "gestion": 2026,
  "turno": "MATUTINO",
  "grado": "1",
  "paralelo": "A",
  "nivel": "PRIMARIA"
}
```

---

## 24. Listar Materias

**Ruta:** `GET /academic/materias`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_materia": 1,
      "nombre": "Matemática",
      "area": "Ciencias"
    }
  ],
  "meta": { "total": 15, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

## 25. Listar Materias por Gestión

**Ruta:** `GET /academic/materias/gestion/:anio`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20`

**Respuesta (200):** Similar a listar materias.

---

## 26. Obtener Materia por ID

**Ruta:** `GET /academic/materias/:id`

**Roles:** ADMIN, PROFESOR

**Respuesta (200):**
```json
{
  "id_materia": 1,
  "nombre": "Matemática",
  "area": "Ciencias"
}
```

---

## 27. Listar Cargas por Profesor

**Ruta:** `GET /academic/carga-horaria/profesor/:idProfesor`

**Roles:** ADMIN

**Query:** `?page=1&limit=20`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_carga": 1,
      "id_profesor": "uuid",
      "id_materia": 1,
      "id_curso": 1
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

## 28. Mis Cargas (Profesor)

**Ruta:** `GET /academic/carga-horaria/mis-cargas`

**Roles:** PROFESOR

**Query:** `?page=1&limit=20`

**Respuesta (200):** Similar a listar cargas por profesor.

---

# MÓDULO GRADES

## 29. Subir Notas (CSV)

**Ruta:** `POST /grades/upload`

**Roles:** ADMIN, PROFESOR

**Content-Type:** `multipart/form-data`

**Body (form-data):**
- `file`: archivo CSV (OBLIGATORIO)
- `id_carga`: string (OBLIGATORIO)
- `trimestre`: string (OBLIGATORIO: 1, 2 o 3)

**Formato CSV esperado:**
```csv
carnet,nota1,nota2,nota3,nota4,nota5,nota6,examen
1234567,80,85,90,75,88,92,85
```

**Respuesta (201):**
```json
{
  "mensaje": "Notas procesadas exitosamente",
  "actualizadas": 20,
  "creadas": 5
}
```

---

## 30. Obtener Notas por Estudiante

**Ruta:** `GET /grades/estudiante/:id_estudiante`

**Roles:** ADMIN, PROFESOR, PADRE

**Query:** `?page=1&limit=20`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_nota": "uuid",
      "trimestre": 1,
      "nota1": 80,
      "nota2": 85,
      "nota3": 90,
      "examen": 85,
      "promedio": 85,
      "carga": {
        "id_carga": 1,
        "materia": { "nombre": "Matemática" },
        "curso": { "grado": "1", "paralelo": "A" }
      }
    }
  ],
  "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

## 31. Obtener Notas por Curso

**Ruta:** `GET /grades/curso/:id_curso`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20&trimestre=1`

**Respuesta (200):**
```json
{
  "data": [
    {
      "estudiante": {
        "id_persona": "uuid",
        "nombres": "string",
        "apellidos": "string",
        "carnet": "string"
      },
      "notas": [
        {
          "trimestre": 1,
          "promedio": 85,
          "carga": { "id_materia": 1 }
        }
      ]
    }
  ],
  "meta": { "total": 30, "page": 1, "limit": 20, "totalPages": 2 }
}
```

---

## 32. Obtener Notas por Curso y Gestión

**Ruta:** `GET /grades/curso/:id_curso/gestion/:anio`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20&trimestre=1`

**Respuesta (200):** Similar a notas por curso.

---

## 33. Obtener Notas por Carga

**Ruta:** `GET /grades/carga/:id_carga`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20&trimestre=1`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_nota": "uuid",
      "trimestre": 1,
      "nota1": 80,
      "promedio": 85,
      "estudiante": {
        "id_persona": "uuid",
        "nombres": "string",
        "apellidos": "string",
        "carnet": "string"
      }
    }
  ],
  "meta": { "total": 30, "page": 1, "limit": 20, "totalPages": 2 }
}
```

---

## 34. Descargar Plantilla Excel

**Ruta:** `GET /grades/plantilla/:id_carga`

**Roles:** ADMIN, PROFESOR

**Query:** `?trimestre=1` (OBLIGATORIO: 1, 2 o 3)

**Respuesta (200):**
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment; filename="plantilla_notas.xlsx"`

**Archivo Excel con columnas:** carnet, nota1, nota2, nota3, nota4, nota5, nota6, examen

---

# MÓDULO ENROLLMENTS

## 35. Matricular Estudiante

**Ruta:** `POST /enrollments`

**Roles:** ADMIN

**Body:**
```json
{
  "id_estudiante": "string",  // OBLIGATORIO (UUID)
  "id_curso": number         // OBLIGATORIO
}
```

**Respuesta (201):**
```json
{
  "mensaje": "Estudiante matriculado exitosamente",
  "inscripcion": {
    "id_inscripcion": 1,
    "id_estudiante": "uuid",
    "id_curso": 1,
    "estado": "EFECTIVO"
  }
}
```

---

## 36. Listar Inscripciones

**Ruta:** `GET /enrollments`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20&id_curso=1`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_inscripcion": 1,
      "id_estudiante": "uuid",
      "id_curso": 1,
      "estado": "EFECTIVO",
      "estudiante": {
        "persona": { "nombres": "string", "apellidos": "string", "carnet": "string" }
      },
      "curso": {
        "id_curso": 1,
        "grado": "1",
        "paralelo": "A",
        "gestion": 2026
      }
    }
  ],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

---

## 37. Listar Inscripciones por Gestión

**Ruta:** `GET /enrollments/gestion/:anio`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20&id_curso=1`

**Respuesta (200):** Similar a listar inscripciones, filtrado por año.

---

## 38. Listar Inscripciones por Estudiante

**Ruta:** `GET /enrollments/estudiante/:id_estudiante`

**Roles:** ADMIN, PROFESOR, PADRE

**Query:** `?page=1&limit=20`

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_inscripcion": 1,
      "estado": "EFECTIVO",
      "curso": {
        "id_curso": 1,
        "grado": "1",
        "paralelo": "A",
        "gestion": 2026,
        "nivel": "PRIMARIA"
      }
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

## 39. Obtener Inscripción por ID

**Ruta:** `GET /enrollments/:id`

**Roles:** ADMIN, PROFESOR

**Respuesta (200):**
```json
{
  "id_inscripcion": 1,
  "id_estudiante": "uuid",
  "id_curso": 1,
  "estado": "EFECTIVO",
  "estudiante": { "persona": { "nombres": "string", "apellidos": "string" } },
  "curso": { "id_curso": 1, "grado": "1", "paralelo": "A" }
}
```

---

## 40. Actualizar Inscripción

**Ruta:** `PUT /enrollments/:id`

**Roles:** ADMIN

**Body:**
```json
{
  "estado": "EFECTIVO | RETIRADO | TRASLADADO"  // Opcional
}
```

**Respuesta (200):**
```json
{
  "mensaje": "Inscripcion actualizada exitosamente",
  "inscripcion": { "id_inscripcion": 1, "estado": "RETIRADO" }
}
```

---

## 41. Eliminar Inscripción

**Ruta:** `DELETE /enrollments/:id`

**Roles:** ADMIN

**Respuesta (200):**
```json
{ "mensaje": "Inscripcion eliminada exitosamente" }
```

---

# MÓDULO COMMUNICATIONS

## 42. Crear Comunicado

**Ruta:** `POST /communications`

**Roles:** PROFESOR

**Body:**
```json
{
  "id_estudiante": "string",  // OBLIGATORIO (UUID)
  "tipo": "INFORMATIVO | URGENTE | ACADEMICO",  // OBLIGATORIO
  "descripcion": "string"     // OBLIGATORIO
}
```

**Valores válidos para tipo:**
- `INFORMATIVO`
- `URGENTE`
- `ACADEMICO`

**Respuesta (201):**
```json
{
  "mensaje": "Comunicado emitido exitosamente",
  "comunicado": {
    "id_comunicado": 1,
    "id_estudiante": "uuid",
    "tipo": "URGENTE",
    "descripcion": "string",
    "leido": false,
    "fecha_emision": "2026-05-18T10:00:00Z"
  }
}
```

---

## 43. Mis Comunicados (Padre)

**Ruta:** `GET /communications`

**Roles:** PADRE

**Query:** `?page=1&limit=20&tipo=URGENTE&leido=false&fechaDesde=2026-01-01&fechaHasta=2026-12-31`

**Filtros opcionales:**
- `tipo`: INFORMATIVO, URGENTE, ACADEMICO
- `leido`: true/false
- `fechaDesde`: YYYY-MM-DD
- `fechaHasta`: YYYY-MM-DD

**Respuesta (200):**
```json
{
  "data": [
    {
      "id_comunicado": 1,
      "tipo": "URGENTE",
      "descripcion": "string",
      "leido": false,
      "fecha_emision": "2026-05-18T10:00:00Z",
      "profesor": {
        "persona": { "nombres": "string", "apellidos": "string" }
      },
      "estudiante": {
        "persona": { "nombres": "string", "apellidos": "string" }
      }
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

## 44. Comunicados por Estudiante

**Ruta:** `GET /communications/estudiante/:id_estudiante`

**Roles:** ADMIN, PROFESOR

**Query:** `?page=1&limit=20&tipo=URGENTE&leido=false`

**Respuesta (200):** Similar a mis comunicados.

---

## 45. Marcar Comunicado como Leído

**Ruta:** `PATCH /communications/:id/leido`

**Roles:** PADRE

**Respuesta (200):**
```json
{
  "mensaje": "Comunicado marcado como leído",
  "comunicado": { "id_comunicado": 1, "leido": true }
}
```

---

# RESUMEN DE RUTAS POR MÓDULO

| # | Método | Ruta | Roles |
|---|--------|------|-------|
| 1 | POST | /auth/register | Público |
| 2 | POST | /auth/login | Público |
| 3 | GET | /auth/perfil | Todos |
| 4 | POST | /users/estudiante | ADMIN |
| 5 | POST | /users/padre | ADMIN |
| 6 | POST | /users/profesor | ADMIN |
| 7 | POST | /users/vincular | ADMIN |
| 8 | GET | /users/estudiantes | ADMIN, PROFESOR |
| 9 | GET | /users/estudiantes/mis-hijos | PADRE |
| 10 | GET | /users/estudiantes/:id | ADMIN, PROFESOR, PADRE |
| 11 | GET | /users/padres | ADMIN |
| 12 | GET | /users/profesores | ADMIN |
| 13 | POST | /academic/curso | ADMIN |
| 14 | PUT | /academic/curso/:id | ADMIN |
| 15 | DELETE | /academic/curso/:id | ADMIN |
| 16 | POST | /academic/materia | ADMIN |
| 17 | PUT | /academic/materia/:id | ADMIN |
| 18 | DELETE | /academic/materia/:id | ADMIN |
| 19 | POST | /academic/carga-horaria | ADMIN |
| 20 | DELETE | /academic/carga-horaria/:id | ADMIN |
| 21 | GET | /academic/cursos | ADMIN, PROFESOR |
| 22 | GET | /academic/cursos/gestion/:anio | ADMIN, PROFESOR |
| 23 | GET | /academic/cursos/:id | ADMIN, PROFESOR |
| 24 | GET | /academic/materias | ADMIN, PROFESOR |
| 25 | GET | /academic/materias/gestion/:anio | ADMIN, PROFESOR |
| 26 | GET | /academic/materias/:id | ADMIN, PROFESOR |
| 27 | GET | /academic/carga-horaria/profesor/:id | ADMIN |
| 28 | GET | /academic/carga-horaria/mis-cargas | PROFESOR |
| 29 | POST | /grades/upload | ADMIN, PROFESOR |
| 30 | GET | /grades/estudiante/:id | ADMIN, PROFESOR, PADRE |
| 31 | GET | /grades/curso/:id | ADMIN, PROFESOR |
| 32 | GET | /grades/curso/:id/gestion/:anio | ADMIN, PROFESOR |
| 33 | GET | /grades/carga/:id | ADMIN, PROFESOR |
| 34 | GET | /grades/plantilla/:id_carga | ADMIN, PROFESOR |
| 35 | POST | /enrollments | ADMIN |
| 36 | GET | /enrollments | ADMIN, PROFESOR |
| 37 | GET | /enrollments/gestion/:anio | ADMIN, PROFESOR |
| 38 | GET | /enrollments/estudiante/:id | ADMIN, PROFESOR, PADRE |
| 39 | GET | /enrollments/:id | ADMIN, PROFESOR |
| 40 | PUT | /enrollments/:id | ADMIN |
| 41 | DELETE | /enrollments/:id | ADMIN |
| 42 | POST | /communications | PROFESOR |
| 43 | GET | /communications | PADRE |
| 44 | GET | /communications/estudiante/:id | ADMIN, PROFESOR |
| 45 | PATCH | /communications/:id/leido | PADRE |

---

# CÓDIGOS DE ESTADO HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Solicitud exitosa |
| 201 | Recurso creado exitosamente |
| 400 | Error en la solicitud (datos inválidos) |
| 401 | No autorizado |
| 403 | Acceso denegado (rol no permitido) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (registro duplicado) |