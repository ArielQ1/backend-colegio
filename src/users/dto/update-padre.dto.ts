import { PartialType } from '@nestjs/mapped-types';
import { CreatePadreDto } from './create-padre.dto';

export class UpdatePadreDto extends PartialType(CreatePadreDto) {}
