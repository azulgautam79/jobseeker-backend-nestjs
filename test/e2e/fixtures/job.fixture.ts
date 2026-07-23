import { CreateJobDto } from '../../../src/modules/jobs/dto/create-job.dto';

import { JobType } from '../../../src/common/enums/jobType';

export const jobFixture: CreateJobDto = {
  title: 'Backend Developer',
  description: 'NestJS Developer',
  location: 'Kathmandu',
  category: 'Engineering',
  type: JobType.FULL_TIME,
  salaryMin: 50000,
  salaryMax: 100000,
  requirements: 'NodeJS,NestJS ,MongoDB',
};
