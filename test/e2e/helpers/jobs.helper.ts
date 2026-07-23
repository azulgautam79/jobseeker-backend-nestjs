import request from 'supertest';
import { INestApplication } from '@nestjs/common';

import { jobFixture } from '../fixtures/job.fixture';
import { CreateJobDto } from '../../../src/modules/jobs/dto/create-job.dto';
import { UpdateJobDto } from '../../../src/modules/jobs/dto/update-job.dto';

export function createJobRequest(
  app: INestApplication,
  options?: {
    accessToken?: string;
    payload?: Partial<CreateJobDto>;
  },
) {
  const req = request(app.getHttpServer()).post('/api/v2/jobs');

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req.send(options?.payload ?? jobFixture);
}

export async function createJob(
  app: INestApplication,
  accessToken: string,
  payload: CreateJobDto = jobFixture,
) {
  const response = await request(app.getHttpServer())
    .post('/api/v2/jobs')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(201);

  return response.body;
}

export function getJobsRequest(
  app: INestApplication,
  options?: {
    query?: Record<string, any>;
  },
) {
  const req = request(app.getHttpServer()).get('/api/v2/jobs');

  if (options?.query) {
    req.query(options.query);
  }

  return req;
}

export async function getAllJobs(
  app: INestApplication,
  query?: Record<string, any>,
) {
  const response = await request(app.getHttpServer())
    .get('/api/v2/jobs')
    .query(query ?? {})
    .expect(200);

  return response.body;
}

export function getJobRequest(
  app: INestApplication,
  jobId: string,
  options?: {
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).get(`/api/v2/jobs/${jobId}`);

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function getJobById(
  app: INestApplication,
  id: string,
  userId?: string,
) {
  const response = await request(app.getHttpServer())
    .get(`/api/v2/jobs/${id}`)
    .query(userId ? { userId } : {})
    .expect(200);

  return response.body;
}

export async function getJobsWithoutFilters(app: INestApplication) {
  const response = await request(app.getHttpServer())
    .get('/api/v2/jobs/without-filters')
    .expect(200);

  return response.body;
}

export function getEmployerJobsRequest(
  app: INestApplication,
  options?: {
    accessToken?: string;
    query?: Record<string, any>;
  },
) {
  const req = request(app.getHttpServer()).get(
    '/api/v2/jobs/get-jobs-employer',
  );

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  if (options?.query) {
    req.query(options.query);
  }

  return req;
}

export async function getEmployerJobs(
  app: INestApplication,
  accessToken: string,
) {
  const response = await request(app.getHttpServer())
    .get('/api/v2/jobs/get-jobs-employer')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return response.body;
}

export function updateJobRequest(
  app: INestApplication,
  options: {
    jobId: string;
    accessToken?: string;
    payload?: Partial<UpdateJobDto>;
  },
) {
  const req = request(app.getHttpServer()).patch(
    `/api/v2/jobs/${options.jobId}`,
  );

  if (options.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req.send(options.payload ?? {});
}

export async function updateJob(
  app: INestApplication,
  accessToken: string,
  id: string,
  payload: UpdateJobDto,
) {
  const response = await request(app.getHttpServer())
    .patch(`/api/v2/jobs/${id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(200);

  return response.body;
}

export function toggleCloseJobRequest(
  app: INestApplication,
  options: {
    jobId: string;
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).patch(
    `/api/v2/jobs/${options.jobId}/toggle-close`,
  );

  if (options.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function toggleCloseJob(
  app: INestApplication,
  accessToken: string,
  id: string,
) {
  const response = await request(app.getHttpServer())
    .patch(`/api/v2/jobs/${id}/toggle-close`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return response.body;
}

export function deleteJobRequest(
  app: INestApplication,
  options: {
    jobId: string;
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).delete(
    `/api/v2/jobs/${options.jobId}`,
  );

  if (options.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function deleteJob(
  app: INestApplication,
  accessToken: string,
  id: string,
) {
  const response = await request(app.getHttpServer())
    .delete(`/api/v2/jobs/${id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return response.body;
}
