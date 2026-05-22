import { IsOptional, IsString, IsEnum, MinLength, IsInt } from 'class-validator';
import { TipoComunicado } from '../../generated/prisma/enums';

export class EmitirComunicadoDto {
  @IsOptional()
  @IsString()
  id_estudiante?: string;

  @IsOptional()
  @IsInt()
  id_curso?: number;

  @IsEnum(TipoComunicado)
  tipo!: TipoComunicado;

  @IsString()
  @MinLength(1)
  descripcion!: string;
}