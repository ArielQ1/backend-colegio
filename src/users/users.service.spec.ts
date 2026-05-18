import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '../generated/prisma/enums';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;
  let accessService: jest.Mocked<AccessService>;

  const mockAccessService = {
    tieneAccesoAEstudiante: jest.fn(),
    tieneAccesoACurso: jest.fn(),
    tieneAccesoACarga: jest.fn(),
    getIdsCursosPorProfesor: jest.fn(),
  };

  const mockPrisma = {
    persona: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    estudiante: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    padreFamilia: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    profesor: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
    tutorEstudiante: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    cargaHoraria: {
      findMany: jest.fn(),
    },
    inscripcion: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccessService, useValue: mockAccessService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
    accessService = module.get(AccessService);

    jest.clearAllMocks();
  });

  describe('createEstudiante', () => {
    const createUserDto = {
      nombres: 'Pedro',
      apellidos: 'Gonzalez',
      carnet: '1234567',
      correo: 'pedro@email.com',
      celular: '70012345',
      codigo_rude: 'RUDE123456',
      fecha_nac: '2015-05-15',
    };

    it('debería crear un estudiante exitosamente', async () => {
      mockPrisma.persona.findUnique.mockResolvedValue(null);
      mockPrisma.estudiante.findUnique.mockResolvedValue(null);
      mockPrisma.persona.create.mockResolvedValue({
        id_persona: 'uuid-estudiante',
        nombres: 'Pedro',
        apellidos: 'Gonzalez',
        carnet: '1234567',
        correo: 'pedro@email.com',
        celular: '70012345',
        estudiante: {
          id_persona: 'uuid-estudiante',
          codigo_rude: 'RUDE123456',
          fecha_nac: new Date('2015-05-15'),
        },
      });

      const result = await service.createEstudiante(createUserDto);

      expect(result).toHaveProperty('mensaje');
      expect(result.mensaje).toContain('exitosamente');
      expect(result.datos).toHaveProperty('estudiante');
    });

    it('debería lanzar BadRequestException si faltan datos obligatorios', async () => {
      const dtoInvalido = { nombres: 'Pedro' };

      await expect(service.createEstudiante(dtoInvalido as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar ConflictException si el carnet ya existe', async () => {
      mockPrisma.persona.findUnique.mockResolvedValue({
        id_persona: 'uuid-existente',
      });

      await expect(service.createEstudiante(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería lanzar ConflictException si el código RUDE ya existe', async () => {
      mockPrisma.persona.findUnique.mockResolvedValue(null);
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: 'uuid-existente',
      });

      await expect(service.createEstudiante(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería lanzar BadRequestException si la fecha de nacimiento es inválida', async () => {
      const dtoFechaInvalida = { ...createUserDto, fecha_nac: 'invalid-date' };

      await expect(service.createEstudiante(dtoFechaInvalida)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createPadre', () => {
    const createPadreDto = {
      nombres: 'Juan',
      apellidos: 'Gonzalez',
      carnet: '9876543',
      password: 'password123',
      username: 'juan123',
      correo: 'juan@email.com',
      celular: '70012345',
      parentesco: 'PADRE',
    };

    it('debería crear un padre de familia exitosamente', async () => {
      mockPrisma.persona.findUnique.mockResolvedValue(null);
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      mockPrisma.persona.create.mockResolvedValue({
        id_persona: 'uuid-padre',
        nombres: 'Juan',
        apellidos: 'Gonzalez',
        carnet: '9876543',
        correo: 'juan@email.com',
        celular: '70012345',
        usuario: {
          username: 'juan123',
          rol: RolUsuario.PADRE,
        },
        padre_familia: {
          id_persona: 'uuid-padre',
          parentesco: 'PADRE',
        },
      });

      const result = await service.createPadre(createPadreDto);

      expect(result).toHaveProperty('mensaje');
      expect(result).toHaveProperty('id_padre');
      expect(result.username).toBe('juan123');
    });

    it('debería lanzar BadRequestException si faltan datos obligatorios', async () => {
      const dtoInvalido = { nombres: 'Juan' };

      await expect(service.createPadre(dtoInvalido as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createProfesor', () => {
    const createProfesorDto = {
      nombres: 'Maria',
      apellidos: 'Lopez',
      carnet: '5555555',
      password: 'password123',
      correo: 'maria@email.com',
      especialidad: 'Matemáticas',
    };

    it('debería crear un profesor exitosamente', async () => {
      mockPrisma.persona.findUnique.mockResolvedValue(null);
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      mockPrisma.persona.create.mockResolvedValue({
        id_persona: 'uuid-profesor',
        nombres: 'Maria',
        apellidos: 'Lopez',
        carnet: '5555555',
        correo: 'maria@email.com',
        usuario: {
          username: '5555555',
          rol: RolUsuario.PROFESOR,
        },
        profesor: {
          id_persona: 'uuid-profesor',
          especialidad: 'Matemáticas',
        },
      });

      const result = await service.createProfesor(createProfesorDto);

      expect(result).toHaveProperty('mensaje');
      expect(result).toHaveProperty('id_profesor');
    });

    it('debería lanzar BadRequestException si falta el carnet', async () => {
      const dtoSinCarnet = { nombres: 'Maria',password: 'password123' };

      await expect(
        service.createProfesor(dtoSinCarnet as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('vincularFamiliar', () => {
    const vincularDto = {
      id_padre: 'uuid-padre',
      id_estudiante: 'uuid-estudiante',
    };

    it('debería vincular un padre con un estudiante exitosamente', async () => {
      mockPrisma.padreFamilia.findUnique.mockResolvedValue({
        id_persona: 'uuid-padre',
      });
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: 'uuid-estudiante',
      });
      mockPrisma.tutorEstudiante.findUnique.mockResolvedValue(null);
      mockPrisma.tutorEstudiante.create.mockResolvedValue({
        id_padre: 'uuid-padre',
        id_estudiante: 'uuid-estudiante',
      });

      const result = await service.vincularFamiliar(vincularDto);

      expect(result).toHaveProperty('mensaje');
      expect(result.mensaje).toContain('correctamente');
    });

    it('debería lanzar NotFoundException si el padre no existe', async () => {
      mockPrisma.padreFamilia.findUnique.mockResolvedValue(null);

      await expect(service.vincularFamiliar(vincularDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar NotFoundException si el estudiante no existe', async () => {
      mockPrisma.padreFamilia.findUnique.mockResolvedValue({
        id_persona: 'uuid-padre',
      });
      mockPrisma.estudiante.findUnique.mockResolvedValue(null);

      await expect(service.vincularFamiliar(vincularDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar ConflictException si ya están vinculados', async () => {
      mockPrisma.padreFamilia.findUnique.mockResolvedValue({
        id_persona: 'uuid-padre',
      });
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: 'uuid-estudiante',
      });
      mockPrisma.tutorEstudiante.findUnique.mockResolvedValue({
        id_padre: 'uuid-padre',
        id_estudiante: 'uuid-estudiante',
      });

      await expect(service.vincularFamiliar(vincularDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getEstudianteById', () => {
    const idEstudiante = 'uuid-estudiante';
    const idProfesor = 'uuid-profesor';

    it('debería obtener un estudiante como ADMIN', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue({
        id_persona: idEstudiante,
        codigo_rude: 'RUDE123456',
        fecha_nac: new Date('2015-05-15'),
        persona: {
          id_persona: idEstudiante,
          nombres: 'Pedro',
          apellidos: 'Gonzalez',
          carnet: '1234567',
        },
        tutores: [],
      });

      const result = await service.getEstudianteById(idEstudiante, undefined, 'ADMIN');

      expect(result).toHaveProperty('id_persona');
      expect(result.persona.nombres).toBe('Pedro');
    });

    it('debería lanzar ForbiddenException si el profesor no tiene acceso', async () => {
      mockPrisma.cargaHoraria.findMany.mockResolvedValue([]);
      mockPrisma.inscripcion.findFirst.mockResolvedValue(null);

      await expect(
        service.getEstudianteById(idEstudiante, idProfesor, 'PROFESOR'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería lanzar NotFoundException si el estudiante no existe', async () => {
      mockPrisma.estudiante.findUnique.mockResolvedValue(null);

      await expect(
        service.getEstudianteById(idEstudiante, undefined, 'ADMIN'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllEstudiantes', () => {
    const pagination = { page: 1, limit: 20 };

    it('debería obtener todos los estudiantes como ADMIN', async () => {
      mockPrisma.estudiante.findMany.mockResolvedValue([
        {
          id_persona: 'uuid-1',
          codigo_rude: 'RUDE001',
          persona: { id_persona: 'uuid-1', nombres: 'Pedro', apellidos: 'Gonzalez', carnet: '123', correo: null, celular: null },
        },
      ]);
      mockPrisma.estudiante.count.mockResolvedValue(1);

      const result = await service.getAllEstudiantes(pagination, undefined, 'ADMIN');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('debería filtrar estudiantes por profesor', async () => {
      mockPrisma.cargaHoraria.findMany.mockResolvedValue([
        { id_curso: 1 },
        { id_curso: 2 },
      ]);
      mockPrisma.estudiante.findMany.mockResolvedValue([]);
      mockPrisma.estudiante.count.mockResolvedValue(0);

      const result = await service.getAllEstudiantes(pagination, 'uuid-profesor', 'PROFESOR');

      expect(result).toHaveProperty('data');
    });
  });

  describe('getMisHijos', () => {
    const idPadre = 'uuid-padre';
    const pagination = { page: 1, limit: 20 };

    it('debería obtener los hijos de un padre', async () => {
      mockPrisma.tutorEstudiante.findMany.mockResolvedValue([
        {
          id_padre: idPadre,
          id_estudiante: 'uuid-estudiante',
          estudiante: {
            id_persona: 'uuid-estudiante',
            codigo_rude: 'RUDE001',
            persona: { id_persona: 'uuid-estudiante', nombres: 'Pedro', apellidos: 'Gonzalez', carnet: '123', correo: null, celular: null },
            inscripciones: [],
          },
        },
      ]);
      mockPrisma.tutorEstudiante.count.mockResolvedValue(1);

      const result = await service.getMisHijos(idPadre, pagination);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
    });
  });
});