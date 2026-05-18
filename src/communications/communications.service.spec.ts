import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationsService } from './communications.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TipoComunicado } from '../generated/prisma/enums';

describe('CommunicationsService', () => {
  let service: CommunicationsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    profesor: {
      findUnique: jest.fn(),
    },
    estudiante: {
      findUnique: jest.fn(),
    },
    comunicado: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    tutorEstudiante: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CommunicationsService>(CommunicationsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('emitirComunicado', () => {
    const comunicadoDto = {
      id_profesor: 'uuid-profesor',
      id_estudiante: 'uuid-estudiante',
      tipo: TipoComunicado.FELICITACION,
      descripcion: 'Excelente desempeño académico',
    };

    it('debería crear un comunicado exitosamente', async () => {
      mockPrisma.profesor.findUnique.mockResolvedValue({
        id_persona: 'uuid-profesor',
      });
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: 'uuid-estudiante',
      });
      mockPrisma.comunicado.create.mockResolvedValue({
        id_comunicado: 1,
        ...comunicadoDto,
        fecha: new Date(),
        leido_por_padre: false,
        estudiante: {
          persona: { nombres: 'Pedro', apellidos: 'Gonzalez' },
        },
        profesor: {
          persona: { nombres: 'Juan', apellidos: 'Perez' },
        },
      });

      const result = await service.emitirComunicado(comunicadoDto);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('mensaje');
    });

    it('debería lanzar BadRequestException si el profesor no existe', async () => {
      mockPrisma.profesor.findUnique.mockResolvedValue(null);

      await expect(service.emitirComunicado(comunicadoDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar BadRequestException si el estudiante no existe', async () => {
      mockPrisma.profesor.findUnique.mockResolvedValue({
        id_persona: 'uuid-profesor',
      });
      mockPrisma.estudiante.findUnique.mockResolvedValue(null);

      await expect(service.emitirComunicado(comunicadoDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getComunicadosDelPadre', () => {
    const idPadre = 'uuid-padre';
    const pagination = { page: 1, limit: 20 };

    it('debería obtener los comunicados de los hijos del padre', async () => {
      mockPrisma.tutorEstudiante.findMany.mockResolvedValue([
        { id_estudiante: 'uuid-estudiante-1' },
        { id_estudiante: 'uuid-estudiante-2' },
      ]);
      mockPrisma.comunicado.findMany.mockResolvedValue([
        {
          id_comunicado: 1,
          id_estudiante: 'uuid-estudiante-1',
          tipo: TipoComunicado.FELICITACION,
          descripcion: 'Buen trabajo',
          fecha: new Date(),
          leido_por_padre: false,
          estudiante: {
            persona: { nombres: 'Pedro', apellidos: 'Gonzalez' },
          },
          profesor: {
            persona: { nombres: 'Juan', apellidos: 'Perez' },
          },
        },
      ]);
      mockPrisma.comunicado.count.mockResolvedValue(1);

      const result = await service.getComunicadosDelPadre(idPadre, pagination);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });

    it('debería retornar array vacío si el padre no tiene hijos vinculados', async () => {
      mockPrisma.tutorEstudiante.findMany.mockResolvedValue([]);

      const result = await service.getComunicadosDelPadre(idPadre, pagination);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('debería filtrar por tipo de comunicado', async () => {
      mockPrisma.tutorEstudiante.findMany.mockResolvedValue([
        { id_estudiante: 'uuid-estudiante-1' },
      ]);
      mockPrisma.comunicado.findMany.mockResolvedValue([]);
      mockPrisma.comunicado.count.mockResolvedValue(0);

      const result = await service.getComunicadosDelPadre(idPadre, pagination, {
        tipo: TipoComunicado.FELICITACION,
      });

      expect(result).toHaveProperty('data');
    });

    it('debería filtrar por estado de lectura', async () => {
      mockPrisma.tutorEstudiante.findMany.mockResolvedValue([
        { id_estudiante: 'uuid-estudiante-1' },
      ]);
      mockPrisma.comunicado.findMany.mockResolvedValue([]);
      mockPrisma.comunicado.count.mockResolvedValue(0);

      const result = await service.getComunicadosDelPadre(idPadre, pagination, {
        leido: true,
      });

      expect(result).toHaveProperty('data');
    });
  });

  describe('getComunicadosPorEstudiante', () => {
    const idEstudiante = 'uuid-estudiante';
    const pagination = { page: 1, limit: 20 };

    it('debería obtener los comunicados de un estudiante', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: idEstudiante,
      });
      mockPrisma.comunicado.findMany.mockResolvedValue([
        {
          id_comunicado: 1,
          id_estudiante: idEstudiante,
          tipo: TipoComunicado.INDISCIPLINA,
          descripcion: 'Falta de respeto',
          fecha: new Date(),
          leido_por_padre: false,
          estudiante: {
            persona: { nombres: 'Pedro', apellidos: 'Gonzalez' },
          },
          profesor: {
            persona: { nombres: 'Juan', apellidos: 'Perez' },
          },
        },
      ]);
      mockPrisma.comunicado.count.mockResolvedValue(1);

      const result = await service.getComunicadosPorEstudiante(idEstudiante, pagination);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });

    it('debería lanzar NotFoundException si el estudiante no existe', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue(null);

      await expect(
        service.getComunicadosPorEstudiante(idEstudiante, pagination),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('marcarLeido', () => {
    const idComunicado = 1;
    const idPadre = 'uuid-padre';

    it('debería marcar un comunicado como leído', async () => {
      mockPrisma.tutorEstudiante.findMany.mockResolvedValue([
        { id_estudiante: 'uuid-estudiante' },
      ]);
      mockPrisma.comunicado.findFirst.mockResolvedValue({
        id_comunicado: idComunicado,
        leido_por_padre: false,
      });
      mockPrisma.comunicado.update.mockResolvedValue({
        id_comunicado: idComunicado,
        leido_por_padre: true,
      });

      const result = await service.marcarLeido(idComunicado, idPadre);

      expect(result).toHaveProperty('leido_por_padre', true);
    });

    it('debería lanzar BadRequestException si el comunicado no pertenece a los hijos del padre', async () => {
      mockPrisma.tutorEstudiante.findMany.mockResolvedValue([
        { id_estudiante: 'uuid-estudiante-1' },
      ]);
      mockPrisma.comunicado.findFirst.mockResolvedValue(null);

      await expect(
        service.marcarLeido(idComunicado, idPadre),
      ).rejects.toThrow(BadRequestException);
    });
  });
});