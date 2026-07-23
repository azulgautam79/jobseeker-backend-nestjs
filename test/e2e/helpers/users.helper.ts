import request from 'supertest';
import { INestApplication } from '@nestjs/common';

import { UpdateProfileDto } from '../../../src/modules/users/dto/update-profile.dto';
import { DeleteResumeDto } from '../../../src/modules/users/dto/delete-resume.dto';

//
// GET /user
//

export function findAllUsersRequest(
  app: INestApplication,
  options?: {
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).get('/api/v2/user');

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function findAllUsers(app: INestApplication, accessToken: string) {
  const response = await request(app.getHttpServer())
    .get('/api/v2/user')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return response.body;
}

//
// GET /user/:id
//

export function getUserRequest(
  app: INestApplication,
  userId: string,
  options?: {
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).get(`/api/v2/user/${userId}`);

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function getUser(
  app: INestApplication,
  accessToken: string,
  userId: string,
) {
  const response = await request(app.getHttpServer())
    .get(`/api/v2/user/${userId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return response.body;
}

//
// PATCH /user/profile
//

export function updateProfileRequest(
  app: INestApplication,
  options?: {
    accessToken?: string;
    payload?: Partial<UpdateProfileDto>;
  },
) {
  const req = request(app.getHttpServer()).patch('/api/v2/user/profile');

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req.send(options?.payload ?? {});
}

export async function updateProfile(
  app: INestApplication,
  accessToken: string,
  payload: UpdateProfileDto,
) {
  const response = await request(app.getHttpServer())
    .patch('/api/v2/user/profile')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(200);

  return response.body;
}

//
// DELETE /user/resume
//

export function deleteResumeRequest(
  app: INestApplication,
  options?: {
    accessToken?: string;
    payload?: Partial<DeleteResumeDto>;
  },
) {
  const req = request(app.getHttpServer()).delete('/api/v2/user/resume');

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req.send(options?.payload ?? {});
}

export async function deleteResume(
  app: INestApplication,
  accessToken: string,
  payload: DeleteResumeDto,
) {
  const response = await request(app.getHttpServer())
    .delete('/api/v2/user/resume')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload)
    .expect(200);

  return response.body;
}

//
// GET /user/public/:id
//

export function getPublicProfileRequest(
  app: INestApplication,
  userId: string,
  options?: {
    accessToken?: string;
  },
) {
  const req = request(app.getHttpServer()).get(`/api/v2/user/public/${userId}`);

  if (options?.accessToken) {
    req.set('Authorization', `Bearer ${options.accessToken}`);
  }

  return req;
}

export async function getPublicProfile(
  app: INestApplication,
  accessToken: string,
  userId: string,
) {
  const response = await request(app.getHttpServer())
    .get(`/api/v2/user/public/${userId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return response.body;
}
