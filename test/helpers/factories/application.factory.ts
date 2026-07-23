import { ApplicationStatus } from '../../../src/common/enums/applicationStatus';

export async function createApplication(
  applicationModel,
  applicant,
  job,
  overrides = {},
) {
  return await applicationModel.create({
    applicant: applicant._id,
    job: job._id,
    status: ApplicationStatus.IN_REVIEW,
    resume: '',
    coverLetter: '',
    ...overrides,
  });
}
