import { INestApplication } from '@nestjs/common';
import { createAuthenticatedEmployer } from './auth.helper';
import { createJob } from './jobs.helper';

export async function createEmployerWithJob(app: INestApplication) {
  const employer = await createAuthenticatedEmployer(app);

  const job = await createJob(app, employer.accessToken);

  return {
    employer,
    job,
  };
}
