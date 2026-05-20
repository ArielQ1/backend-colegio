import { IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { TipoComunicado } from '../../generated/prisma/enums';

export class EmitirComunicadoDto {
  @IsOptional()
  @IsString()
  id_estudiante?: string;

  @IsEnum(TipoComunicado)
  tipo!: TipoComunicado;

  @IsString()
  @MinLength(1)
  descripcion!: string;
}