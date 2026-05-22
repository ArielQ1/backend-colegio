import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateCursoDto {
  @IsInt()
  @IsNotEmpty()
  gestion!: number;

  @IsString()
  @IsNotEmpty()
  turno!: string;

  @IsString()
  @IsNotEmpty()
  grado!: string;

  @IsString()
  @IsNotEmpty()
  paralelo!: string;

  @IsString()
  @IsNotEmpty()
  nivel!: string;
}

export class CreateMateriaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsOptional()
  area?: string;
}
