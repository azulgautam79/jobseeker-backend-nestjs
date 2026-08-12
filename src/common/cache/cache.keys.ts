// src/common/cache/cache.keys.ts

import { OtpType } from "../enums/otpType";

export const CacheKeys = {
  jobs: () => 'jobs',

  job: (jobId: string) => `job:${jobId}`,

  employerJobs: (employerId: string) => `employer-jobs:${employerId}`,

  recommendations: (userId: string) => `recommendations:${userId}`,

  categories: () => 'categories',

  skills: () => 'skills',

  myApplications(userId: string) {
    return `applications:user:${userId}`
  },

  jobApplicants(jobId: string) {
    return `applications:job:${jobId}`
  },

  //! Otp Keys
  otp(userId: string, type: OtpType) {
    return `otp:${type}:${userId}`
  },

  refresh(userId: string) {
    return `refresh:${userId}`
  },

  profile(userId: string) {
    return `profile:${userId}`
  },

  analytics(companyId: string) {
    return `analytics:${companyId}`
  }
};
