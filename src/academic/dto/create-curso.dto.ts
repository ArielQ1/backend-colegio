import { IsString, IsNotEmpty, IsInt } from 'class-validator';

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
