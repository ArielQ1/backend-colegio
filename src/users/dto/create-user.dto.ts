export class CreateUserDto {
	nombres!: string;
	apellidos!: string;
	carnet!: string;
	correo?: string;
	celular?: string;
	codigo_rude?: string;
	fecha_nac?: string;
}
