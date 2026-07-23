import { INestApplication } from '@nestjs/common';

import { createAuthenticatedJobSeeker } from './auth.helper';
import { applyToJob } from './application.helper';
import { createEmployerWithJob } from './employerWithJob.helper';

export async function createEmployerWithApplication(app: INestApplication) {
  const employer = await createEmployerWithJob(app);

  const seeker = await createAuthenticatedJobSeeker(app);

  const application = await applyToJob(
    app,
    seeker.accessToken,
    employer.job._id,
  );

  return {
    employer,
    seeker,
    application,
    job: employer.job,
  };
}
