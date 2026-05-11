import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RolUsuario } from '../generated/prisma/enums';
import { CreateAuthDto } from './dto/create-auth.dto';

type RolUsuarioValue = (typeof RolUsuario)[keyof typeof RolUsuario];
type PrismaKnownError = { code?: string; meta?: { target?: string[] | string } };

const ROLES_VALIDOS: RolUsuarioValue[] = [
  RolUsuario.PROFESOR,
  RolUsuario.PADRE,
];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(data: CreateAuthDto) {
    const carnet = data.carnet?.trim();
    const nombres = data.nombres?.trim();
    const apellidos = data.apellidos?.trim();
    const password = data.password?.trim();
    const username = data.username?.trim() || carnet;

    if (!carnet || !nombres || !apellidos || !password) {
      throw new BadRequestException(
        'nombres, apellidos, carnet y password son obligatorios',
      );
    }

    if (!ROLES_VALIDOS.includes(data.rol)) {
      throw new BadRequestException('Rol inválido. Solo se permiten PROFESOR y PADRE. Contacte al administrador para crear usuarios ADMIN.');
    }

    const personaExistente = await this.prisma.persona.findUnique({
      where: { carnet },
      select: { id_persona: true },
    });

    if (personaExistente) {
      throw new ConflictException('El carnet ya está registrado');
    }

    const usernameExistente = await this.prisma.usuario.findUnique({
      where: { username },
      select: { id_usuario: true },
    });

    if (usernameExistente) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const nuevaPersona = await this.prisma.persona.create({
        data: {
          nombres,
          apellidos,
          carnet,
          correo: data.correo?.trim() || null,
          celular: data.celular?.trim() || null,
          usuario: {
            create: {
              username,
              password_hash: hashedPassword,
              rol: data.rol,
            },
          },
        },
        include: {
          usuario: true,
        },
      });

      return {
        mensaje: 'Usuario registrado exitosamente',
        id_persona: nuevaPersona.id_persona,
        username: nuevaPersona.usuario?.username,
        rol: nuevaPersona.usuario?.rol,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Ya existe un registro con carnet o username');
      }
      throw error;
    }
  }

  async login(username: string, pass: string) {
    const usuarioInput = username?.trim();
    const passwordInput = pass?.trim();

    if (!usuarioInput || !passwordInput) {
      throw new BadRequestException('username y password son obligatorios');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { username: usuarioInput },
      include: { persona: true },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isMatch = await bcrypt.compare(passwordInput, usuario.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload = {
      sub: usuario.id_usuario,
      rol: usuario.rol,
      id_persona: usuario.id_persona,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      nombres: usuario.persona.nombres,
      rol: usuario.rol,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    const knownError = error as PrismaKnownError;
    return knownError?.code === 'P2002';
  }
}