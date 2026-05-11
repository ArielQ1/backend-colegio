import type { RolUsuario } from '../../generated/prisma/enums';

export class CreateAuthDto {
  nombres!: string;
  apellidos!: string;
  carnet!: string;
  password!: string;
  rol!: RolUsuario;
  username?: string;
  correo?: string;
  celular?: string;
}
