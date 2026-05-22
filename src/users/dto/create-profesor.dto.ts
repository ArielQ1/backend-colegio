import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProfesorDto {
  @IsString()
  @IsOptional()
  nombres?: string;

  @IsString()
  @IsOptional()
  apellidos?: string;

  @IsString()
  @IsNotEmpty()
  carnet!: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  correo?: string;

  @IsString()
  @IsOptional()
  celular?: string;

  @IsString()
  @IsOptional()
  especialidad?: string;

  @IsString()
  @IsOptional()
  rol?: string;
}
