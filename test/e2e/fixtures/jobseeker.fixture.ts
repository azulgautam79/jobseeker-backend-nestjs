import { Role } from '../../../src/common/enums/role';
import { RegisterDto } from '../../../src/modules/auth/dto/register.dto';
import { randomUUID } from 'crypto';

export const jobSeekerFixture: RegisterDto = {
  name: 'John Doe',
  email: 'jobseeker@test.com',
  password: 'Password@123',
  role: Role.JOBSEEKER,
};

export function buildJobSeekerFixture() {
  return {
    ...jobSeekerFixture,
    email: `jobseeker-${randomUUID()}@test.com`,
  };
}
