import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { RolUsuario } from '../generated/prisma/enums';
import { PaginationDto } from '../common/pagination.dto';

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles(RolUsuario.ADMIN)
  async create(@Body() body: CreateEnrollmentDto) {
    return await this.enrollmentsService.matricularEstudiante(body);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getAll(
    @Query() pagination: PaginationDto,
    @Query('id_curso') idCurso?: string,
  ) {
    const cursoId = idCurso ? parseInt(idCurso, 10) : undefined;
    return await this.enrollmentsService.getAllInscripciones(pagination, cursoId);
  }

  @Get('estudiante/:id_estudiante')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR, RolUsuario.PADRE)
  async getInscripcionesPorEstudiante(
    @Param('id_estudiante') idEstudiante: string,
    @Query() pagination: PaginationDto,
  ) {
    return await this.enrollmentsService.getInscripcionesPorEstudiante(idEstudiante, pagination);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getById(@Param('id', ParseIntPipe) id: number) {
    return await this.enrollmentsService.getInscripcionById(id);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateEnrollmentDto,
  ) {
    return await this.enrollmentsService.updateInscripcion(id, body);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return await this.enrollmentsService.deleteInscripcion(id);
  }
}