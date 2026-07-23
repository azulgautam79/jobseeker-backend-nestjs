import * as bcrypt from 'bcrypt';

import { Role } from '../../../src/common/enums/role';

export async function createJobSeeker(userModel, overrides = {}) {
  const password = await bcrypt.hash('Password@123', 10);

  return userModel.create({
    name: 'John Doe',
    email: `jobseeker-${Date.now()}@test.com`,
    password,
    role: Role.JOBSEEKER,
    isEmailVerified: true,
    avatar: '',
    resume: '',
    ...overrides,
  });
}

export async function createEmployer(userModel, overrides = {}) {
  const password = await bcrypt.hash('Password@123', 10);

  return userModel.create({
    name: 'Employer',
    email: `employer-${Date.now()}@test.com`,
    password,
    role: Role.EMPLOYER,
    isEmailVerified: true,
    companyName: 'OpenAI',
    companyDescription: 'AI Company',
    companyLogo: '',
    ...overrides,
  });
}
