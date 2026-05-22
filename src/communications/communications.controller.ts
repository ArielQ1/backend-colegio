import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { RolUsuario, TipoComunicado } from '../generated/prisma/enums';
import { Request as ExpressRequest } from 'express';
import { PaginationDto } from '../common/pagination.dto';
import { EmitirComunicadoDto } from './dto';

type AuthenticatedRequest = ExpressRequest & {
  user?: { sub: string; rol: string; id_persona: string };
};

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Post()
  @Roles(RolUsuario.PROFESOR)
  createComunicado(
    @Req() req: AuthenticatedRequest,
    @Body() body: EmitirComunicadoDto,
  ) {
    const idPersona = req.user?.id_persona;
    if (!idPersona) {
      throw new BadRequestException('No se pudo identificar al usuario');
    }
    return this.communicationsService.emitirComunicado({
      id_profesor: idPersona,
      id_estudiante: body.id_estudiante,
      id_curso: body.id_curso,
      tipo: body.tipo,
      descripcion: body.descripcion,
    });
  }

  @Post('admin')
  @Roles(RolUsuario.ADMIN)
  createComunicadoAdmin(
    @Req() req: AuthenticatedRequest,
    @Body() body: EmitirComunicadoDto,
  ) {
    const idAdmin = req.user?.id_persona;
    if (!idAdmin) {
      throw new BadRequestException('No se pudo identificar al usuario');
    }
    return this.communicationsService.emitirComunicadoAdmin({
      id_admin: idAdmin,
      id_estudiante: body.id_estudiante,
      id_curso: body.id_curso,
      tipo: body.tipo,
      descripcion: body.descripcion,
    });
  }

  @Get()
  @Roles(RolUsuario.PADRE)
  getMisComunicados(
    @Req() req: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
    @Query('tipo') tipo?: TipoComunicado,
    @Query('leido') leido?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const idPersona = req.user?.id_persona;
    if (!idPersona) {
      throw new BadRequestException('No se pudo identificar al usuario');
    }
    const filtros: any = {};
    if (tipo) filtros.tipo = tipo;
    if (leido !== undefined) filtros.leido = leido === 'true';
    if (fechaDesde) filtros.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filtros.fechaHasta = new Date(fechaHasta);

    return this.communicationsService.getComunicadosDelPadre(idPersona, pagination, filtros);
  }

  @Get('estudiante/:id_estudiante')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  getComunicadosPorEstudiante(
    @Param('id_estudiante') idEstudiante: string,
    @Query() pagination: PaginationDto,
    @Query('tipo') tipo?: TipoComunicado,
    @Query('leido') leido?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const filtros: any = {};
    if (tipo) filtros.tipo = tipo;
    if (leido !== undefined) filtros.leido = leido === 'true';
    if (fechaDesde) filtros.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filtros.fechaHasta = new Date(fechaHasta);

    return this.communicationsService.getComunicadosPorEstudiante(idEstudiante, pagination, filtros);
  }

  @Get('admin')
  @Roles(RolUsuario.ADMIN)
  getTodosLosComunicados(
    @Query() pagination: PaginationDto,
    @Query('tipo') tipo?: TipoComunicado,
    @Query('leido') leido?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('id_profesor') idProfesor?: string,
    @Query('id_estudiante') idEstudiante?: string,
    @Query('id_curso') idCurso?: string,
  ) {
    const filtros: any = {};
    if (tipo) filtros.tipo = tipo;
    if (leido !== undefined) filtros.leido = leido === 'true';
    if (fechaDesde) filtros.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filtros.fechaHasta = new Date(fechaHasta);
    if (idProfesor) filtros.id_profesor = idProfesor;
    if (idEstudiante) filtros.id_estudiante = idEstudiante;
    if (idCurso) filtros.id_curso = parseInt(idCurso);

    return this.communicationsService.getTodosLosComunicados(pagination, filtros);
  }

  @Get('resumen')
  @Roles(RolUsuario.ADMIN)
  getResumenComunicados(@Query() pagination: PaginationDto) {
    return this.communicationsService.getResumenComunicados(pagination);
  }

  @Patch(':id/leido')
  @Roles(RolUsuario.PADRE)
  marcarLeido(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const idPersona = req.user?.id_persona;
    if (!idPersona) {
      throw new BadRequestException('No se pudo identificar al usuario');
    }
    return this.communicationsService.marcarLeido(id, idPersona);
  }
}