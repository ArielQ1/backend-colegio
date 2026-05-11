import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || message;
      error = exception.name;
    } else if (this.isPrismaError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      message = this.handlePrismaError(exception);
      error = 'Database Error';
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json(errorResponse);
  }

  private isPrismaError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && typeof (error as any).code === 'string';
  }

  private handlePrismaError(exception: any): string {
    switch (exception.code) {
      case 'P2002':
        return 'Ya existe un registro con estos datos únicos';
      case 'P2003':
        return 'El registro referenciado no existe';
      case 'P2025':
        return 'El registro no fue encontrado';
      case 'P2014':
        return 'La relación viola una restricción';
      case 'P2000':
        return 'El valor excede el límite del campo';
      default:
        return 'Error de base de datos';
    }
  }
}