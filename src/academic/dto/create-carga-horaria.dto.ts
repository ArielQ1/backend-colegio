import { IsNumber, IsString } from "class-validator";

export class CreateCargaHorariaDto {
  @IsString()
  id_profesor!: string;

  @IsNumber()
  id_materia!: number;

  @IsNumber()
  id_curso!: number;
}
