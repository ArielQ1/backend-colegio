import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async tieneAccesoAEstudiante(idProfesor: string, idEstudiante: string): Promise<boolean> {
    const gestionActual = new Date().getFullYear();

    const cargasProfesor = await this.prisma.cargaHoraria.findMany({
      where: {
        id_profesor: idProfesor,
        curso: { gestion: gestionActual },
      },
      select: { id_curso: true },
    });

    const idsCursos = cargasProfesor.map((c) => c.id_curso);
    if (idsCursos.length === 0) return false;

    const inscripcion = await this.prisma.inscripcion.findFirst({
      where: {
        id_estudiante: idEstudiante,
        id_curso: { in: idsCursos },
        estado: 'EFECTIVO',
      },
    });

    return !!inscripcion;
  }

  async tieneAccesoACurso(idProfesor: string, idCurso: number): Promise<boolean> {
    const gestionActual = new Date().getFullYear();

    const carga = await this.prisma.cargaHoraria.findFirst({
      where: {
        id_profesor: idProfesor,
        id_curso: idCurso,
        curso: { gestion: gestionActual },
      },
    });

    return !!carga;
  }

  async tieneAccesoACarga(idProfesor: string, idCarga: number): Promise<boolean> {
    const carga = await this.prisma.cargaHoraria.findUnique({
      where: { id_carga: idCarga },
      select: { id_profesor: true },
    });

    if (!carga) return false;
    return carga.id_profesor === idProfesor;
  }

  async getIdsCursosPorProfesor(idProfesor: string, gestion?: number): Promise<number[]> {
    const gestionActual = gestion || new Date().getFullYear();

    const cargas = await this.prisma.cargaHoraria.findMany({
      where: {
        id_profesor: idProfesor,
        curso: { gestion: gestionActual },
      },
      select: { id_curso: true },
    });

    return cargas.map((c) => c.id_curso);
  }
}