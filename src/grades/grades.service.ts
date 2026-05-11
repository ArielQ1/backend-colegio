import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { Express } from 'express';
import { PaginationDto } from '../common/pagination.dto';

type CsvGradeRow = {
	carnet?: string;
	id_estudiante?: string;
	nota_ser?: string;
	nota_saber?: string;
	nota_hacer?: string;
	nota_decidir?: string;
	autoevaluacion?: string;
};

@Injectable()
export class GradesService {
	constructor(private readonly prisma: PrismaService) {}

	async getNotasPorEstudiante(idEstudiante: string, pagination: PaginationDto) {
		const estudiante = await this.prisma.estudiante.findUnique({
			where: { id_persona: idEstudiante },
		});

		if (!estudiante) {
			throw new NotFoundException(`Estudiante con ID ${idEstudiante} no encontrado`);
		}

		const page = pagination.page || 1;
		const limit = pagination.limit || 20;
		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			this.prisma.calificacion.findMany({
				where: {
					inscripcion: { id_estudiante: idEstudiante },
				},
				skip,
				take: limit,
				include: {
					carga: {
						include: {
							materia: { select: { id_materia: true, nombre: true } },
							curso: { select: { id_curso: true, grado: true, paralelo: true, nivel: true } },
						},
					},
				},
				orderBy: { trimestre: 'asc' },
			}),
			this.prisma.calificacion.count({
				where: { inscripcion: { id_estudiante: idEstudiante } },
			}),
		]);

		return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
	}

	async getNotasPorCurso(idCurso: number, pagination: PaginationDto, trimestre?: number) {
		const curso = await this.prisma.curso.findUnique({ where: { id_curso: idCurso } });
		if (!curso) {
			throw new NotFoundException(`Curso con ID ${idCurso} no encontrado`);
		}

		const where: any = { inscripcion: { id_curso: idCurso } };
		if (trimestre) where.trimestre = trimestre;

		const page = pagination.page || 1;
		const limit = pagination.limit || 20;
		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			this.prisma.calificacion.findMany({
				where,
				skip,
				take: limit,
				include: {
					inscripcion: {
						include: {
							estudiante: {
								include: { persona: { select: { nombres: true, apellidos: true, carnet: true } } },
							},
						},
					},
					carga: {
						include: { materia: { select: { nombre: true } } },
					},
				},
				orderBy: [{ carga: { materia: { nombre: 'asc' } } }, { inscripcion: { estudiante: { persona: { apellidos: 'asc' } } } }],
			}),
			this.prisma.calificacion.count({ where }),
		]);

		return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
	}

	async getNotasPorCarga(idCarga: number, pagination: PaginationDto, trimestre?: number) {
		const carga = await this.prisma.cargaHoraria.findUnique({
			where: { id_carga: idCarga },
			include: { materia: true, curso: true },
		});

		if (!carga) {
			throw new NotFoundException(`Carga horaria con ID ${idCarga} no encontrada`);
		}

		const where: any = { id_carga: idCarga };
		if (trimestre) where.trimestre = trimestre;

		const page = pagination.page || 1;
		const limit = pagination.limit || 20;
		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			this.prisma.calificacion.findMany({
				where,
				skip,
				take: limit,
				include: {
					inscripcion: {
						include: {
							estudiante: {
								include: { persona: { select: { nombres: true, apellidos: true, carnet: true } } },
							},
						},
					},
				},
				orderBy: { inscripcion: { estudiante: { persona: { apellidos: 'asc' } } } },
			}),
			this.prisma.calificacion.count({ where }),
		]);

		return {
			data,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
			info: { materia: carga.materia.nombre, curso: `${carga.curso.grado} "${carga.curso.paralelo}"` },
		};
	}

	async uploadGradesCsv(
		file: Express.Multer.File,
		id_carga: number,
		trimestre: number,
		idPersona?: string,
		rol?: string,
	) {
		if (!file) {
			throw new BadRequestException('No se envio ningun archivo CSV');
		}

		if (!Number.isInteger(id_carga) || id_carga <= 0) {
			throw new BadRequestException('id_carga debe ser un numero entero valido');
		}

		if (![1, 2, 3].includes(trimestre)) {
			throw new BadRequestException('trimestre debe ser 1, 2 o 3');
		}

		if (rol === 'PROFESOR' && idPersona) {
			const carga = await this.prisma.cargaHoraria.findUnique({
				where: { id_carga },
				select: { id_profesor: true },
			});

			if (!carga) {
				throw new BadRequestException('La carga horaria especificada no existe');
			}

			if (carga.id_profesor !== idPersona) {
				throw new ForbiddenException('No tienes permiso para subir notas en esta carga horaria');
			}
		}

		const filas = await this.parseCsvBuffer(file.buffer);

		const resultado = await this.procesarYGuardarNotas(
			filas,
			id_carga,
			trimestre,
		);

		return {
			success: true,
			mensaje: `Exito. Se procesaron ${resultado.procesadas} filas y se guardaron ${resultado.guardadas} notas`,
			procesadas: resultado.procesadas,
			guardadas: resultado.guardadas,
			omitidas: resultado.omitidas,
		};
	}

	private async parseCsvBuffer(buffer: Buffer): Promise<CsvGradeRow[]> {
		const filas: CsvGradeRow[] = [];
		const stream = Readable.from(buffer);

		return await new Promise<CsvGradeRow[]>((resolve, reject) => {
			stream
				.pipe(csv())
				.on('data', (data) => filas.push(data as CsvGradeRow))
				.on('end', () => resolve(filas))
				.on('error', () => {
					reject(new BadRequestException('Error leyendo el archivo CSV'));
				});
		});
	}

	private async procesarYGuardarNotas(
		filas: CsvGradeRow[],
		id_carga: number,
		trimestre: number,
	) {
		const carga = await this.prisma.cargaHoraria.findUnique({
			where: { id_carga },
			select: { id_curso: true },
		});

		if (!carga) {
			throw new BadRequestException('La carga horaria especificada no existe');
		}

		const inscripcionesCurso = await this.prisma.inscripcion.findMany({
			where: { id_curso: carga.id_curso },
			include: {
				estudiante: {
					select: { id_persona: true, persona: { select: { carnet: true } } },
				},
			},
		});

		const mapaIdEstudiante = new Map(
			inscripcionesCurso.map((item) => [item.id_estudiante, item.id_inscripcion]),
		);

		const mapaCarnet = new Map(
			inscripcionesCurso.map((item) => [item.estudiante.persona.carnet, item.id_inscripcion]),
		);

		let guardadas = 0;
		let omitidas = 0;

		for (const fila of filas) {
			const carnet = (fila.carnet || '').trim();
			const id_estudiante = (fila.id_estudiante || '').trim();

			let idInscripcion: number | undefined;

			if (id_estudiante) {
				idInscripcion = mapaIdEstudiante.get(id_estudiante);
			} else if (carnet) {
				idInscripcion = mapaCarnet.get(carnet);
			}

			if (!idInscripcion) {
				omitidas += 1;
				continue;
			}

			const nota_ser = this.parseScore(fila.nota_ser);
			const nota_saber = this.parseScore(fila.nota_saber);
			const nota_hacer = this.parseScore(fila.nota_hacer);
			const nota_decidir = this.parseScore(fila.nota_decidir);
			const autoevaluacion = this.parseScore(fila.autoevaluacion);

			const nota_final_trimestre =
				nota_ser + nota_saber + nota_hacer + nota_decidir + autoevaluacion;

			await this.prisma.calificacion.upsert({
				where: {
					id_inscripcion_id_carga_trimestre: {
						id_inscripcion: idInscripcion,
						id_carga,
						trimestre,
					},
				},
				update: {
					nota_ser,
					nota_saber,
					nota_hacer,
					nota_decidir,
					autoevaluacion,
					nota_final_trimestre,
				},
				create: {
					id_inscripcion: idInscripcion,
					id_carga,
					trimestre,
					nota_ser,
					nota_saber,
					nota_hacer,
					nota_decidir,
					autoevaluacion,
					nota_final_trimestre,
				},
			});

			guardadas += 1;
		}

		return {
			procesadas: filas.length,
			guardadas,
			omitidas,
		};
	}

	private parseScore(value?: string): number {
		if (!value?.trim()) {
			return 0;
		}

		const parsed = Number.parseFloat(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	}
}
