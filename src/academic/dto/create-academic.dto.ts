export class CreateCursoDto {
  gestion!: number;
  turno!: string;
  grado!: string;
  paralelo!: string;
  nivel!: string;
}

export class CreateMateriaDto {
  nombre!: string;
  area?: string;
}
