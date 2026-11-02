import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      const errors =
        typeof body === 'object'
          ? (body as { errors?: unknown }).errors
          : undefined;
      response
        .status(statusCode)
        .json({ statusCode, message: exception.message, errors });
      return;
    }

    this.logger.error(exception);
    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(statusCode).json({
      statusCode,
      message: 'Something went wrong on our side. Please try again',
    });
  }
}
