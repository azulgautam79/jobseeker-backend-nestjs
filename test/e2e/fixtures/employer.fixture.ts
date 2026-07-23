import { Role } from '../../../src/common/enums/role';
import { RegisterDto } from '../../../src/modules/auth/dto/register.dto';
import { randomUUID } from 'crypto';

export const employerFixture: RegisterDto = {
  name: 'Test Employer',
  email: 'employer@test.com',
  password: 'Password@123',
  role: Role.EMPLOYER,
};

export function buildEmployerFixture() {
  return {
    ...employerFixture,
    email: `employer-${randomUUID()}@test.com`,
  };
}
