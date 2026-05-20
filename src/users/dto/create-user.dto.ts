import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDto {
	@IsString()
	@IsNotEmpty()
	nombres!: string;

	@IsString()
	@IsNotEmpty()
	apellidos!: string;

	@IsString()
	@IsNotEmpty()
	carnet!: string;

	@IsString()
	@IsOptional()
	correo?: string;

	@IsString()
	@IsOptional()
	celular?: string;

	@IsString()
	@IsOptional()
	codigo_rude?: string;

	@IsString()
	@IsOptional()
	fecha_nac?: string;
}
