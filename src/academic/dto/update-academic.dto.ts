import { PartialType } from '@nestjs/mapped-types';
import { CreateCursoDto, CreateMateriaDto } from './create-academic.dto';

export class UpdateCursoDto extends PartialType(CreateCursoDto) {}
export class UpdateMateriaDto extends PartialType(CreateMateriaDto) {}
