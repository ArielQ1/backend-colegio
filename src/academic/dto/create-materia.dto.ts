import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMateriaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsOptional()
  area?: string;
}
