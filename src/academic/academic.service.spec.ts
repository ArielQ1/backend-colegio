import { Test, TestingModule } from '@nestjs/testing';
import { AcademicService } from './academic.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('AcademicService', () => {
  let service: AcademicService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    curso: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    materia: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    cargaHoraria: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    profesor: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AcademicService>(AcademicService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('createCurso', () => {
    const createCursoDto = {
      gestion: 2026,
      turno: 'MAÑANA',
      grado: 'PRIMERO',
      paralelo: 'A',
      nivel: 'PRIMARIA',
    };

    it('debería crear un curso exitosamente', async () => {
      mockPrisma.curso.findFirst.mockResolvedValue(null);
      mockPrisma.curso.create.mockResolvedValue({
        id_curso: 1,
        ...createCursoDto,
      });

      const result = await service.createCurso(createCursoDto);

      expect(result).toHaveProperty('mensaje');
      expect(result.curso).toHaveProperty('id_curso');
    });

    it('debería lanzar BadRequestException si faltan datos obligatorios', async () => {
      const dtoInvalido = { gestion: 2026 };

      await expect(service.createCurso(dtoInvalido as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar BadRequestException si la gestión está fuera de rango', async () => {
      const dtoGestionInvalida = { ...createCursoDto, gestion: 1999 };

      await expect(service.createCurso(dtoGestionInvalida)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar ConflictException si el curso ya existe', async () => {
      mockPrisma.curso.findFirst.mockResolvedValue({
        id_curso: 1,
        ...createCursoDto,
      });

      await expect(service.createCurso(createCursoDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('createMateria', () => {
    const createMateriaDto = {
      nombre: 'Matemáticas',
      area: 'CIENCIAS',
    };

    it('debería crear una materia exitosamente', async () => {
      mockPrisma.materia.findFirst.mockResolvedValue(null);
      mockPrisma.materia.create.mockResolvedValue({
        id_materia: 1,
        ...createMateriaDto,
      });

      const result = await service.createMateria(createMateriaDto);

      expect(result).toHaveProperty('mensaje');
      expect(result.materia).toHaveProperty('id_materia');
    });

    it('debería lanzar BadRequestException si falta el nombre', async () => {
      const dtoSinNombre = { area: 'CIENCIAS' };

      await expect(service.createMateria(dtoSinNombre as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar ConflictException si la materia ya existe', async () => {
      mockPrisma.materia.findFirst.mockResolvedValue({
        id_materia: 1,
        ...createMateriaDto,
      });

      await expect(service.createMateria(createMateriaDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('createCargaHoraria', () => {
    const createCargaDto = {
      id_profesor: 'uuid-profesor',
      id_materia: 1,
      id_curso: 1,
    };

    it('debería crear una carga horaria exitosamente', async () => {
      mockPrisma.profesor.findUnique.mockResolvedValue({
        id_persona: 'uuid-profesor',
      });
      mockPrisma.materia.findUnique.mockResolvedValue({
        id_materia: 1,
      });
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: 1,
      });
      mockPrisma.cargaHoraria.findFirst.mockResolvedValue(null);
      mockPrisma.cargaHoraria.create.mockResolvedValue({
        id_carga: 1,
        ...createCargaDto,
        profesor: { persona: { nombres: 'Juan', apellidos: 'Perez' } },
        materia: { id_materia: 1, nombre: 'Matemáticas' },
        curso: { id_curso: 1, grado: 'PRIMERO', paralelo: 'A' },
      });

      const result = await service.createCargaHoraria(createCargaDto);

      expect(result).toHaveProperty('mensaje');
      expect(result.carga).toHaveProperty('id_carga');
    });

    it('debería lanzar BadRequestException si faltan datos obligatorios', async () => {
      const dtoInvalido = { id_profesor: 'uuid-profesor' };

      await expect(
        service.createCargaHoraria(dtoInvalido as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar BadRequestException si el profesor no existe', async () => {
      mockPrisma.profesor.findUnique.mockResolvedValue(null);

      await expect(service.createCargaHoraria(createCargaDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar ConflictException si la carga ya existe', async () => {
      mockPrisma.profesor.findUnique.mockResolvedValue({
        id_persona: 'uuid-profesor',
      });
      mockPrisma.materia.findUnique.mockResolvedValue({
        id_materia: 1,
      });
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: 1,
      });
      mockPrisma.cargaHoraria.findFirst.mockResolvedValue({
        id_carga: 1,
      });

      await expect(service.createCargaHoraria(createCargaDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getAllCursos', () => {
    const pagination = { page: 1, limit: 20 };

    it('debería obtener todos los cursos como ADMIN', async () => {
      mockPrisma.curso.findMany.mockResolvedValue([
        { id_curso: 1, gestion: 2026, turno: 'MAÑANA', grado: 'PRIMERO', paralelo: 'A', nivel: 'PRIMARIA' },
      ]);
      mockPrisma.curso.count.mockResolvedValue(1);

      const result = await service.getAllCursos(pagination, undefined, 'ADMIN');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });

    it('debería filtrar cursos por profesor', async () => {
      mockPrisma.cargaHoraria.findMany.mockResolvedValue([
        { id_curso: 1 },
      ]);
      mockPrisma.curso.findMany.mockResolvedValue([]);
      mockPrisma.curso.count.mockResolvedValue(0);

      const result = await service.getAllCursos(pagination, 'uuid-profesor', 'PROFESOR');

      expect(result).toHaveProperty('data');
    });
  });

  describe('getAllMaterias', () => {
    const pagination = { page: 1, limit: 20 };

    it('debería obtener todas las materias', async () => {
      mockPrisma.materia.findMany.mockResolvedValue([
        { id_materia: 1, nombre: 'Matemáticas', area: 'CIENCIAS' },
      ]);
      mockPrisma.materia.count.mockResolvedValue(1);

      const result = await service.getAllMaterias(pagination);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('updateCurso', () => {
    const updateCursoDto = {
      gestion: 2026,
      turno: 'MAÑANA',
      grado: 'SEGUNDO',
      paralelo: 'A',
      nivel: 'PRIMARIA',
    };

    it('debería actualizar un curso exitosamente', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: 1,
        gestion: 2026,
        turno: 'MAÑANA',
        grado: 'PRIMERO',
        paralelo: 'A',
        nivel: 'PRIMARIA',
      });
      mockPrisma.curso.findFirst.mockResolvedValue(null);
      mockPrisma.curso.update.mockResolvedValue({
        id_curso: 1,
        ...updateCursoDto,
      });

      const result = await service.updateCurso(1, updateCursoDto);

      expect(result).toHaveProperty('grado', 'SEGUNDO');
    });

    it('debería lanzar NotFoundException si el curso no existe', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue(null);

      await expect(service.updateCurso(1, updateCursoDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar ConflictException si hay duplicado', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: 1,
      });
      mockPrisma.curso.findFirst.mockResolvedValue({
        id_curso: 2,
      });

      await expect(service.updateCurso(1, updateCursoDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deleteCurso', () => {
    it('debería eliminar un curso exitosamente', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: 1,
      });
      mockPrisma.curso.delete.mockResolvedValue({
        id_curso: 1,
      });

      const result = await service.deleteCurso(1);

      expect(result.success).toBe(true);
    });

    it('debería lanzar NotFoundException si el curso no existe', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue(null);

      await expect(service.deleteCurso(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCursoById', () => {
    it('debería obtener un curso por ID', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue({
        id_curso: 1,
        gestion: 2026,
        turno: 'MAÑANA',
        grado: 'PRIMERO',
        paralelo: 'A',
        nivel: 'PRIMARIA',
      });

      const result = await service.getCursoById(1);

      expect(result).toHaveProperty('id_curso', 1);
    });

    it('debería lanzar NotFoundException si el curso no existe', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue(null);

      await expect(service.getCursoById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMateriaById', () => {
    it('debería obtener una materia por ID', async () => {
      mockPrisma.materia.findUnique.mockResolvedValue({
        id_materia: 1,
        nombre: 'Matemáticas',
        area: 'CIENCIAS',
      });

      const result = await service.getMateriaById(1);

      expect(result).toHaveProperty('id_materia', 1);
    });

    it('debería lanzar NotFoundException si la materia no existe', async () => {
      mockPrisma.materia.findUnique.mockResolvedValue(null);

      await expect(service.getMateriaById(1)).rejects.toThrow(NotFoundException);
    });
  });
});