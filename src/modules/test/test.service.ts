import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
  InternalServerErrorException,
} from '@nestjs/common';
import { trace } from '@opentelemetry/api';

@Injectable()
export class TestService {
  private getRandomValue<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private throwRandomHttpError(): never {
    const errors = [
      () => new BadRequestException('400 – Invalid request payload'),
      () => new UnauthorizedException('401 – Unauthorized'),
      () => new ForbiddenException('403 – Forbidden'),
      () => new NotFoundException('404 – Resource not found'),
      () => new PayloadTooLargeException('413 – Payload too large'),
      () => new InternalServerErrorException('500 – DB Server Down'),
    ];

    throw this.getRandomValue(errors)();
  }

  private async doSomeHeavyTask(): Promise<number> {
    const ms = this.getRandomValue([100, 200, 300, 500, 1000, 2000]);

    await new Promise((resolve) => setTimeout(resolve, ms));

    // 50% chance AFTER delay
    if (Math.random() < 0.5) {
      this.throwRandomHttpError();
    }

    return ms;
  }

  //! Slow endpoint that simulates a heavy task and randomly throws HTTP errors
  async slow() {
    const tracer = trace.getTracer('nestjs-service');
    const span = tracer.startSpan('slowEndpoint');
    const timeTaken = await this.doSomeHeavyTask();

    span.end();
    return {
      status: 'Success',
      message: `Task completed in ${timeTaken} ms`,
    };
  }

  //! Fast endpoint that randomly throws HTTP errors without delay
  fast() {
    if (Math.random() < 0.15) {
      this.throwRandomHttpError();
    }

    return {
      status: 'Success',
      message: 'Fast task completed instantly',
    };
  }
}
