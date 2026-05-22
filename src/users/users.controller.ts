import {
  Body,
  Controller,
  Post,
  Put,
  Delete,
  UseGuards,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { RolUsuario } from '../generated/prisma/enums';
import { CreatePadreDto } from './dto/create-padre.dto';
import { UpdatePadreDto } from './dto/update-padre.dto';
import { VincularFamiliarDto } from './dto/vincular-familiar.dto';
import { CreateProfesorDto } from './dto/create-profesor.dto';
import { UpdateProfesorDto } from './dto/update-profesor.dto';
import { PaginationDto } from '../common/pagination.dto';
import { CurrentUser, type CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('estudiante')
  @Roles(RolUsuario.ADMIN)
  async createEstudiante(@Body() body: CreateUserDto) {
    return await this.usersService.createEstudiante(body);
  }

  @Post('padre')
  @Roles(RolUsuario.ADMIN)
  async createPadre(@Body() body: CreatePadreDto) {
    return await this.usersService.createPadre(body);
  }

  @Post('profesor')
  @Roles(RolUsuario.ADMIN)
  async createProfesor(@Body() body: CreateProfesorDto) {
    return await this.usersService.createProfesor(body);
  }

  @Post('vincular')
  @Roles(RolUsuario.ADMIN)
  async vincular(@Body() body: VincularFamiliarDto) {
    return await this.usersService.vincularFamiliar(body);
  }

  @Get('estudiantes')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR)
  async getAllEstudiantes(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const idProfesor = user.rol === 'PROFESOR' ? user.id_persona : undefined;
    return await this.usersService.getAllEstudiantes(pagination, idProfesor, user.rol);
  }

  @Get('estudiantes/mis-hijos')
  @Roles(RolUsuario.PADRE)
  async getMisHijos(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return await this.usersService.getMisHijos(user.id_persona, pagination);
  }

  @Get('estudiantes/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR, RolUsuario.PADRE)
  async getEstudianteById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const idProfesor = user.rol === 'PROFESOR' ? user.id_persona : undefined;
    return await this.usersService.getEstudianteById(id, idProfesor, user.rol);
  }

  @Get('padres')
  @Roles(RolUsuario.ADMIN)
  async getAllPadres(@Query() pagination: PaginationDto) {
    return await this.usersService.getAllPadres(pagination);
  }

  @Get('padres/:id_padre/hijos')
  @Roles(RolUsuario.ADMIN)
  async getHijosDePadre(
    @Param('id_padre') idPadre: string,
    @Query() pagination: PaginationDto,
  ) {
    return await this.usersService.getMisHijos(idPadre, pagination);
  }

  @Get('profesores')
  @Roles(RolUsuario.ADMIN)
  async getAllProfesores(@Query() pagination: PaginationDto) {
    return await this.usersService.getAllProfesores(pagination);
  }

  @Put('estudiante/:id')
  @Roles(RolUsuario.ADMIN)
  async updateEstudiante(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return await this.usersService.updateEstudiante(id, body);
  }

  @Delete('estudiante/:id')
  @Roles(RolUsuario.ADMIN)
  async deleteEstudiante(@Param('id') id: string) {
    return await this.usersService.deleteEstudiante(id);
  }

  @Put('padre/:id')
  @Roles(RolUsuario.ADMIN)
  async updatePadre(@Param('id') id: string, @Body() body: UpdatePadreDto) {
    return await this.usersService.updatePadre(id, body);
  }

  @Delete('padre/:id')
  @Roles(RolUsuario.ADMIN)
  async deletePadre(@Param('id') id: string) {
    return await this.usersService.deletePadre(id);
  }

  @Put('profesor/:id')
  @Roles(RolUsuario.ADMIN)
  async updateProfesor(@Param('id') id: string, @Body() body: UpdateProfesorDto) {
    return await this.usersService.updateProfesor(id, body);
  }

  @Delete('profesor/:id')
  @Roles(RolUsuario.ADMIN)
  async deleteProfesor(@Param('id') id: string) {
    return await this.usersService.deleteProfesor(id);
  }
}
