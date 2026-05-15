import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RolUsuario } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { Express } from 'express';
import { PaginationDto } from '../common/pagination.dto';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

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

	private async tieneAccesoAEstudiante(idProfesor: string, idEstudiante: string): Promise<boolean> {
		const gestionActual = new Date().getFullYear();

		const cargasProfesor = await this.prisma.cargaHoraria.findMany({
			where: {
				id_profesor: idProfesor,
				curso: { gestion: gestionActual },
			},
			select: { id_curso: true },
		});

		const idsCursos = cargasProfesor.map((c) => c.id_curso);
		if (idsCursos.length === 0) return false;

		const inscripcion = await this.prisma.inscripcion.findFirst({
			where: {
				id_estudiante: idEstudiante,
				id_curso: { in: idsCursos },
				estado: 'EFECTIVO',
			},
		});

		return !!inscripcion;
	}

	async getNotasPorEstudiante(idEstudiante: string, pagination: PaginationDto, idProfesor?: string, rol?: string) {
		if (rol === RolUsuario.PROFESOR && idProfesor) {
			const tieneAcceso = await this.tieneAccesoAEstudiante(idProfesor, idEstudiante);
			if (!tieneAcceso) {
				throw new ForbiddenException('No tienes acceso a las notas de este estudiante');
			}
		}

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

	private async tieneAccesoACurso(idProfesor: string, idCurso: number): Promise<boolean> {
		const gestionActual = new Date().getFullYear();

		const carga = await this.prisma.cargaHoraria.findFirst({
			where: {
				id_profesor: idProfesor,
				id_curso: idCurso,
				curso: { gestion: gestionActual },
			},
		});

		return !!carga;
	}

	async getNotasPorCurso(idCurso: number, pagination: PaginationDto, trimestre?: number, idProfesor?: string, rol?: string) {
		const curso = await this.prisma.curso.findUnique({ where: { id_curso: idCurso } });
		if (!curso) {
			throw new NotFoundException(`Curso con ID ${idCurso} no encontrado`);
		}

		if (rol === RolUsuario.PROFESOR && idProfesor) {
			const tieneAcceso = await this.tieneAccesoACurso(idProfesor, idCurso);
			if (!tieneAcceso) {
				throw new ForbiddenException('No tienes acceso a las notas de este curso');
			}
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

	async getNotasPorCursoGestion(idProfesor: string, gestion: number, pagination: PaginationDto, trimestre?: number) {
		const cargas = await this.prisma.cargaHoraria.findMany({
			where: {
				id_profesor: idProfesor,
				curso: { gestion },
			},
			select: { id_carga: true, id_curso: true },
		});

		const idsCursos = [...new Set(cargas.map((c) => c.id_curso))];
		const idsCargas = cargas.map((c) => c.id_carga);

		if (idsCargas.length === 0) {
			return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
		}

		const where: any = {
			OR: [
				{ inscripcion: { id_curso: { in: idsCursos } } },
				{ id_carga: { in: idsCargas } },
			],
		};
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
						include: { materia: { select: { nombre: true } }, curso: { select: { grado: true, paralelo: true } } },
					},
				},
				orderBy: [
					{ carga: { curso: { grado: 'asc' } } },
					{ carga: { materia: { nombre: 'asc' } } },
					{ inscripcion: { estudiante: { persona: { apellidos: 'asc' } } } },
				],
			}),
			this.prisma.calificacion.count({ where }),
		]);

		return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
	}

	async getNotasPorCarga(idCarga: number, pagination: PaginationDto, trimestre?: number, idProfesor?: string, rol?: string) {
		const carga = await this.prisma.cargaHoraria.findUnique({
			where: { id_carga: idCarga },
			include: { materia: true, curso: true },
		});

		if (!carga) {
			throw new NotFoundException(`Carga horaria con ID ${idCarga} no encontrada`);
		}

		if (rol === RolUsuario.PROFESOR && idProfesor) {
			if (carga.id_profesor !== idProfesor) {
				throw new ForbiddenException('No tienes acceso a las notas de esta carga horaria');
			}
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
			throw new BadRequestException('No se envio ningun archivo');
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

		const filename = file.originalname.toLowerCase();
		const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls');
		const isCsv = filename.endsWith('.csv');

		if (!isExcel && !isCsv) {
			throw new BadRequestException('El archivo debe ser .xlsx, .xls o .csv');
		}

		let filas: CsvGradeRow[];

		if (isExcel) {
			filas = await this.parseExcelBuffer(file.buffer);
		} else {
			filas = await this.parseCsvBuffer(file.buffer);
		}

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

	private async parseExcelBuffer(buffer: Buffer): Promise<CsvGradeRow[]> {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer.buffer as ArrayBuffer);

		const sheet = workbook.getWorksheet('Estudiantes');
		if (!sheet) {
			throw new BadRequestException('No se encontró la hoja "Estudiantes" en el Excel');
		}

		const filas: CsvGradeRow[] = [];
		const headerRow = sheet.getRow(1);
		const headerMap: Record<string, number> = {};

		headerRow.eachCell((cell, colNumber) => {
			headerMap[String(cell.value).toLowerCase().trim()] = colNumber;
		});

		const requiredHeaders = ['carnet', 'id_estudiante', 'nombres', 'apellidos'];
		for (const h of requiredHeaders) {
			if (!headerMap[h]) {
				throw new BadRequestException(`Falta la columna "${h}" en el Excel`);
			}
		}

		sheet.eachRow((row, rowNumber) => {
			if (rowNumber === 1) return;

			const rowData: CsvGradeRow = {};
			if (headerMap['carnet']) rowData.carnet = String(row.getCell(headerMap['carnet']).value || '');
			if (headerMap['id_estudiante']) rowData.id_estudiante = String(row.getCell(headerMap['id_estudiante']).value || '');
			if (headerMap['nota_ser']) rowData.nota_ser = String(row.getCell(headerMap['nota_ser']).value || '');
			if (headerMap['nota_saber']) rowData.nota_saber = String(row.getCell(headerMap['nota_saber']).value || '');
			if (headerMap['nota_hacer']) rowData.nota_hacer = String(row.getCell(headerMap['nota_hacer']).value || '');
			if (headerMap['nota_decidir']) rowData.nota_decidir = String(row.getCell(headerMap['nota_decidir']).value || '');
			if (headerMap['autoevaluacion']) rowData.autoevaluacion = String(row.getCell(headerMap['autoevaluacion']).value || '');

			if (rowData.carnet || rowData.id_estudiante) {
				filas.push(rowData);
			}
		});

		return filas;
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

	async generarPlantillaExcel(idCarga: number, trimestre: number, idProfesor?: string, rol?: string) {
		if (![1, 2, 3].includes(trimestre)) {
			throw new BadRequestException('trimestre debe ser 1, 2 o 3');
		}

		const carga = await this.prisma.cargaHoraria.findUnique({
			where: { id_carga: idCarga },
			include: {
				materia: true,
				curso: true,
				profesor: {
					include: {
						persona: { select: { nombres: true, apellidos: true } },
					},
				},
			},
		});

		if (!carga) {
			throw new NotFoundException(`Carga horaria con ID ${idCarga} no encontrada`);
		}

		if (rol === RolUsuario.PROFESOR && idProfesor && carga.id_profesor !== idProfesor) {
			throw new ForbiddenException('No tienes acceso a esta carga horaria');
		}

		const nombreColegio = process.env.NOMBRE_COLEGIO || 'Colegio';
		const nombreProfesor = `${carga.profesor.persona.nombres} ${carga.profesor.persona.apellidos}`;
		const nombreCurso = `${carga.curso.grado} "${carga.curso.paralelo}"`;
		const nombreMateria = carga.materia.nombre;
		const gestion = carga.curso.gestion;

		const estudiantes = await this.prisma.inscripcion.findMany({
			where: {
				id_curso: carga.id_curso,
				estado: 'EFECTIVO',
			},
			include: {
				estudiante: {
					include: {
						persona: { select: { carnet: true, nombres: true, apellidos: true } },
					},
				},
			},
			orderBy: {
				estudiante: {
					persona: { apellidos: 'asc' },
				},
			},
		});

		const workbook = new ExcelJS.Workbook();
		workbook.creator = 'Backend Colegio';
		workbook.created = new Date();

		const headerBlue = {
			type: 'pattern' as const,
			pattern: 'solid' as const,
			fgColor: { argb: 'FF1E4E79' },
		};
		const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
		const infoHeaderFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8E8E8' } };
		const infoFont = { bold: true, size: 10 };
		const thinBorder = {
			top: { style: 'thin' as const },
			left: { style: 'thin' as const },
			bottom: { style: 'thin' as const },
			right: { style: 'thin' as const },
		};

		const wsInfo = workbook.addWorksheet('Info');
		wsInfo.columns = [{ width: 20 }, { width: 40 }];
		const infoData = [
			['CAMPO', 'VALOR'],
			['Colegio', nombreColegio],
			['Gestión', gestion.toString()],
			['Materia', nombreMateria],
			['Curso', nombreCurso],
			['Profesor', nombreProfesor],
			['Trimestre', trimestre.toString()],
			['Fecha generación', new Date().toLocaleDateString('es-BO')],
		];
		infoData.forEach((row, idx) => {
			const cell = wsInfo.addRow(row);
			if (idx === 0) {
				cell.eachCell((c) => {
					c.fill = infoHeaderFill;
					c.font = infoFont;
					c.border = thinBorder;
				});
			} else {
				cell.eachCell((c) => {
					c.border = thinBorder;
					c.font = { size: 10 };
				});
			}
		});

		const wsEstudiantes = workbook.addWorksheet('Estudiantes');
		wsEstudiantes.columns = [
			{ header: 'carnet', key: 'carnet', width: 15 },
			{ header: 'id_estudiante', key: 'id_estudiante', width: 40 },
			{ header: 'nombres', key: 'nombres', width: 25 },
			{ header: 'apellidos', key: 'apellidos', width: 25 },
			{ header: 'nota_ser', key: 'nota_ser', width: 12 },
			{ header: 'nota_saber', key: 'nota_saber', width: 12 },
			{ header: 'nota_hacer', key: 'nota_hacer', width: 12 },
			{ header: 'nota_decidir', key: 'nota_decidir', width: 14 },
			{ header: 'autoevaluacion', key: 'autoevaluacion', width: 16 },
		];
		const headerRow = wsEstudiantes.getRow(1);
		headerRow.font = headerFont;
		headerRow.fill = headerBlue;
		headerRow.height = 25;
		headerRow.eachCell((cell) => {
			cell.border = thinBorder;
			cell.alignment = { horizontal: 'center', vertical: 'middle' };
		});

		estudiantes.forEach((insc) => {
			const row = wsEstudiantes.addRow({
				carnet: insc.estudiante.persona.carnet,
				id_estudiante: insc.id_estudiante,
				nombres: insc.estudiante.persona.nombres,
				apellidos: insc.estudiante.persona.apellidos,
				nota_ser: '',
				nota_saber: '',
				nota_hacer: '',
				nota_decidir: '',
				autoevaluacion: '',
			});
			row.eachCell((cell, colNumber) => {
				cell.border = thinBorder;
				const notaColumns = [5, 6, 7, 8, 9];
				if (notaColumns.includes(colNumber)) {
					cell.fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF9C4' } };
					cell.alignment = { horizontal: 'center' as const };
				}
			});
		});
		wsEstudiantes.views = [{ state: 'frozen', ySplit: 1 }];

		const wsInstrucciones = workbook.addWorksheet('Instrucciones');
		wsInstrucciones.columns = [{ width: 8 }, { width: 70 }];
		const instrData = [
			['PASO', 'DESCRIPCIÓN'],
			['1', 'Llena las columnas de notas (nota_ser, nota_saber, nota_hacer, nota_decidir, autoevaluacion) con valores numéricos'],
			['2', 'Cada nota debe ser un número. Deja vacío si no hay nota'],
			['3', 'NO modifiques las columnas: carnet, id_estudiante, nombres, apellidos'],
			['4', 'NO modifiques las filas de estudiantes'],
			['5', 'Guarda el archivo como .xlsx (formato Excel)'],
			['6', 'Sube el archivo en: POST /grades/upload'],
			['7', 'Al subir, especifica el mismo id_carga y trimestre'],
			['8', 'El sistema detectará automáticamente el archivo Excel'],
		];
		instrData.forEach((row, idx) => {
			const cell = wsInstrucciones.addRow(row);
			if (idx === 0) {
				cell.eachCell((c) => {
					c.fill = infoHeaderFill;
					c.font = infoFont;
					c.border = thinBorder;
				});
			} else {
				cell.eachCell((c) => {
					c.border = thinBorder;
					c.font = { size: 10 };
				});
			}
		});

		const buffer = await workbook.xlsx.writeBuffer();

		const nombreArchivo = `notas_${nombreMateria.replace(/\s+/g, '_')}_${nombreCurso.replace(/"/g, '')}_T${trimestre}_${gestion}.xlsx`;

		return {
			buffer,
			filename: nombreArchivo,
			info: {
				materia: nombreMateria,
				curso: nombreCurso,
				gestion,
				trimestre,
			},
		};
	}
}
