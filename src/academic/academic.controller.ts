import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AcademicService } from './academic.service';
import { CreateCursoDto } from './dto/create-curso.dto';
import { CreateMateriaDto } from './dto/create-materia.dto';
import { CreateCargaHorariaDto } from './dto/create-carga-horaria.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { RolUsuario } from '../generated/prisma/enums';
import { PaginationDto } from '../common/pagination.dto';

@Controller('academic')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Post('curso')
  @Roles(RolUsuario.ADMIN)
  async createCurso(@Body() body: CreateCursoDto) {
    return await this.academicService.createCurso(body);
  }

  @Put('curso/:id')
  @Roles(RolUsuario.ADMIN)
  async updateCurso(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateCursoDto,
  ) {
    return await this.academicService.updateCurso(id, body);
  }

  @Delete('curso/:id')
  @Roles(RolUsuario.ADMIN)
  async deleteCurso(@Param('id', ParseIntPipe) id: number) {
    return await this.academicService.deleteCurso(id);
  }

  @Post('materia')
  @Roles(RolUsuario.ADMIN)
  async createMateria(@Body() body: CreateMateriaDto) {
    return await this.academicService.createMateria(body);
  }

  @Put('materia/:id')
  @Roles(RolUsuario.ADMIN)
  async updateMateria(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateMateriaDto,
  ) {
    return await this.academicService.updateMateria(id, body);
  }

  @Delete('materia/:id')
  @Roles(RolUsuario.ADMIN)
  async deleteMateria(@Param('id', ParseIntPipe) id: number) {
    return await this.academicService.deleteMateria(id);
  }

  @Post('carga-horaria')
  @Roles(RolUsuario.ADMIN)
  async createCargaHoraria(@Body() body: CreateCargaHorariaDto) {
    return await this.academicService.createCargaHoraria(body);
  }

  @Delete('carga-horaria/:id')
  @Roles(RolUsuario.ADMIN)
  async deleteCargaHoraria(@Param('id', ParseIntPipe) id: number) {
    return await this.academicService.deleteCargaHoraria(id);
  }

  @Get('cursos')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getAllCursos(@Query() pagination: PaginationDto) {
    const cursos = await this.academicService.getAllCursos(pagination);
    return cursos;
  }

  @Get('cursos/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getCursoById(@Param('id', ParseIntPipe) id: number) {
    const curso = await this.academicService.getCursoById(id);
    return { success: true, data: curso };
  }

  @Get('materias')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getAllMaterias(@Query() pagination: PaginationDto) {
    const materias = await this.academicService.getAllMaterias(pagination);
    return materias;
  }

  @Get('materias/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getMateriaById(@Param('id', ParseIntPipe) id: number) {
    const materia = await this.academicService.getMateriaById(id);
    return { success: true, data: materia };
  }

  @Get('carga-horaria/profesor/:idProfesor')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getCargasPorProfesor(
    @Param('idProfesor') idProfesor: string,
    @Query() pagination: PaginationDto,
  ) {
    const cargas = await this.academicService.getCargasPorProfesor(idProfesor, pagination);
    return cargas;
  }
}