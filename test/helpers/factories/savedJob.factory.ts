export async function createSavedJob(
  savedJobModel,
  jobseeker,
  job,
  overrides = {},
) {
  return await savedJobModel.create({
    jobseeker: jobseeker._id,
    job: job._id,
    ...overrides,
  });
}
