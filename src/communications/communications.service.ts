import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoComunicado } from '../generated/prisma/enums';
import { PaginationDto } from '../common/pagination.dto';

interface FiltrosComunicado {
  tipo?: TipoComunicado;
  leido?: boolean;
  fechaDesde?: Date;
  fechaHasta?: Date;
  id_profesor?: string;
  id_estudiante?: string;
}

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async emitirComunicado(data: {
    id_profesor: string;
    id_estudiante?: string;
    tipo: TipoComunicado;
    descripcion: string;
  }) {
    const profesor = await this.prisma.profesor.findUnique({
      where: { id_persona: data.id_profesor },
    });
    if (!profesor) {
      throw new BadRequestException('Profesor no encontrado');
    }

    const cargas = await this.prisma.cargaHoraria.findMany({
      where: { id_profesor: data.id_profesor },
      select: { id_curso: true },
    });
    const idCursos = [...new Set(cargas.map((c) => c.id_curso))];

    const esGrupo = !data.id_estudiante;

    if (esGrupo) {
      const inscripciones = await this.prisma.inscripcion.findMany({
        where: {
          id_curso: { in: idCursos },
          estado: 'EFECTIVO' as any,
        },
        select: { id_estudiante: true },
      });
      const idsEstudiantes = [...new Set(inscripciones.map((i) => i.id_estudiante))];

      if (idsEstudiantes.length === 0) {
        throw new BadRequestException('No tienes estudiantes asignados');
      }

      const comunicado = await this.prisma.comunicado.create({
        data: {
          id_profesor: data.id_profesor,
          tipo: data.tipo,
          descripcion: data.descripcion,
          es_grupo: true,
        },
        include: {
          profesor: { include: { persona: { select: { nombres: true, apellidos: true } } } },
        },
      });

      return {
        success: true,
        mensaje: `Comunicado general creado para ${idsEstudiantes.length} estudiantes`,
        es_grupo: true,
        total_destinatarios: idsEstudiantes.length,
        data: comunicado,
      };
    } else {
      const estudiante = await this.prisma.estudiante.findUnique({
        where: { id_persona: data.id_estudiante },
      });
      if (!estudiante) {
        throw new BadRequestException('Estudiante no encontrado');
      }

      const inscripcion = await this.prisma.inscripcion.findFirst({
        where: {
          id_estudiante: data.id_estudiante,
          id_curso: { in: idCursos },
          estado: 'EFECTIVO' as any,
        },
      });
      if (!inscripcion) {
        throw new BadRequestException('El estudiante no te pertenece');
      }

      const comunicado = await this.prisma.comunicado.create({
        data: {
          id_profesor: data.id_profesor,
          id_estudiante: data.id_estudiante,
          tipo: data.tipo,
          descripcion: data.descripcion,
          es_grupo: false,
        },
        include: {
          estudiante: { include: { persona: { select: { nombres: true, apellidos: true } } } },
          profesor: { include: { persona: { select: { nombres: true, apellidos: true } } } },
        },
      });

      return {
        success: true,
        mensaje: 'Comunicado emitido al estudiante',
        es_grupo: false,
        data: comunicado,
      };
    }
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

  async getTodosLosComunicados(pagination: PaginationDto, filtros?: FiltrosComunicado) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filtros) {
      if (filtros.tipo) where.tipo = filtros.tipo;
      if (filtros.leido !== undefined) where.leido_por_padre = filtros.leido;
      if (filtros.fechaDesde || filtros.fechaHasta) {
        where.fecha = {};
        if (filtros.fechaDesde) where.fecha.gte = filtros.fechaDesde;
        if (filtros.fechaHasta) where.fecha.lte = filtros.fechaHasta;
      }
      if (filtros.id_profesor) where.id_profesor = filtros.id_profesor;
      if (filtros.id_estudiante) where.id_estudiante = filtros.id_estudiante;
    }

    const [data, total] = await Promise.all([
      this.prisma.comunicado.findMany({
        where,
        skip,
        take: limit,
        include: {
          estudiante: {
            include: {
              persona: { select: { nombres: true, apellidos: true } },
              tutores: {
                include: {
                  padre: { include: { persona: { select: { nombres: true, apellidos: true } } } },
                },
              },
            },
          },
          profesor: { include: { persona: { select: { nombres: true, apellidos: true } } } },
        },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.comunicado.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getResumenComunicados(pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.estudiante.findMany({
        skip,
        take: limit,
        select: {
          id_persona: true,
          persona: { select: { nombres: true, apellidos: true } },
          tutores: {
            include: {
              padre: {
                include: {
                  persona: { select: { nombres: true, apellidos: true } },
                },
              },
            },
          },
          comunicados: {
            select: {
              id_comunicado: true,
              tipo: true,
              es_grupo: true,
              profesor: {
                include: {
                  persona: { select: { nombres: true, apellidos: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.estudiante.count(),
    ]);

    const resumen = data.map((est) => {
      const profesoresMap = new Map<string, { id: string; nombre: string }>();
      est.comunicados.forEach((c) => {
        const key = c.profesor.id_persona;
        if (!profesoresMap.has(key)) {
          profesoresMap.set(key, {
            id: c.profesor.id_persona,
            nombre: `${c.profesor.persona.nombres} ${c.profesor.persona.apellidos}`,
          });
        }
      });

      return {
        id_estudiante: est.id_persona,
        nombre_estudiante: `${est.persona.nombres} ${est.persona.apellidos}`,
        total_comunicados: est.comunicados.length,
        por_tipo: {
          FELICITACION: est.comunicados.filter((c) => c.tipo === 'FELICITACION').length,
          INDISCIPLINA: est.comunicados.filter((c) => c.tipo === 'INDISCIPLINA').length,
          CITACION: est.comunicados.filter((c) => c.tipo === 'CITACION').length,
          MATERIAL_FALTO: est.comunicados.filter((c) => c.tipo === 'MATERIAL_FALTO').length,
          GENERAL: est.comunicados.filter((c) => c.tipo === 'GENERAL').length,
        },
        padres: est.tutores.map((t) => ({
          id_padre: t.padre.id_persona,
          nombre: `${t.padre.persona.nombres} ${t.padre.persona.apellidos}`,
        })),
        profesores: Array.from(profesoresMap.values()),
      };
    });

    return { data: resumen, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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