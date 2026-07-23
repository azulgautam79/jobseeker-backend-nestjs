import request from 'supertest';
import { INestApplication } from '@nestjs/common';

import { ApplicationStatus } from '../../../src/common/enums/applicationStatus';

export function applyToJobRequest(
  app: INestApplication,
  jobId: string,
  options?: {
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).post(
    `/api/v2/applications/${jobId}`,
  );

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function applyToJob(
  app: INestApplication,
  accessToken: string,
  jobId: string,
) {
  const response = await applyToJobRequest(app, jobId, {
    accessToken,
  }).expect(201);

  return response.body;
}

export function getMyApplicationsRequest(
  app: INestApplication,
  options?: {
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).get('/api/v2/applications/me');

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function getMyApplications(
  app: INestApplication,
  accessToken: string,
) {
  const response = await getMyApplicationsRequest(app, {
    accessToken,
  }).expect(200);

  return response.body;
}

export function getApplicantsRequest(
  app: INestApplication,
  jobId: string,
  options?: {
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).get(
    `/api/v2/applications/job/${jobId}`,
  );

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function getApplicants(
  app: INestApplication,
  accessToken: string,
  jobId: string,
) {
  const response = await getApplicantsRequest(app, jobId, {
    accessToken,
  }).expect(200);

  return response.body;
}

export function getApplicationRequest(
  app: INestApplication,
  applicationId: string,
  options?: {
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).get(
    `/api/v2/applications/${applicationId}`,
  );

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function getApplicationById(
  app: INestApplication,
  accessToken: string,
  applicationId: string,
) {
  const response = await getApplicationRequest(app, applicationId, {
    accessToken,
  }).expect(200);

  return response.body;
}

export function updateApplicationStatusRequest(
  app: INestApplication,
  applicationId: string,
  options?: {
    accessToken?: string;
    status?: ApplicationStatus;
  },
) {
  const req = request(app.getHttpServer()).patch(
    `/api/v2/applications/${applicationId}/status`,
  );

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req.send({
    status: options?.status,
  });
}

export async function updateApplicationStatus(
  app: INestApplication,
  accessToken: string,
  applicationId: string,
  status: ApplicationStatus,
) {
  const response = await updateApplicationStatusRequest(app, applicationId, {
    accessToken,
    status,
  }).expect(200);

  return response.body;
}

export function getApplicantsForJobRequest(
  app: INestApplication,
  jobId: string,
  options?: {
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).get(
    `/api/v2/applications/job/${jobId}`,
  );

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function getApplicantsForJob(
  app: INestApplication,
  accessToken: string,
  jobId: string,
) {
  const response = await request(app.getHttpServer())
    .get(`/api/v2/applications/job/${jobId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return response.body;
}
