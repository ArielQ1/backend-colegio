import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoComunicado } from '../generated/prisma/enums';
import { PaginationDto } from '../common/pagination.dto';

interface FiltrosComunicado {
  tipo?: TipoComunicado;
  leido?: boolean;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async emitirComunicado(data: {
    id_profesor: string;
    id_estudiante: string;
    tipo: TipoComunicado;
    descripcion: string;
  }) {
    const [profesor, estudiante] = await Promise.all([
      this.prisma.profesor.findUnique({ where: { id_persona: data.id_profesor } }),
      this.prisma.estudiante.findUnique({ where: { id_persona: data.id_estudiante } }),
    ]);

    if (!profesor) throw new BadRequestException(`No existe un profesor con id: ${data.id_profesor}`);
    if (!estudiante) throw new BadRequestException(`No existe un estudiante con id: ${data.id_estudiante}`);

    const nuevoComunicado = await this.prisma.comunicado.create({
      data: {
        id_profesor: data.id_profesor,
        id_estudiante: data.id_estudiante,
        tipo: data.tipo,
        descripcion: data.descripcion,
      },
      include: {
        estudiante: { include: { persona: { select: { nombres: true, apellidos: true } } } },
        profesor: { include: { persona: { select: { nombres: true, apellidos: true } } } },
      },
    });

    return {
      success: true,
      mensaje: 'Comunicado emitido exitosamente hacia el perfil del estudiante',
      data: nuevoComunicado,
    };
  }

  async getComunicadosDelPadre(id_padre: string, pagination: PaginationDto, filtros?: FiltrosComunicado) {
    const tutores = await this.prisma.tutorEstudiante.findMany({
      where: { id_padre },
      select: { id_estudiante: true },
    });

    const idsEstudiantes = tutores.map((t) => t.id_estudiante);

    if (idsEstudiantes.length === 0) {
      return { data: [], meta: { total: 0, page: 1, limit: pagination.limit || 20, totalPages: 0 } };
    }

    const where: any = { id_estudiante: { in: idsEstudiantes } };
    if (filtros) {
      if (filtros.tipo) where.tipo = filtros.tipo;
      if (filtros.leido !== undefined) where.leido_por_padre = filtros.leido;
      if (filtros.fechaDesde || filtros.fechaHasta) {
        where.fecha = {};
        if (filtros.fechaDesde) where.fecha.gte = filtros.fechaDesde;
        if (filtros.fechaHasta) where.fecha.lte = filtros.fechaHasta;
      }
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.comunicado.findMany({
        where,
        skip,
        take: limit,
        include: {
          estudiante: { include: { persona: { select: { nombres: true, apellidos: true } } } },
          profesor: { include: { persona: { select: { nombres: true, apellidos: true } } } },
        },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.comunicado.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getComunicadosPorEstudiante(id_estudiante: string, pagination: PaginationDto, filtros?: FiltrosComunicado) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: id_estudiante },
    });

    if (!estudiante) {
      throw new NotFoundException(`Estudiante con ID ${id_estudiante} no encontrado`);
    }

    const where: any = { id_estudiante };
    if (filtros) {
      if (filtros.tipo) where.tipo = filtros.tipo;
      if (filtros.leido !== undefined) where.leido_por_padre = filtros.leido;
      if (filtros.fechaDesde || filtros.fechaHasta) {
        where.fecha = {};
        if (filtros.fechaDesde) where.fecha.gte = filtros.fechaDesde;
        if (filtros.fechaHasta) where.fecha.lte = filtros.fechaHasta;
      }
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.comunicado.findMany({
        where,
        skip,
        take: limit,
        include: {
          estudiante: { include: { persona: { select: { nombres: true, apellidos: true } } } },
          profesor: { include: { persona: { select: { nombres: true, apellidos: true } } } },
        },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.comunicado.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async marcarLeido(id_comunicado: number, id_padre: string) {
    const tutores = await this.prisma.tutorEstudiante.findMany({
      where: { id_padre },
      select: { id_estudiante: true },
    });
    const idsEstudiantes = tutores.map((t) => t.id_estudiante);

    const comunicado = await this.prisma.comunicado.findFirst({
      where: { id_comunicado, id_estudiante: { in: idsEstudiantes } },
    });

    if (!comunicado) throw new BadRequestException('Comunicado no encontrado o no pertenece a sus hijos');

    return this.prisma.comunicado.update({
      where: { id_comunicado },
      data: { leido_por_padre: true },
    });
  }
}
