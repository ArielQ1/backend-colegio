import { IsString, IsNotEmpty } from 'class-validator';

export class VincularFamiliarDto {
  @IsString()
  @IsNotEmpty()
  id_padre!: string;

  @IsString()
  @IsNotEmpty()
  id_estudiante!: string;
}
