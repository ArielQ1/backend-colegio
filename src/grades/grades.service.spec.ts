import { Test, TestingModule } from '@nestjs/testing';
import { GradesService } from './grades.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { RolUsuario } from '../generated/prisma/enums';

describe('GradesService', () => {
  let service: GradesService;
  let prisma: jest.Mocked<PrismaService>;

  const mockAccessService = {
    tieneAccesoAEstudiante: jest.fn().mockResolvedValue(true),
    tieneAccesoACurso: jest.fn().mockResolvedValue(true),
    tieneAccesoACarga: jest.fn().mockResolvedValue(true),
    getIdsCursosPorProfesor: jest.fn().mockResolvedValue([1, 2]),
  };

  const mockPrisma = {
    estudiante: {
      findUnique: jest.fn(),
    },
    curso: {
      findUnique: jest.fn(),
    },
    cargaHoraria: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    calificacion: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccessService, useValue: mockAccessService },
      ],
    }).compile();

    service = module.get<GradesService>(GradesService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('getNotasPorEstudiante', () => {
    const idEstudiante = 'uuid-estudiante';
    const pagination = { page: 1, limit: 20 };

    it('debería obtener las notas de un estudiante como ADMIN', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: idEstudiante,
      });
      mockPrisma.calificacion.findMany.mockResolvedValue([
        {
          id_calificacion: 1,
          id_inscripcion: 1,
          id_carga: 1,
          trimestre: 1,
          nota_ser: 20,
          nota_saber: 25,
          nota_hacer: 20,
          nota_decidir: 10,
          autoevaluacion: 5,
          nota_final_trimestre: 80,
          carga: {
            materia: { id_materia: 1, nombre: 'Matemáticas' },
            curso: { id_curso: 1, grado: 'PRIMERO', paralelo: 'A', nivel: 'PRIMARIA' },
          },
        },
      ]);
      mockPrisma.calificacion.count.mockResolvedValue(1);

      const result = await service.getNotasPorEstudiante(idEstudiante, pagination, undefined, 'ADMIN');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });

    it('debería lanzar NotFoundException si el estudiante no existe', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue(null);

      await expect(
        service.getNotasPorEstudiante(idEstudiante, pagination, undefined, 'ADMIN'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getNotasPorCurso', () => {
    const idCurso = 1;
    const pagination = { page: 1, limit: 20 };

    it('debería obtener las notas de un curso como ADMIN', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: idCurso,
      });
      mockPrisma.calificacion.findMany.mockResolvedValue([
        {
          id_calificacion: 1,
          trimestre: 1,
          nota_ser: 20,
          nota_saber: 25,
          inscripcion: {
            estudiante: {
              persona: { nombres: 'Pedro', apellidos: 'Gonzalez', carnet: '123' },
            },
          },
          carga: {
            materia: { nombre: 'Matemáticas' },
          },
        },
      ]);
      mockPrisma.calificacion.count.mockResolvedValue(1);

      const result = await service.getNotasPorCurso(idCurso, pagination, undefined, undefined, 'ADMIN');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });

    it('debería filtrar por trimestre', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: idCurso,
      });
      mockPrisma.calificacion.findMany.mockResolvedValue([]);
      mockPrisma.calificacion.count.mockResolvedValue(0);

      const result = await service.getNotasPorCurso(idCurso, pagination, 1, undefined, 'ADMIN');

      expect(result).toHaveProperty('data');
    });

    it('debería lanzar NotFoundException si el curso no existe', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue(null);

      await expect(
        service.getNotasPorCurso(idCurso, pagination, undefined, undefined, 'ADMIN'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getNotasPorCarga', () => {
    const idCarga = 1;
    const pagination = { page: 1, limit: 20 };

    it('debería obtener las notas de una carga horaria', async () => {
      mockPrisma.cargaHoraria.findUnique.mockResolvedValue({
        id_carga: idCarga,
        id_profesor: 'uuid-profesor',
        materia: { nombre: 'Matemáticas' },
        curso: { grado: 'PRIMERO', paralelo: 'A' },
      });
      mockPrisma.calificacion.findMany.mockResolvedValue([
        {
          id_calificacion: 1,
          trimestre: 1,
          nota_ser: 20,
          inscripcion: {
            estudiante: {
              persona: { nombres: 'Pedro', apellidos: 'Gonzalez', carnet: '123' },
            },
          },
        },
      ]);
      mockPrisma.calificacion.count.mockResolvedValue(1);

      const result = await service.getNotasPorCarga(idCarga, pagination, undefined, undefined, 'ADMIN');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
      expect(result.info).toHaveProperty('materia', 'Matemáticas');
    });

    it('debería lanzar NotFoundException si la carga no existe', async () => {
      mockPrisma.cargaHoraria.findUnique.mockResolvedValue(null);

      await expect(
        service.getNotasPorCarga(idCarga, pagination, undefined, undefined, 'ADMIN'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});