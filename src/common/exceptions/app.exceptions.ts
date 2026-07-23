import { HttpException } from '@nestjs/common';

export class AppException extends HttpException {
  public readonly errorStatus: 'fail' | 'error';
  public readonly isOperational = true;

  constructor(message: string, statusCode: number) {
    super(message, statusCode);

    this.errorStatus = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  }
}
