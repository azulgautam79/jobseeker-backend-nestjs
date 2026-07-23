import { ThrottlerException } from '@nestjs/throttler';

export class CustomThrottlerException extends ThrottlerException {
  constructor() {
    super('Too many attempts. Please try again later.');
  }
}
