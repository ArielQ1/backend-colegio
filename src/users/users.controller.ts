import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { RolUsuario } from '../generated/prisma/enums';
import { CreatePadreDto } from './dto/create-padre.dto';
import { VincularFamiliarDto } from './dto/vincular-familiar.dto';
import { CreateProfesorDto } from './dto/create-profesor.dto';
import { PaginationDto } from '../common/pagination.dto';

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
  async getAllEstudiantes(@Query() pagination: PaginationDto) {
    return await this.usersService.getAllEstudiantes(pagination);
  }

  @Get('estudiantes/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.PROFESOR, RolUsuario.PADRE)
  async getEstudianteById(@Query('id') id: string) {
    return await this.usersService.getEstudianteById(id);
  }

  @Get('padres')
  @Roles(RolUsuario.ADMIN)
  async getAllPadres(@Query() pagination: PaginationDto) {
    return await this.usersService.getAllPadres(pagination);
  }

  @Get('profesores')
  @Roles(RolUsuario.ADMIN)
  async getAllProfesores(@Query() pagination: PaginationDto) {
    return await this.usersService.getAllProfesores(pagination);
  }
}