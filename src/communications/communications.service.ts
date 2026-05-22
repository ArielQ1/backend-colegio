import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoComunicado, AlcanceComunicado } from '../generated/prisma/enums';
import { PaginationDto } from '../common/pagination.dto';

interface FiltrosComunicado {
  tipo?: TipoComunicado;
  leido?: boolean;
  fechaDesde?: Date;
  fechaHasta?: Date;
  id_profesor?: string;
  id_estudiante?: string;
  id_curso?: number;
}

const COMUNICADO_INCLUDE_BASE = {
  profesor: { include: { persona: { select: { nombres: true, apellidos: true } } } },
  autor_admin: { select: { nombres: true, apellidos: true } },
  curso: { select: { grado: true, paralelo: true, gestion: true, nivel: true } },
  estudiante: { include: { persona: { select: { nombres: true, apellidos: true } } } },
};

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===================== CREACIÓN PROFESOR =====================

  async emitirComunicado(data: {
    id_profesor: string;
    id_estudiante?: string;
    id_curso?: number;
    tipo: TipoComunicado;
    descripcion: string;
  }) {
    const profesor = await this.prisma.profesor.findUnique({
      where: { id_persona: data.id_profesor },
    });
    if (!profesor) throw new BadRequestException('Profesor no encontrado');

    const cargas = await this.prisma.cargaHoraria.findMany({
      where: { id_profesor: data.id_profesor },
      select: { id_curso: true },
    });
    const idCursosProfe = [...new Set(cargas.map((c) => c.id_curso))];

    let alcance: 'TODOS' | 'CURSO' | 'INDIVIDUAL';
    let idsEstudiantes: string[];
    let idCurso: number | undefined;
    let idEstudiante: string | undefined;

    if (data.id_estudiante) {
      alcance = 'INDIVIDUAL';
      idEstudiante = data.id_estudiante;
      const estudiante = await this.prisma.estudiante.findUnique({
        where: { id_persona: data.id_estudiante },
      });
      if (!estudiante) throw new BadRequestException('Estudiante no encontrado');
      const inscripcion = await this.prisma.inscripcion.findFirst({
        where: {
          id_estudiante: data.id_estudiante,
          id_curso: { in: idCursosProfe },
          estado: 'EFECTIVO' as any,
        },
      });
      if (!inscripcion) throw new BadRequestException('El estudiante no te pertenece');
      idsEstudiantes = [data.id_estudiante];
    } else if (data.id_curso) {
      alcance = 'CURSO';
      idCurso = data.id_curso;
      if (!idCursosProfe.includes(data.id_curso)) {
        throw new BadRequestException('No tienes asignado ese curso');
      }
      const inscripciones = await this.prisma.inscripcion.findMany({
        where: { id_curso: data.id_curso, estado: 'EFECTIVO' as any },
        select: { id_estudiante: true },
      });
      idsEstudiantes = [...new Set(inscripciones.map((i) => i.id_estudiante))];
      if (idsEstudiantes.length === 0) throw new BadRequestException('No hay estudiantes inscritos en ese curso');
    } else {
      alcance = 'TODOS';
      const inscripciones = await this.prisma.inscripcion.findMany({
        where: { id_curso: { in: idCursosProfe }, estado: 'EFECTIVO' as any },
        select: { id_estudiante: true },
      });
      idsEstudiantes = [...new Set(inscripciones.map((i) => i.id_estudiante))];
      if (idsEstudiantes.length === 0) throw new BadRequestException('No tienes estudiantes asignados');
    }

    const [comunicado] = await this.prisma.$transaction([
      this.prisma.comunicado.create({
        data: {
          id_profesor: data.id_profesor,
          id_estudiante: idEstudiante,
          id_curso: idCurso,
          alcance,
          tipo: data.tipo,
          descripcion: data.descripcion,
          lecturas: {
            create: idsEstudiantes.map((idEst) => ({ id_estudiante: idEst })),
          },
        },
        include: COMUNICADO_INCLUDE_BASE,
      }),
    ]);

    return {
      success: true,
      mensaje: 'Comunicado creado exitosamente',
      alcance,
      total_destinatarios: idsEstudiantes.length,
      data: comunicado,
    };
  }

  // ===================== CREACIÓN ADMIN =====================

  async emitirComunicadoAdmin(data: {
    id_admin: string;
    id_estudiante?: string;
    id_curso?: number;
    tipo: TipoComunicado;
    descripcion: string;
  }) {
    let alcance: 'TODOS' | 'CURSO' | 'INDIVIDUAL';
    let idsEstudiantes: string[];
    let idCurso: number | undefined;
    let idEstudiante: string | undefined;

    if (data.id_estudiante) {
      alcance = 'INDIVIDUAL';
      idEstudiante = data.id_estudiante;
      const estudiante = await this.prisma.estudiante.findUnique({
        where: { id_persona: data.id_estudiante },
      });
      if (!estudiante) throw new BadRequestException('Estudiante no encontrado');
      idsEstudiantes = [data.id_estudiante];
    } else if (data.id_curso) {
      alcance = 'CURSO';
      idCurso = data.id_curso;
      const curso = await this.prisma.curso.findUnique({
        where: { id_curso: data.id_curso },
      });
      if (!curso) throw new BadRequestException('Curso no encontrado');
      const inscripciones = await this.prisma.inscripcion.findMany({
        where: { id_curso: data.id_curso, estado: 'EFECTIVO' as any },
        select: { id_estudiante: true },
      });
      idsEstudiantes = [...new Set(inscripciones.map((i) => i.id_estudiante))];
      if (idsEstudiantes.length === 0) throw new BadRequestException('No hay estudiantes inscritos en ese curso');
    } else {
      alcance = 'TODOS';
      const inscripciones = await this.prisma.inscripcion.findMany({
        where: { estado: 'EFECTIVO' as any },
        select: { id_estudiante: true },
      });
      idsEstudiantes = [...new Set(inscripciones.map((i) => i.id_estudiante))];
      if (idsEstudiantes.length === 0) throw new BadRequestException('No hay estudiantes matriculados');
    }

    const [comunicado] = await this.prisma.$transaction([
      this.prisma.comunicado.create({
        data: {
          id_autor_admin: data.id_admin,
          id_estudiante: idEstudiante,
          id_curso: idCurso,
          alcance,
          tipo: data.tipo,
          descripcion: data.descripcion,
          lecturas: {
            create: idsEstudiantes.map((idEst) => ({ id_estudiante: idEst })),
          },
        },
        include: COMUNICADO_INCLUDE_BASE,
      }),
    ]);

    return {
      success: true,
      mensaje: 'Comunicado creado exitosamente',
      alcance,
      total_destinatarios: idsEstudiantes.length,
      data: comunicado,
    };
  }

  // ===================== PADRE: MIS COMUNICADOS =====================

  async getComunicadosDelPadre(id_padre: string, pagination: PaginationDto, filtros?: FiltrosComunicado) {
    const tutores = await this.prisma.tutorEstudiante.findMany({
      where: { id_padre },
      select: { id_estudiante: true },
    });
    const idsEstudiantes = tutores.map((t) => t.id_estudiante);

    if (idsEstudiantes.length === 0) {
      return { data: [], meta: { total: 0, page: 1, limit: pagination.limit || 20, totalPages: 0 } };
    }

    const whereLectura: any = { id_estudiante: { in: idsEstudiantes } };
    if (filtros) {
      if (filtros.leido !== undefined) whereLectura.leido_por_padre = filtros.leido;
    }

    const whereComunicado: any = { lecturas: { some: { id_estudiante: { in: idsEstudiantes } } } };
    if (filtros) {
      if (filtros.tipo) whereComunicado.tipo = filtros.tipo;
      if (filtros.fechaDesde || filtros.fechaHasta) {
        whereComunicado.fecha = {};
        if (filtros.fechaDesde) whereComunicado.fecha.gte = filtros.fechaDesde;
        if (filtros.fechaHasta) whereComunicado.fecha.lte = filtros.fechaHasta;
      }
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [comunicados, total] = await Promise.all([
      this.prisma.comunicado.findMany({
        where: whereComunicado,
        skip,
        take: limit,
        include: {
          ...COMUNICADO_INCLUDE_BASE,
          lecturas: {
            where: { id_estudiante: { in: idsEstudiantes } },
            select: { id_estudiante: true, leido_por_padre: true },
          },
        },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.comunicado.count({ where: whereComunicado }),
    ]);

    const data = comunicados.map((c) => {
      const lecturaHijo = c.lecturas[0];
      return {
        id_comunicado: c.id_comunicado,
        alcance: c.alcance,
        tipo: c.tipo,
        descripcion: c.descripcion,
        fecha: c.fecha,
        leido_por_padre: lecturaHijo?.leido_por_padre ?? false,
        profesor: c.profesor,
        autor_admin: c.autor_admin,
        curso: c.curso,
        estudiante: c.estudiante,
      };
    });

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ===================== POR ESTUDIANTE =====================

  async getComunicadosPorEstudiante(id_estudiante: string, pagination: PaginationDto, filtros?: FiltrosComunicado) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: id_estudiante },
    });
    if (!estudiante) {
      throw new NotFoundException(`Estudiante con ID ${id_estudiante} no encontrado`);
    }

    const whereComunicado: any = { lecturas: { some: { id_estudiante } } };
    if (filtros) {
      if (filtros.tipo) whereComunicado.tipo = filtros.tipo;
      if (filtros.fechaDesde || filtros.fechaHasta) {
        whereComunicado.fecha = {};
        if (filtros.fechaDesde) whereComunicado.fecha.gte = filtros.fechaDesde;
        if (filtros.fechaHasta) whereComunicado.fecha.lte = filtros.fechaHasta;
      }
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [comunicados, total] = await Promise.all([
      this.prisma.comunicado.findMany({
        where: whereComunicado,
        skip,
        take: limit,
        include: {
          ...COMUNICADO_INCLUDE_BASE,
          lecturas: {
            where: { id_estudiante },
            select: { leido_por_padre: true },
          },
        },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.comunicado.count({ where: whereComunicado }),
    ]);

    const data = comunicados.map((c) => ({
      id_comunicado: c.id_comunicado,
      alcance: c.alcance,
      tipo: c.tipo,
      descripcion: c.descripcion,
      fecha: c.fecha,
      leido_por_padre: c.lecturas[0]?.leido_por_padre ?? false,
      profesor: c.profesor,
      autor_admin: c.autor_admin,
      curso: c.curso,
      estudiante: c.estudiante,
    }));

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ===================== ADMIN: TODOS LOS COMUNICADOS =====================

  async getTodosLosComunicados(pagination: PaginationDto, filtros?: FiltrosComunicado) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filtros) {
      if (filtros.tipo) where.tipo = filtros.tipo;
      if (filtros.fechaDesde || filtros.fechaHasta) {
        where.fecha = {};
        if (filtros.fechaDesde) where.fecha.gte = filtros.fechaDesde;
        if (filtros.fechaHasta) where.fecha.lte = filtros.fechaHasta;
      }
      if (filtros.id_profesor) where.id_profesor = filtros.id_profesor;
      if (filtros.id_curso) where.id_curso = filtros.id_curso;
    }

    const [comunicados, total] = await Promise.all([
      this.prisma.comunicado.findMany({
        where,
        skip,
        take: limit,
        include: {
          ...COMUNICADO_INCLUDE_BASE,
          lecturas: {
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
            },
          },
        },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.comunicado.count({ where }),
    ]);

    const data = comunicados.map((c) => ({
      id_comunicado: c.id_comunicado,
      alcance: c.alcance,
      tipo: c.tipo,
      descripcion: c.descripcion,
      fecha: c.fecha,
      profesor: c.profesor,
      autor_admin: c.autor_admin,
      curso: c.curso,
      estudiante: c.estudiante,
      total_destinatarios: c.lecturas.length,
      destinatarios: c.lecturas.map((l) => ({
        id_estudiante: l.estudiante.id_persona,
        nombre: `${l.estudiante.persona.nombres} ${l.estudiante.persona.apellidos}`,
        leido_por_padre: l.leido_por_padre,
        padres: l.estudiante.tutores.map((t) => ({
          id_padre: t.padre.id_persona,
          nombre: `${t.padre.persona.nombres} ${t.padre.persona.apellidos}`,
        })),
      })),
    }));

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ===================== ADMIN: RESUMEN =====================

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
          lecturas: {
            select: {
              leido_por_padre: true,
              comunicado: {
                select: {
                  id_comunicado: true,
                  tipo: true,
                  alcance: true,
                  profesor: {
                    include: {
                      persona: { select: { nombres: true, apellidos: true } },
                    },
                  },
                  autor_admin: { select: { nombres: true, apellidos: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.estudiante.count(),
    ]);

    const resumen = data.map((est) => {
      const autoresMap = new Map<string, { id: string; nombre: string; tipo: string }>();
      const comunicados = est.lecturas.map((l) => l.comunicado);

      comunicados.forEach((c) => {
        if (c.profesor) {
          const key = `profe_${c.profesor.id_persona}`;
          if (!autoresMap.has(key)) {
            autoresMap.set(key, {
              id: c.profesor.id_persona,
              nombre: `${c.profesor.persona.nombres} ${c.profesor.persona.apellidos}`,
              tipo: 'profesor',
            });
          }
        } else if (c.autor_admin) {
          const key = `admin_${c.autor_admin.nombres}_${c.autor_admin.apellidos}`;
          if (!autoresMap.has(key)) {
            autoresMap.set(key, {
              id: key,
              nombre: `${c.autor_admin.nombres} ${c.autor_admin.apellidos}`,
              tipo: 'admin',
            });
          }
        }
      });

      return {
        id_estudiante: est.id_persona,
        nombre_estudiante: `${est.persona.nombres} ${est.persona.apellidos}`,
        total_comunicados: comunicados.length,
        no_leidos: est.lecturas.filter((l) => !l.leido_por_padre).length,
        por_tipo: {
          FELICITACION: comunicados.filter((c) => c.tipo === 'FELICITACION').length,
          INDISCIPLINA: comunicados.filter((c) => c.tipo === 'INDISCIPLINA').length,
          CITACION: comunicados.filter((c) => c.tipo === 'CITACION').length,
          MATERIAL_FALTO: comunicados.filter((c) => c.tipo === 'MATERIAL_FALTO').length,
          GENERAL: comunicados.filter((c) => c.tipo === 'GENERAL').length,
        },
        padres: est.tutores.map((t) => ({
          id_padre: t.padre.id_persona,
          nombre: `${t.padre.persona.nombres} ${t.padre.persona.apellidos}`,
        })),
        autores: Array.from(autoresMap.values()),
      };
    });

    return { data: resumen, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ===================== MARCAR LEÍDO =====================

  async marcarLeido(id_comunicado: number, id_padre: string) {
    const tutores = await this.prisma.tutorEstudiante.findMany({
      where: { id_padre },
      select: { id_estudiante: true },
    });
    const idsEstudiantes = tutores.map((t) => t.id_estudiante);

    const lectura = await this.prisma.comunicadoLectura.findFirst({
      where: {
        id_comunicado,
        id_estudiante: { in: idsEstudiantes },
      },
    });

    if (!lectura) {
      throw new BadRequestException('Comunicado no encontrado o no pertenece a sus hijos');
    }

    return this.prisma.comunicadoLectura.update({
      where: {
        id_comunicado_id_estudiante: {
          id_comunicado: lectura.id_comunicado,
          id_estudiante: lectura.id_estudiante,
        },
      },
      data: { leido_por_padre: true, fecha_lectura: new Date() },
    });
  }
}