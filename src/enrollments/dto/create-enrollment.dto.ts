import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class CreateEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  id_estudiante!: string;

  @IsInt()
  @IsNotEmpty()
  id_curso!: number;
}
