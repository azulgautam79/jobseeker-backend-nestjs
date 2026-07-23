// src/common/cache/cache.keys.ts

export const CacheKeys = {
  jobs: () => 'jobs',

  job: (jobId: string) => `job:${jobId}`,

  employerJobs: (employerId: string) => `employer-jobs:${employerId}`,

  recommendations: (userId: string) => `recommendations:${userId}`,

  categories: () => 'categories',

  skills: () => 'skills',
};
