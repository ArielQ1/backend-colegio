import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { RolUsuario } from '../generated/prisma/enums';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const bcryptCompareMock = bcrypt.compare as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockPrisma = {
    persona: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
    bcryptCompareMock.mockResolvedValue(true);
  });

  describe('registerUser', () => {
    const createAuthDto = {
      nombres: 'Juan',
      apellidos: 'Perez',
      carnet: '1234567',
      password: 'password123',
      rol: 'PROFESOR' as const,
      correo: 'juan@email.com',
      celular: '70012345',
    };

    it('debería registrar un usuario exitosamente', async () => {
      mockPrisma.persona.findUnique.mockResolvedValue(null);
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      mockPrisma.persona.create.mockResolvedValue({
        id_persona: 'uuid-1',
        nombres: 'Juan',
        apellidos: 'Perez',
        carnet: '1234567',
        correo: 'juan@email.com',
        celular: '70012345',
        usuario: {
          id_usuario: 'uuid-usuario',
          username: '1234567',
          rol: RolUsuario.PROFESOR,
          password_hash: 'hashed',
          activo: true,
          id_persona: 'uuid-1',
        },
      });

      const result = await service.registerUser(createAuthDto);

      expect(result).toHaveProperty('mensaje');
      expect(result).toHaveProperty('id_persona');
      expect(result).toHaveProperty('username');
      expect(result.rol).toBe(RolUsuario.PROFESOR);
    });

    it('debería lanzar BadRequestException si faltan datos obligatorios', async () => {
      const dtoInvalido = { nombres: 'Juan' };

      await expect(service.registerUser(dtoInvalido as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar BadRequestException si el rol es inválido', async () => {
      const dtoRolInvalido = {
        ...createAuthDto,
        rol: 'ADMIN' as any,
      };

      await expect(service.registerUser(dtoRolInvalido)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar ConflictException si el carnet ya existe', async () => {
      mockPrisma.persona.findUnique.mockResolvedValue({
        id_persona: 'uuid-existente',
      });

      await expect(service.registerUser(createAuthDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería lanzar ConflictException si el username ya existe', async () => {
      mockPrisma.persona.findUnique.mockResolvedValue(null);
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-usuario',
      });

      await expect(service.registerUser(createAuthDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('debería iniciar sesión exitosamente', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-usuario',
        id_persona: 'uuid-persona',
        username: 'juan123',
        password_hash: 'hashed_password',
        rol: RolUsuario.PROFESOR,
        activo: true,
        persona: {
          id_persona: 'uuid-persona',
          nombres: 'Juan',
          apellidos: 'Perez',
          carnet: '1234567',
          correo: 'juan@email.com',
          celular: '70012345',
        },
      });

      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login('juan123', 'password123');

      expect(result).toHaveProperty('access_token');
      expect(result.nombres).toBe('Juan');
      expect(result.rol).toBe(RolUsuario.PROFESOR);
    });

    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.login('juan123', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería lanzar UnauthorizedException si el usuario está inactivo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-usuario',
        id_persona: 'uuid-persona',
        username: 'juan123',
        password_hash: 'hashed_password',
        rol: RolUsuario.PROFESOR,
        activo: false,
        persona: {} as any,
      });

      await expect(service.login('juan123', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debería lanzar BadRequestException si faltan credenciales', async () => {
      await expect(service.login('', '')).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-usuario',
        id_persona: 'uuid-persona',
        username: 'juan123',
        password_hash: 'hashed_password',
        rol: RolUsuario.PROFESOR,
        activo: true,
        persona: {} as any,
      });

      bcryptCompareMock.mockResolvedValueOnce(false);

      await expect(service.login('juan123', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});