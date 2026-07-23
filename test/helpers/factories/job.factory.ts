// import { JobCategory } from '../../../src/common/enums/job-category';
// import { JobType } from '../../../src/common/enums/job-type';
import { JobType } from '../../../src/common/enums/jobType';

export async function createJob(jobModel, employer, overrides = {}) {
  return await jobModel.create({
    title: 'Backend Developer',
    description: 'Node.js + NestJS developer',
    requirements: 'NestJS,MongoDB',
    location: 'Kathmandu',
    category: 'Engineering',
    type: JobType.FULL_TIME,
    salaryMin: 50000,
    salaryMax: 100000,
    company: employer._id,
    isClosed: false,
    ...overrides,
  });
}
