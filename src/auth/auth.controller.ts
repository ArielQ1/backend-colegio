import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginAuthDto } from './dto/login-auth.dto';

type AuthenticatedRequest = ExpressRequest & {
  user?: {
    sub: string;
    rol: string;
    id_persona: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: CreateAuthDto) {
    return await this.authService.registerUser(body);
  }

  @Post('login')
  async login(@Body() body: LoginAuthDto) {
    return await this.authService.login(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  async getPerfil(@Req() req: AuthenticatedRequest) {
    return {
      mensaje: 'Entraste a la zona VIP del colegio',
      datos_del_usuario: req.user,
    };
  }
}
