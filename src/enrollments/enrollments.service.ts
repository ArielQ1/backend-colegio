import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { EstadoInscripcion } from '../generated/prisma/enums';
import { PaginationDto } from '../common/pagination.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async matricularEstudiante(data: CreateEnrollmentDto) {
    const idEstudiante = data.id_estudiante?.trim();
    const idCurso = data.id_curso;

    if (!idEstudiante || !idCurso) {
      throw new BadRequestException(
        'id_estudiante e id_curso son obligatorios',
      );
    }

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: idEstudiante },
      select: { id_persona: true },
    });

    if (!estudiante) {
      throw new NotFoundException('El ID del estudiante no existe');
    }

    const curso = await this.prisma.curso.findUnique({
      where: { id_curso: idCurso },
      select: { id_curso: true },
    });

    if (!curso) {
      throw new NotFoundException('El ID del curso no existe');
    }

    const inscripcionExistente = await this.prisma.inscripcion.findFirst({
      where: {
        id_estudiante: idEstudiante,
        id_curso: idCurso,
      },
      select: { id_inscripcion: true },
    });

    if (inscripcionExistente) {
      throw new ConflictException('El estudiante ya esta inscrito en este curso');
    }

    try {
      const nuevaInscripcion = await this.prisma.inscripcion.create({
        data: {
          id_estudiante: idEstudiante,
          id_curso: idCurso,
        },
        include: {
          estudiante: {
            include: {
              persona: {
                select: { nombres: true, apellidos: true },
              },
            },
          },
          curso: true,
        },
      });

      return {
        mensaje: 'Estudiante matriculado exitosamente',
        inscripcion: nuevaInscripcion,
      };
    } catch {
      throw new BadRequestException(
        'Error al matricular. Verifica que el ID del estudiante y del curso existan',
      );
    }
  }

  async getAllInscripciones(pagination: PaginationDto, idCurso?: number) {
    const where = idCurso ? { id_curso: idCurso } : {};
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.inscripcion.findMany({
        where,
        skip,
        take: limit,
        include: {
          estudiante: {
            include: {
              persona: {
                select: { nombres: true, apellidos: true, carnet: true },
              },
            },
          },
          curso: true,
        },
        orderBy: { fecha_inscripcion: 'desc' },
      }),
      this.prisma.inscripcion.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getInscripcionesPorEstudiante(idEstudiante: string, pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.inscripcion.findMany({
        where: { id_estudiante: idEstudiante },
        skip,
        take: limit,
        include: {
          estudiante: {
            include: {
              persona: { select: { nombres: true, apellidos: true, carnet: true } },
            },
          },
          curso: true,
        },
        orderBy: { fecha_inscripcion: 'desc' },
      }),
      this.prisma.inscripcion.count({ where: { id_estudiante: idEstudiante } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getInscripcionById(id: number) {
    const inscripcion = await this.prisma.inscripcion.findUnique({
      where: { id_inscripcion: id },
      include: {
        estudiante: {
          include: {
            persona: {
              select: { nombres: true, apellidos: true, carnet: true },
            },
          },
        },
        curso: true,
      },
    });

    if (!inscripcion) {
      throw new NotFoundException(`Inscripción con ID ${id} no encontrada`);
    }

    return inscripcion;
  }

  async updateInscripcion(id: number, data: UpdateEnrollmentDto) {
    const existe = await this.prisma.inscripcion.findUnique({
      where: { id_inscripcion: id },
    });

    if (!existe) {
      throw new NotFoundException(`Inscripción con ID ${id} no encontrada`);
    }

    if (data.estado && !Object.values(EstadoInscripcion).includes(data.estado)) {
      throw new BadRequestException('Estado inválido');
    }

    return await this.prisma.inscripcion.update({
      where: { id_inscripcion: id },
      data: { estado: data.estado },
    });
  }

  async deleteInscripcion(id: number) {
    const existe = await this.prisma.inscripcion.findUnique({
      where: { id_inscripcion: id },
    });

    if (!existe) {
      throw new NotFoundException(`Inscripción con ID ${id} no encontrada`);
    }

    await this.prisma.inscripcion.delete({ where: { id_inscripcion: id } });
    return { success: true, message: 'Inscripción eliminada exitosamente' };
  }
}
