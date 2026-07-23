import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../../../src/modules/users/schemas/user.schema';
import { buildEmployerFixture } from '../fixtures/employer.fixture';
import { buildJobSeekerFixture } from '../fixtures/jobseeker.fixture';
import { LoginResponseDto } from '../../../src/modules/auth/dto/login-response.dto';
import { RegisterDto } from '../../../src/modules/auth/dto/register.dto';

export interface LoginResponse {
  accessToken: string;
  refreshCookie: string;
  user: any;
}

export interface AuthenticatedEmployer extends LoginResponse {
  employer: RegisterDto;
}

export interface AuthenticatedJobSeeker extends LoginResponse {
  seeker: RegisterDto;
}

//! Register Employer
export async function registerEmployer(app: INestApplication) {
  const employer = buildEmployerFixture();

  await request(app.getHttpServer())
    .post('/api/v2/auth/register')
    .send(employer)
    .expect(201);

  return employer;
}

//! Register JobSeeker
export async function registerJobSeeker(app: INestApplication) {
  const jobSeeker = buildJobSeekerFixture();

  await request(app.getHttpServer())
    .post('/api/v2/auth/register')
    .send(jobSeeker)
    .expect(201);

  return jobSeeker;
}

//! Verify User
export async function verifyUser(app: INestApplication, email: string) {
  const userModel = app.get<Model<User>>(getModelToken(User.name));

  await userModel.updateOne(
    { email },
    {
      isEmailVerified: true,
    },
  );
}

//! Login
export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await request(app.getHttpServer())
    .post('/api/v2/auth/login')
    .send({
      email,
      password,
      rememberMe: false,
    })
    .expect(200);

  const cookies = response.headers['set-cookie'];

  const refreshCookie = Array.isArray(cookies)
    ? (cookies.find((cookie) => cookie.startsWith('refreshToken=')) ?? '')
    : (cookies ?? '');

  return {
    accessToken: response.body.accessToken,
    refreshCookie,
    user: response.body.user,
  };
}

//! Authenticated Employer
export async function createAuthenticatedEmployer(
  app: INestApplication,
): Promise<AuthenticatedEmployer> {
  const employer = await registerEmployer(app);

  await verifyUser(app, employer.email);

  const auth = await login(app, employer.email, employer.password);

  return {
    employer,
    accessToken: auth.accessToken,
    refreshCookie: auth.refreshCookie,
    user: auth.user,
  };
}

//! Authenticated JobSeeker
export async function createAuthenticatedJobSeeker(
  app: INestApplication,
): Promise<AuthenticatedJobSeeker> {
  const seeker = await registerJobSeeker(app);

  await verifyUser(app, seeker.email);

  const auth = await login(app, seeker.email, seeker.password);

  return {
    seeker,
    accessToken: auth.accessToken,
    refreshCookie: auth.refreshCookie,
    user: auth.user,
  };
}
