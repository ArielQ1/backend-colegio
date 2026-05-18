import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from './enrollments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoInscripcion } from '../generated/prisma/enums';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    estudiante: {
      findUnique: jest.fn(),
    },
    curso: {
      findUnique: jest.fn(),
    },
    inscripcion: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    cargaHoraria: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('matricularEstudiante', () => {
    const createEnrollmentDto = {
      id_estudiante: 'uuid-estudiante',
      id_curso: 1,
    };

    it('debería matricular un estudiante exitosamente', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: 'uuid-estudiante',
      });
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: 1,
      });
      mockPrisma.inscripcion.findFirst.mockResolvedValue(null);
      mockPrisma.inscripcion.create.mockResolvedValue({
        id_inscripcion: 1,
        id_estudiante: 'uuid-estudiante',
        id_curso: 1,
        fecha_inscripcion: new Date(),
        estado: EstadoInscripcion.EFECTIVO,
        estudiante: {
          persona: { nombres: 'Pedro', apellidos: 'Gonzalez' },
        },
        curso: {
          id_curso: 1,
          gestion: 2026,
          grado: 'PRIMERO',
          paralelo: 'A',
        },
      });

      const result = await service.matricularEstudiante(createEnrollmentDto);

      expect(result).toHaveProperty('mensaje');
      expect(result.mensaje).toContain('exitosamente');
    });

    it('debería lanzar BadRequestException si faltan datos obligatorios', async () => {
      const dtoInvalido = { id_estudiante: 'uuid-estudiante' };

      await expect(
        service.matricularEstudiante(dtoInvalido as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar NotFoundException si el estudiante no existe', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue(null);

      await expect(
        service.matricularEstudiante(createEnrollmentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar NotFoundException si el curso no existe', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: 'uuid-estudiante',
      });
      mockPrisma.curso.findUnique.mockResolvedValue(null);

      await expect(
        service.matricularEstudiante(createEnrollmentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ConflictException si ya está Inscrito', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: 'uuid-estudiante',
      });
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: 1,
      });
      mockPrisma.inscripcion.findFirst.mockResolvedValue({
        id_inscripcion: 1,
      });

      await expect(
        service.matricularEstudiante(createEnrollmentDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getAllInscripciones', () => {
    const pagination = { page: 1, limit: 20 };

    it('debería obtener todas las inscripciones como ADMIN', async () => {
      mockPrisma.inscripcion.findMany.mockResolvedValue([
        {
          id_inscripcion: 1,
          id_estudiante: 'uuid-estudiante',
          id_curso: 1,
          fecha_inscripcion: new Date(),
          estado: EstadoInscripcion.EFECTIVO,
          estudiante: {
            persona: { nombres: 'Pedro', apellidos: 'Gonzalez', carnet: '123' },
          },
          curso: { id_curso: 1, gestion: 2026, grado: 'PRIMERO', paralelo: 'A' },
        },
      ]);
      mockPrisma.inscripcion.count.mockResolvedValue(1);

      const result = await service.getAllInscripciones(pagination, undefined, undefined, 'ADMIN');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });

    it('debería filtrar inscripciones por curso', async () => {
      mockPrisma.inscripcion.findMany.mockResolvedValue([]);
      mockPrisma.inscripcion.count.mockResolvedValue(0);

      const result = await service.getAllInscripciones(pagination, 1, undefined, 'ADMIN');

      expect(result).toHaveProperty('data');
    });

    it('debería filtrar inscripciones por profesor', async () => {
      mockPrisma.cargaHoraria.findMany.mockResolvedValue([
        { id_curso: 1 },
        { id_curso: 2 },
      ]);
      mockPrisma.inscripcion.findMany.mockResolvedValue([]);
      mockPrisma.inscripcion.count.mockResolvedValue(0);

      const result = await service.getAllInscripciones(pagination, undefined, 'uuid-profesor', 'PROFESOR');

      expect(result).toHaveProperty('data');
    });
  });

  describe('getInscripcionesPorEstudiante', () => {
    const idEstudiante = 'uuid-estudiante';
    const pagination = { page: 1, limit: 20 };

    it('debería obtener las inscripciones de un estudiante', async () => {
      mockPrisma.inscripcion.findMany.mockResolvedValue([
        {
          id_inscripcion: 1,
          id_estudiante: idEstudiante,
          id_curso: 1,
          fecha_inscripcion: new Date(),
          estado: EstadoInscripcion.EFECTIVO,
          estudiante: { persona: { nombres: 'Pedro', carnet: '123' } },
          curso: { id_curso: 1 },
        },
      ]);
      mockPrisma.inscripcion.count.mockResolvedValue(1);

      const result = await service.getInscripcionesPorEstudiante(idEstudiante, pagination);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getInscripcionById', () => {
    it('debería obtener una inscripción por ID', async () => {
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        id_inscripcion: 1,
        id_estudiante: 'uuid-estudiante',
        id_curso: 1,
        fecha_inscripcion: new Date(),
        estado: EstadoInscripcion.EFECTIVO,
        estudiante: {
          persona: { nombres: 'Pedro', apellidos: 'Gonzalez', carnet: '123' },
        },
        curso: { id_curso: 1, gestion: 2026, grado: 'PRIMERO', paralelo: 'A' },
      });

      const result = await service.getInscripcionById(1);

      expect(result).toHaveProperty('id_inscripcion', 1);
    });

    it('debería lanzar NotFoundException si la inscripción no existe', async () => {
      mockPrisma.inscripcion.findUnique.mockResolvedValue(null);

      await expect(service.getInscripcionById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateInscripcion', () => {
    const updateEnrollmentDto = {
      estado: EstadoInscripcion.RETIRADO,
    };

    it('debería actualizar una inscripción exitosamente', async () => {
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        id_inscripcion: 1,
        id_estudiante: 'uuid-estudiante',
        id_curso: 1,
        fecha_inscripcion: new Date(),
        estado: EstadoInscripcion.EFECTIVO,
      });
      mockPrisma.inscripcion.update.mockResolvedValue({
        id_inscripcion: 1,
        estado: EstadoInscripcion.RETIRADO,
      });

      const result = await service.updateInscripcion(1, updateEnrollmentDto);

      expect(result).toHaveProperty('estado', EstadoInscripcion.RETIRADO);
    });

    it('debería lanzar NotFoundException si la inscripción no existe', async () => {
      mockPrisma.inscripcion.findUnique.mockResolvedValue(null);

      await expect(
        service.updateInscripcion(1, updateEnrollmentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar BadRequestException si el estado es inválido', async () => {
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        id_inscripcion: 1,
      });

      await expect(
        service.updateInscripcion(1, { estado: 'INVALIDO' as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteInscripcion', () => {
    it('debería eliminar una inscripción exitosamente', async () => {
      mockPrisma.inscripcion.findUnique.mockResolvedValue({
        id_inscripcion: 1,
      });
      mockPrisma.inscripcion.delete.mockResolvedValue({
        id_inscripcion: 1,
      });

      const result = await service.deleteInscripcion(1);

      expect(result.success).toBe(true);
    });

    it('debería lanzar NotFoundException si la inscripción no existe', async () => {
      mockPrisma.inscripcion.findUnique.mockResolvedValue(null);

      await expect(service.deleteInscripcion(1)).rejects.toThrow(NotFoundException);
    });
  });
});