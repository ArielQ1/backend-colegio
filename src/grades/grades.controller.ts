import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request as ExpressRequest } from 'express';
import { GradesService } from './grades.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { RolUsuario } from '../generated/prisma/enums';
import { PaginationDto } from '../common/pagination.dto';

type AuthenticatedRequest = ExpressRequest & {
  user?: {
    sub: string;
    rol: string;
    id_persona: string;
  };
};

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post('upload')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadGrades(
    @UploadedFile() file: Express.Multer.File,
    @Body('id_carga') id_carga: string,
    @Body('trimestre') trimestre: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!id_carga || !trimestre) {
      throw new BadRequestException(
        'Debes enviar id_carga y trimestre junto con el archivo',
      );
    }

    const carga = Number.parseInt(id_carga, 10);
    const trim = Number.parseInt(trimestre, 10);

    if (Number.isNaN(carga) || Number.isNaN(trim)) {
      throw new BadRequestException(
        'id_carga y trimestre deben ser valores numericos validos',
      );
    }

    const idPersona = req.user?.id_persona;
    const rol = req.user?.rol;

    return await this.gradesService.uploadGradesCsv(
      file,
      carga,
      trim,
      idPersona,
      rol,
    );
  }

  @Get('estudiante/:id_estudiante')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR, RolUsuario.PADRE)
  async getNotasPorEstudiante(
    @Param('id_estudiante') idEstudiante: string,
    @Query() pagination: PaginationDto,
  ) {
    return await this.gradesService.getNotasPorEstudiante(idEstudiante, pagination);
  }

  @Get('curso/:id_curso')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getNotasPorCurso(
    @Query('id_curso') idCurso: string,
    @Query() pagination: PaginationDto,
    @Query('trimestre') trimestre?: string,
  ) {
    const cursoId = Number.parseInt(idCurso, 10);
    if (Number.isNaN(cursoId)) {
      throw new BadRequestException('ID de curso inválido');
    }
    const trim = trimestre ? Number.parseInt(trimestre, 10) : undefined;
    return await this.gradesService.getNotasPorCurso(cursoId, pagination, trim);
  }

  @Get('carga/:id_carga')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getNotasPorCarga(
    @Query('id_carga') idCarga: string,
    @Query() pagination: PaginationDto,
    @Query('trimestre') trimestre?: string,
  ) {
    const cargaId = Number.parseInt(idCarga, 10);
    if (Number.isNaN(cargaId)) {
      throw new BadRequestException('ID de carga inválido');
    }
    const trim = trimestre ? Number.parseInt(trimestre, 10) : undefined;
    return await this.gradesService.getNotasPorCarga(cargaId, pagination, trim);
  }
}