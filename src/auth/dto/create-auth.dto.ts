import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { RolUsuario } from '../../generated/prisma/enums';

export class CreateAuthDto {
  @IsString()
  @IsNotEmpty()
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  apellidos!: string;

  @IsString()
  @IsNotEmpty()
  carnet!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsEnum(RolUsuario)
  @IsNotEmpty()
  rol!: RolUsuario;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  correo?: string;

  @IsString()
  @IsOptional()
  celular?: string;
}