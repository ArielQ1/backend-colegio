import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { RolUsuario } from '../generated/prisma/enums';
import { CreatePadreDto } from './dto/create-padre.dto';
import { VincularFamiliarDto } from './dto/vincular-familiar.dto';
import { CreateProfesorDto } from './dto/create-profesor.dto';
import { PaginationDto } from '../common/pagination.dto';

type PrismaKnownError = { code?: string; meta?: { target?: string[] | string } };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
  ) {}

  async createEstudiante(data: CreateUserDto) {
    const nombres = data.nombres?.trim();
    const apellidos = data.apellidos?.trim();
    const carnet = data.carnet?.trim();
    const correo = data.correo?.trim() || null;
    const celular = data.celular?.trim() || null;
    const codigoRude = data.codigo_rude?.trim() || null;

    if (!nombres || !apellidos || !carnet) {
      throw new BadRequestException(
        'nombres, apellidos y carnet son obligatorios',
      );
    }

    const fechaNac = this.parseFechaNacimiento(data.fecha_nac);

    const existePersona = await this.prisma.persona.findUnique({
      where: { carnet },
      select: { id_persona: true },
    });

    if (existePersona) {
      throw new ConflictException(
        'Ya existe una persona registrada con este carnet',
      );
    }

    if (codigoRude) {
      const existeRude = await this.prisma.estudiante.findUnique({
        where: { codigo_rude: codigoRude },
        select: { id_persona: true },
      });

      if (existeRude) {
        throw new ConflictException('El codigo RUDE ya está registrado');
      }
    }

    try {
      const nuevoEstudiante = await this.prisma.persona.create({
        data: {
          nombres,
          apellidos,
          carnet,
          correo,
          celular,
          estudiante: {
            create: {
              codigo_rude: codigoRude,
              fecha_nac: fechaNac,
            },
          },
        },
        include: {
          estudiante: true,
        },
      });

      return {
        mensaje: 'Estudiante registrado exitosamente (Sin credenciales de acceso)',
        datos: nuevoEstudiante,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'El carnet o codigo RUDE ya existe en el sistema',
        );
      }
      throw error;
    }
  }

  private parseFechaNacimiento(fecha_nac?: string): Date | null {
    if (!fecha_nac?.trim()) {
      return null;
    }

    const date = new Date(fecha_nac);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        'fecha_nac debe tener formato de fecha valido (YYYY-MM-DD)',
      );
    }

    return date;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    const knownError = error as PrismaKnownError;
    return knownError?.code === 'P2002';
  }

  async createPadre(data: CreatePadreDto) {
    const nombres = data.nombres?.trim();
    const apellidos = data.apellidos?.trim();
    const carnet = data.carnet?.trim();
    const password = data.password?.trim();
    const username = data.username?.trim() || carnet;
    const correo = data.correo?.trim() || null;
    const celular = data.celular?.trim() || null;
    const parentesco = data.parentesco?.trim() || null;

    if (!nombres || !apellidos || !carnet || !password) {
      throw new BadRequestException(
        'nombres, apellidos, carnet y password son obligatorios',
      );
    }

    const existePersona = await this.prisma.persona.findUnique({
      where: { carnet },
      select: { id_persona: true },
    });

    if (existePersona) {
      throw new ConflictException('Este carnet ya está registrado');
    }

    const existeUsername = await this.prisma.usuario.findUnique({
      where: { username },
      select: { id_usuario: true },
    });

    if (existeUsername) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const nuevoPadre = await this.prisma.persona.create({
        data: {
          nombres,
          apellidos,
          carnet,
          correo,
          celular,
          usuario: {
            create: {
              username,
              password_hash: hashedPassword,
              rol: RolUsuario.PADRE,
            },
          },
          padre_familia: {
            create: {
              parentesco,
            },
          },
        },
        include: {
          usuario: { select: { username: true, rol: true } },
          padre_familia: true,
        },
      });

      return {
        mensaje: 'Padre de familia registrado exitosamente',
        id_padre: nuevoPadre.id_persona,
        username: nuevoPadre.usuario?.username,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'El carnet o username ya existe en el sistema',
        );
      }
      throw error;
    }
  }

  async createProfesor(data: CreateProfesorDto) {
    const nombres = data.nombres?.trim();
    const apellidos = data.apellidos?.trim();
    const carnet = data.carnet?.trim();
    const password = data.password?.trim();
    const username = data.username?.trim() || carnet;
    const correo = data.correo?.trim() || null;
    const celular = data.celular?.trim() || null;
    const especialidad = data.especialidad?.trim() || null;

    if (!carnet) {
      throw new BadRequestException('carnet es obligatorio');
    }

    const existePersona = await this.prisma.persona.findUnique({
      where: { carnet },
      include: {
        usuario: {
          select: {
            username: true,
            rol: true,
          },
        },
        profesor: {
          select: {
            id_persona: true,
          },
        },
      },
    });

    if (existePersona) {
      if (existePersona.profesor) {
        throw new ConflictException('Este carnet ya está registrado como profesor');
      }

      if (!existePersona.usuario) {
        throw new ConflictException(
          'La persona ya existe, pero no tiene usuario para rol profesor',
        );
      }

      if (existePersona.usuario.rol !== RolUsuario.PROFESOR) {
        throw new ConflictException(
          'Este carnet ya pertenece a un usuario con otro rol',
        );
      }

      const perfilProfesor = await this.prisma.profesor.create({
        data: {
          id_persona: existePersona.id_persona,
          especialidad,
        },
      });


      return {
        mensaje: 'Perfil de profesor completado exitosamente',
        id_profesor: perfilProfesor.id_persona,
        username: existePersona.usuario.username,
      };
    }

    if (!nombres || !apellidos || !password) {
      throw new BadRequestException(
        'nombres, apellidos y password son obligatorios para registrar un profesor nuevo',
      );
    }

    const existeUsername = await this.prisma.usuario.findUnique({
      where: { username },
      select: { id_usuario: true },
    });

    if (existeUsername) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const nuevoProfesor = await this.prisma.persona.create({
        data: {
          nombres,
          apellidos,
          carnet,
          correo,
          celular,
          usuario: {
            create: {
              username,
              password_hash: hashedPassword,
              rol: RolUsuario.PROFESOR,
            },
          },
          profesor: {
            create: {
              especialidad,
            },
          },
        },
        include: {
          usuario: { select: { username: true, rol: true } },
          profesor: true,
        },
      });

      return {
        mensaje: 'Profesor registrado exitosamente y listo para asignar cargas',
        id_profesor: nuevoProfesor.id_persona,
        username: nuevoProfesor.usuario?.username,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'El carnet o username ya existe en el sistema',
        );
      }
      throw error;
    }
  }

  async vincularFamiliar(data: VincularFamiliarDto) {
    const idPadre = data.id_padre?.trim();
    const idEstudiante = data.id_estudiante?.trim();

    if (!idPadre || !idEstudiante) {
      throw new BadRequestException(
        'id_padre e id_estudiante son obligatorios',
      );
    }

    const padre = await this.prisma.padreFamilia.findUnique({
      where: { id_persona: idPadre },
      select: { id_persona: true },
    });

    if (!padre) {
      throw new NotFoundException(
        'No existe un padre de familia con ese ID',
      );
    }

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: idEstudiante },
      select: { id_persona: true },
    });

    if (!estudiante) {
      throw new NotFoundException('No existe un estudiante con ese ID');
    }

    const vinculoExistente = await this.prisma.tutorEstudiante.findUnique({
      where: {
        id_padre_id_estudiante: {
          id_padre: idPadre,
          id_estudiante: idEstudiante,
        },
      },
    });

    if (vinculoExistente) {
      throw new ConflictException(
        'Este padre y estudiante ya están vinculados',
      );
    }

    try {
      const vinculo = await this.prisma.tutorEstudiante.create({
        data: {
          id_padre: idPadre,
          id_estudiante: idEstudiante,
        },
      });

      return {
        mensaje: 'Estudiante y Padre vinculados correctamente',
        vinculo,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Este padre y estudiante ya están vinculados',
        );
      }
      throw new BadRequestException(
        'No se pudo crear el vínculo. Verifica que ambos IDs sean válidos',
      );
    }
  }

  private async getEstudiantesPorProfesor(idProfesor: string, pagination: PaginationDto) {
    const gestionActual = new Date().getFullYear();
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const cargas = await this.prisma.cargaHoraria.findMany({
      where: {
        id_profesor: idProfesor,
        curso: { gestion: gestionActual },
      },
      select: { id_curso: true },
    });

    const idsCursos = cargas.map((c) => c.id_curso);

    if (idsCursos.length === 0) {
      return { data: [], total: 0, meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const [data, total] = await Promise.all([
      this.prisma.estudiante.findMany({
        where: {
          inscripciones: {
            some: {
              id_curso: { in: idsCursos },
              estado: 'EFECTIVO',
            },
          },
        },
        skip,
        take: limit,
        include: {
          persona: {
            select: {
              id_persona: true,
              nombres: true,
              apellidos: true,
              carnet: true,
              correo: true,
              celular: true,
            },
          },
        },
        orderBy: { persona: { apellidos: 'asc' } },
      }),
      this.prisma.estudiante.count({
        where: {
          inscripciones: {
            some: {
              id_curso: { in: idsCursos },
              estado: 'EFECTIVO',
            },
          },
        },
      }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getAllEstudiantes(pagination: PaginationDto, idProfesor?: string, rol?: string) {
    if (rol === 'PROFESOR' && idProfesor) {
      return this.getEstudiantesPorProfesor(idProfesor, pagination);
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.estudiante.findMany({
        skip,
        take: limit,
        include: {
          persona: {
            select: {
              id_persona: true,
              nombres: true,
              apellidos: true,
              carnet: true,
              correo: true,
              celular: true,
            },
          },
        },
        orderBy: { persona: { apellidos: 'asc' } },
      }),
      this.prisma.estudiante.count(),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getEstudianteById(id: string, idProfesor?: string, rol?: string) {
    if (rol === 'PROFESOR' && idProfesor) {
      const tieneAcceso = await this.accessService.tieneAccesoAEstudiante(idProfesor, id);
      if (!tieneAcceso) {
        throw new ForbiddenException('No tienes acceso a este estudiante');
      }
    }

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: id },
      include: {
        persona: true,
        tutores: {
          include: {
            padre: {
              include: {
                persona: { select: { nombres: true, apellidos: true, carnet: true } },
              },
            },
          },
        },
      },
    });

    if (!estudiante) {
      throw new NotFoundException(`Estudiante con ID ${id} no encontrado`);
    }

    return estudiante;
  }

  async getAllPadres(pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.padreFamilia.findMany({
        skip,
        take: limit,
        include: {
          persona: {
            select: {
              id_persona: true,
              nombres: true,
              apellidos: true,
              carnet: true,
              correo: true,
              celular: true,
              usuario: { select: { username: true } },
            },
          },
        },
        orderBy: { persona: { apellidos: 'asc' } },
      }),
      this.prisma.padreFamilia.count(),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getAllProfesores(pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.profesor.findMany({
        skip,
        take: limit,
        include: {
          persona: {
            select: {
              id_persona: true,
              nombres: true,
              apellidos: true,
              carnet: true,
              correo: true,
              celular: true,
              usuario: { select: { username: true } },
            },
          },
        },
        orderBy: { persona: { apellidos: 'asc' } },
      }),
      this.prisma.profesor.count(),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getMisHijos(idPadre: string, pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.tutorEstudiante.findMany({
        where: { id_padre: idPadre },
        skip,
        take: limit,
        include: {
          estudiante: {
            include: {
              persona: {
                select: {
                  id_persona: true,
                  nombres: true,
                  apellidos: true,
                  carnet: true,
                  correo: true,
                  celular: true,
                },
              },
              inscripciones: {
                where: { estado: 'EFECTIVO' },
                include: {
                  curso: {
                    select: {
                      id_curso: true,
                      gestion: true,
                      grado: true,
                      paralelo: true,
                      nivel: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.tutorEstudiante.count({ where: { id_padre: idPadre } }),
    ]);

    const hijos = data.map((tutor) => tutor.estudiante);
    return {
      data: hijos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateEstudiante(id: string, data: Partial<CreateUserDto>) {
    const estudiante = await this.prisma.estudiante.findUnique({ where: { id_persona: id } });
    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');

    const fechaNac = data.fecha_nac ? this.parseFechaNacimiento(data.fecha_nac) : undefined;

    return this.prisma.persona.update({
      where: { id_persona: id },
      data: {
        nombres: data.nombres?.trim(),
        apellidos: data.apellidos?.trim(),
        carnet: data.carnet?.trim(),
        correo: data.correo?.trim(),
        celular: data.celular?.trim(),
        estudiante: {
          update: {
            codigo_rude: data.codigo_rude?.trim(),
            ...(fechaNac !== undefined && { fecha_nac: fechaNac })
          }
        }
      },
      include: { estudiante: true }
    });
  }

  async deleteEstudiante(id: string) {
    const estudiante = await this.prisma.estudiante.findUnique({ where: { id_persona: id } });
    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');
    return this.prisma.persona.delete({ where: { id_persona: id } });
  }

  async updatePadre(id: string, data: Partial<CreatePadreDto>) {
    const padre = await this.prisma.padreFamilia.findUnique({ where: { id_persona: id } });
    if (!padre) throw new NotFoundException('Padre no encontrado');

    return this.prisma.persona.update({
      where: { id_persona: id },
      data: {
        nombres: data.nombres?.trim(),
        apellidos: data.apellidos?.trim(),
        carnet: data.carnet?.trim(),
        correo: data.correo?.trim(),
        celular: data.celular?.trim(),
        padre_familia: {
          update: {
            parentesco: data.parentesco?.trim()
          }
        }
      },
      include: { padre_familia: true }
    });
  }

  async deletePadre(id: string) {
    const padre = await this.prisma.padreFamilia.findUnique({ where: { id_persona: id } });
    if (!padre) throw new NotFoundException('Padre no encontrado');
    return this.prisma.persona.delete({ where: { id_persona: id } });
  }

  async updateProfesor(id: string, data: Partial<CreateProfesorDto>) {
    const profesor = await this.prisma.profesor.findUnique({ where: { id_persona: id } });
    if (!profesor) throw new NotFoundException('Profesor no encontrado');

    return this.prisma.persona.update({
      where: { id_persona: id },
      data: {
        nombres: data.nombres?.trim(),
        apellidos: data.apellidos?.trim(),
        carnet: data.carnet?.trim(),
        correo: data.correo?.trim(),
        celular: data.celular?.trim(),
        profesor: {
          update: {
            especialidad: data.especialidad?.trim()
          }
        }
      },
      include: { profesor: true }
    });
  }

  async deleteProfesor(id: string) {
    const profesor = await this.prisma.profesor.findUnique({ where: { id_persona: id } });
    if (!profesor) throw new NotFoundException('Profesor no encontrado');
    return this.prisma.persona.delete({ where: { id_persona: id } });
  }
}
