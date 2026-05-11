import { IsOptional, IsEnum } from 'class-validator';
import { EstadoInscripcion } from '../../generated/prisma/enums';

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsEnum(EstadoInscripcion)
  estado?: EstadoInscripcion;
}