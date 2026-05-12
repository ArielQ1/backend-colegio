import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCursoDto } from './dto/create-curso.dto';
import { CreateMateriaDto } from './dto/create-materia.dto';
import { CreateCargaHorariaDto } from './dto/create-carga-horaria.dto';
import { PaginationDto } from '../common/pagination.dto';

type PrismaKnownError = { code?: string; meta?: { target?: string[] | string } };

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  async createCurso(data: CreateCursoDto) {
    const gestion = data.gestion;
    const turno = data.turno?.trim();
    const grado = data.grado?.trim();
    const paralelo = data.paralelo?.trim();
    const nivel = data.nivel?.trim();

    if (!gestion || !turno || !grado || !paralelo || !nivel) {
      throw new BadRequestException(
        'gestion, turno, grado, paralelo y nivel son obligatorios',
      );
    }

    if (gestion < 2000 || gestion > 2100) {
      throw new BadRequestException(
        'gestion debe ser un año válido entre 2000 y 2100',
      );
    }

    const cursoExistente = await this.prisma.curso.findFirst({
      where: {
        gestion,
        turno,
        grado,
        paralelo,
        nivel,
      },
    });

    if (cursoExistente) {
      throw new ConflictException(
        'Ya existe un curso con esa combinación de gestión, turno, grado, paralelo y nivel',
      );
    }

    try {
      const nuevoCurso = await this.prisma.curso.create({
        data: {
          gestion,
          turno,
          grado,
          paralelo,
          nivel,
        },
      });

      return {
        mensaje: 'Curso creado exitosamente',
        curso: nuevoCurso,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('El curso ya existe en el sistema');
      }
      throw error;
    }
  }

  async createMateria(data: CreateMateriaDto) {
    const nombre = data.nombre?.trim();
    const area = data.area?.trim() || null;

    if (!nombre) {
      throw new BadRequestException('nombre es obligatorio');
    }

    const materiaExistente = await this.prisma.materia.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } },
    });

    if (materiaExistente) {
      throw new ConflictException(
        'Ya existe una materia con ese nombre',
      );
    }

    try {
      const nuevaMateria = await this.prisma.materia.create({
        data: {
          nombre,
          area,
        },
      });

      return {
        mensaje: 'Materia creada exitosamente',
        materia: nuevaMateria,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('La materia ya existe en el sistema');
      }
      throw error;
    }
  }

  async createCargaHoraria(data: CreateCargaHorariaDto) {
    const idProfesor = data.id_profesor?.trim();
    const idMateria = data.id_materia;
    const idCurso = data.id_curso;

    if (!idProfesor || !idMateria || !idCurso) {
      throw new BadRequestException(
        'id_profesor, id_materia e id_curso son obligatorios',
      );
    }

    const profesor = await this.prisma.profesor.findUnique({
      where: { id_persona: idProfesor },
      select: { id_persona: true },
    });

    if (!profesor) {
      throw new BadRequestException(
        'El id_profesor no existe en el sistema',
      );
    }

    const materia = await this.prisma.materia.findUnique({
      where: { id_materia: idMateria },
      select: { id_materia: true },
    });

    if (!materia) {
      throw new BadRequestException(
        'El id_materia no existe en el sistema',
      );
    }

    const curso = await this.prisma.curso.findUnique({
      where: { id_curso: idCurso },
      select: { id_curso: true },
    });

    if (!curso) {
      throw new BadRequestException(
        'El id_curso no existe en el sistema',
      );
    }

    const cargaExistente = await this.prisma.cargaHoraria.findFirst({
      where: {
        id_profesor: idProfesor,
        id_materia: idMateria,
        id_curso: idCurso,
      },
      select: { id_carga: true },
    });

    if (cargaExistente) {
      throw new ConflictException(
        'Esa carga horaria ya está asignada',
      );
    }

    try {
      const nuevaCarga = await this.prisma.cargaHoraria.create({
        data: {
          id_profesor: idProfesor,
          id_materia: idMateria,
          id_curso: idCurso,
        },
        include: {
          profesor: {
            include: {
              persona: {
                select: {
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
          materia: true,
          curso: true,
        },
      });

      return {
        mensaje: 'Carga horaria asignada exitosamente al profesor',
        carga: nuevaCarga,
      };
    } catch {
      throw new BadRequestException(
        'Error al asignar la carga. Verifica que los IDs del profesor, materia y curso sean correctos',
      );
    }
  }

  async getAllCursos(pagination: PaginationDto, idProfesor?: string, rol?: string) {
    const gestionActual = new Date().getFullYear();
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    let where: any = {};

    if (rol === 'PROFESOR' && idProfesor) {
      const cargas = await this.prisma.cargaHoraria.findMany({
        where: {
          id_profesor: idProfesor,
          curso: { gestion: gestionActual },
        },
        select: { id_curso: true },
      });
      where = { id_curso: { in: cargas.map((c) => c.id_curso) } };
    }

    const [data, total] = await Promise.all([
      this.prisma.curso.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { gestion: 'desc' },
          { nivel: 'asc' },
          { grado: 'asc' },
          { paralelo: 'asc' },
        ],
      }),
      this.prisma.curso.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAllMaterias(pagination: PaginationDto, idProfesor?: string, rol?: string) {
    const gestionActual = new Date().getFullYear();
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    let where: any = {};

    if (rol === 'PROFESOR' && idProfesor) {
      const cargas = await this.prisma.cargaHoraria.findMany({
        where: {
          id_profesor: idProfesor,
          curso: { gestion: gestionActual },
        },
        select: { id_materia: true },
      });
      const idsMaterias = [...new Set(cargas.map((c) => c.id_materia))];
      where = { id_materia: { in: idsMaterias } };
    }

    const [data, total] = await Promise.all([
      this.prisma.materia.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.materia.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCursosPorProfesorGestion(idProfesor: string, gestion: number, pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const cargas = await this.prisma.cargaHoraria.findMany({
      where: {
        id_profesor: idProfesor,
        curso: { gestion },
      },
      select: { id_curso: true },
    });

    const idsCursos = [...new Set(cargas.map((c) => c.id_curso))];

    if (idsCursos.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.curso.findMany({
        where: { id_curso: { in: idsCursos } },
        skip,
        take: limit,
        orderBy: [
          { nivel: 'asc' },
          { grado: 'asc' },
          { paralelo: 'asc' },
        ],
      }),
      this.prisma.curso.count({ where: { id_curso: { in: idsCursos } } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMateriasPorProfesorGestion(idProfesor: string, gestion: number, pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const cargas = await this.prisma.cargaHoraria.findMany({
      where: {
        id_profesor: idProfesor,
        curso: { gestion },
      },
      select: { id_materia: true },
    });

    const idsMaterias = [...new Set(cargas.map((c) => c.id_materia))];

    if (idsMaterias.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.materia.findMany({
        where: { id_materia: { in: idsMaterias } },
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.materia.count({ where: { id_materia: { in: idsMaterias } } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCargasPorProfesor(idProfesor: string, pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.cargaHoraria.findMany({
        where: { id_profesor: idProfesor },
        skip,
        take: limit,
        include: {
          materia: true,
          curso: true,
        },
      }),
      this.prisma.cargaHoraria.count({ where: { id_profesor: idProfesor } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCursoById(id: number) {
    const curso = await this.prisma.curso.findUnique({
      where: { id_curso: id },
    });
    if (!curso) {
      throw new NotFoundException(`Curso con ID ${id} no encontrado`);
    }
    return curso;
  }

  async getMateriaById(id: number) {
    const materia = await this.prisma.materia.findUnique({
      where: { id_materia: id },
    });
    if (!materia) {
      throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    }
    return materia;
  }

  async updateCurso(id: number, data: CreateCursoDto) {
    const gestion = data.gestion;
    const turno = data.turno?.trim();
    const grado = data.grado?.trim();
    const paralelo = data.paralelo?.trim();
    const nivel = data.nivel?.trim();

    if (!gestion || !turno || !grado || !paralelo || !nivel) {
      throw new BadRequestException(
        'gestion, turno, grado, paralelo y nivel son obligatorios',
      );
    }

    const existe = await this.prisma.curso.findUnique({
      where: { id_curso: id },
    });

    if (!existe) {
      throw new NotFoundException(`Curso con ID ${id} no encontrado`);
    }

    const duplicado = await this.prisma.curso.findFirst({
      where: {
        gestion,
        turno,
        grado,
        paralelo,
        nivel,
        NOT: { id_curso: id },
      },
    });

    if (duplicado) {
      throw new ConflictException(
        'Ya existe un curso con esa combinación de gestión, turno, grado, paralelo y nivel',
      );
    }

    return await this.prisma.curso.update({
      where: { id_curso: id },
      data: { gestion, turno, grado, paralelo, nivel },
    });
  }

  async deleteCurso(id: number) {
    const existe = await this.prisma.curso.findUnique({
      where: { id_curso: id },
    });

    if (!existe) {
      throw new NotFoundException(`Curso con ID ${id} no encontrado`);
    }

    await this.prisma.curso.delete({ where: { id_curso: id } });
    return { success: true, message: 'Curso eliminado exitosamente' };
  }

  async updateMateria(id: number, data: CreateMateriaDto) {
    const nombre = data.nombre?.trim();
    const area = data.area?.trim() || null;

    if (!nombre) {
      throw new BadRequestException('nombre es obligatorio');
    }

    const existe = await this.prisma.materia.findUnique({
      where: { id_materia: id },
    });

    if (!existe) {
      throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    }

    const duplicado = await this.prisma.materia.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        NOT: { id_materia: id },
      },
    });

    if (duplicado) {
      throw new ConflictException('Ya existe una materia con ese nombre');
    }

    return await this.prisma.materia.update({
      where: { id_materia: id },
      data: { nombre, area },
    });
  }

  async deleteMateria(id: number) {
    const existe = await this.prisma.materia.findUnique({
      where: { id_materia: id },
    });

    if (!existe) {
      throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    }

    await this.prisma.materia.delete({ where: { id_materia: id } });
    return { success: true, message: 'Materia eliminada exitosamente' };
  }

  async deleteCargaHoraria(id: number) {
    const existe = await this.prisma.cargaHoraria.findUnique({
      where: { id_carga: id },
    });

    if (!existe) {
      throw new NotFoundException(`Carga horaria con ID ${id} no encontrada`);
    }

    await this.prisma.cargaHoraria.delete({ where: { id_carga: id } });
    return { success: true, message: 'Carga horaria eliminada exitosamente' };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    const knownError = error as PrismaKnownError;
    return knownError?.code === 'P2002';
  }
}
