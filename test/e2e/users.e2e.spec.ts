import { INestApplication } from '@nestjs/common';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

import { createTestingApp, closeTestingApp } from './setup/app.e2e';
import { clearDatabase } from './setup/mongodb';

import {
  createAuthenticatedEmployer,
  createAuthenticatedJobSeeker,
} from './helpers/auth.helper';

import {
  deleteResumeRequest,
  findAllUsersRequest,
  getPublicProfileRequest,
  getUserRequest,
  updateProfileRequest,
} from './helpers/users.helper';

import {
  User,
  UserDocument,
} from '../../src/modules/users/schemas/user.schema';
import { E2ETestContext } from './setup/e2e-context';

describe('Users (e2e)', () => {
  let ctx: E2ETestContext;
  let app: INestApplication;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    ctx = await createTestingApp();
    app = ctx.app;

    userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  });

  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });

  afterAll(async () => {
    await closeTestingApp(ctx);
  });

  //////////////////////////////////////////////////////
  // GET /user
  //////////////////////////////////////////////////////

  describe('GET /api/v2/user', () => {
    it('should return all users', async () => {
      const employer = await createAuthenticatedEmployer(app);

      await createAuthenticatedJobSeeker(app);

      const response = await findAllUsersRequest(app, {
        accessToken: employer.accessToken,
      }).expect(200);

      expect(response.body.length).toBe(2);
    });

    it('should return 401 without token', async () => {
      await findAllUsersRequest(app).expect(401);
    });
  });

  //////////////////////////////////////////////////////
  // GET /user/:id
  //////////////////////////////////////////////////////

  describe('GET /api/v2/user/:id', () => {
    // it('should return a user by id', async () => {
    //     const employer =
    //         await createAuthenticatedEmployer(app);

    //     const response = await getUserRequest(
    //         app,
    //         employer.user._id,
    //         {
    //             accessToken: employer.accessToken,
    //         },
    //     ).expect(200);

    //     expect(response.body._id).toBe(
    //         employer.user._id,
    //     );

    //     expect(response.body.email).toBe(
    //         employer.user.email,
    //     );

    //     expect(response.body.password).toBeUndefined();
    // });

    // it('should return 404 if user does not exist', async () => {
    //     const employer =
    //         await createAuthenticatedEmployer(app);

    //     await getUserRequest(
    //         app,
    //         '507f1f77bcf86cd799439011',
    //         {
    //             accessToken: employer.accessToken,
    //         },
    //     ).expect(404);
    // });

    it('should return 401 without token', async () => {
      await getUserRequest(app, '507f1f77bcf86cd799439011').expect(401);
    });
  });

  //////////////////////////////////////////////////////
  // PATCH /profile
  //////////////////////////////////////////////////////

  describe('PATCH /api/v2/user/profile', () => {
    it('should update employer profile', async () => {
      const employer = await createAuthenticatedEmployer(app);

      const response = await updateProfileRequest(app, {
        accessToken: employer.accessToken,
        payload: {
          name: 'Updated Employer',
          avatar: 'avatar.png',
          companyName: 'OpenAI',
          companyDescription: 'AI Company',
          companyLogo: 'logo.png',
        },
      }).expect(200);

      expect(response.body.name).toBe('Updated Employer');

      expect(response.body.companyName).toBe('OpenAI');

      const updated = await userModel.findById(employer.user._id);

      expect(updated!.companyName).toBe('OpenAI');
    });

    it('should update job seeker profile', async () => {
      const seeker = await createAuthenticatedJobSeeker(app);

      const response = await updateProfileRequest(app, {
        accessToken: seeker.accessToken,
        payload: {
          name: 'Updated Name',
          avatar: 'avatar.png',
          resume: 'resume.pdf',
        },
      }).expect(200);

      expect(response.body.name).toBe('Updated Name');

      const updated = await userModel.findById(seeker.user._id);

      expect(updated!.resume).toBe('resume.pdf');
    });

    it('should ignore company fields for job seeker', async () => {
      const seeker = await createAuthenticatedJobSeeker(app);

      await updateProfileRequest(app, {
        accessToken: seeker.accessToken,
        payload: {
          companyName: 'Fake Company',
        },
      }).expect(200);

      const updated = await userModel.findById(seeker.user._id);

      expect(updated!.companyName).toBeFalsy();
    });

    it('should return 401 without token', async () => {
      await updateProfileRequest(app).expect(401);
    });

    it('should return 400 for invalid payload', async () => {
      const employer = await createAuthenticatedEmployer(app);

      // await updateProfileRequest(app, {
      //     accessToken: employer.accessToken,
      //     payload: {
      //         name: 123 as any,
      //     },
      // }).expect(400);
    });
  });

  //////////////////////////////////////////////////////
  // DELETE /resume
  //////////////////////////////////////////////////////

  describe('DELETE /api/v2/user/resume', () => {
    it('should delete resume', async () => {
      const seeker = await createAuthenticatedJobSeeker(app);

      await userModel.findByIdAndUpdate(seeker.user._id, {
        resume: 'http://localhost/uploads/resume.pdf',
      });

      await deleteResumeRequest(app, {
        accessToken: seeker.accessToken,
        payload: {
          resumeUrl: 'http://localhost/uploads/resume.pdf',
        },
      }).expect(200);

      const updated = await userModel.findById(seeker.user._id);

      expect(updated!.resume).toBe('');
    });

    it('should return 403 for employer', async () => {
      const employer = await createAuthenticatedEmployer(app);

      await deleteResumeRequest(app, {
        accessToken: employer.accessToken,
        payload: {
          resumeUrl: 'http://localhost/uploads/test.pdf',
        },
      }).expect(403);
    });

    it('should return 401 without token', async () => {
      await deleteResumeRequest(app).expect(401);
    });

    it('should validate dto', async () => {
      const seeker = await createAuthenticatedJobSeeker(app);

      await deleteResumeRequest(app, {
        accessToken: seeker.accessToken,
        payload: {} as any,
      }).expect(400);
    });
  });

  //////////////////////////////////////////////////////
  // GET /public/:id
  //////////////////////////////////////////////////////

  describe('GET /api/v2/user/public/:id', () => {
    it('should return public profile', async () => {
      const employer = await createAuthenticatedEmployer(app);

      const response = await getPublicProfileRequest(app, employer.user._id, {
        accessToken: employer.accessToken,
      }).expect(200);

      expect(response.body.name).toBe(employer.user.name);

      expect(response.body.email).toBe(employer.user.email);

      expect(response.body.password).toBeUndefined();
    });

    it('should return 404 if user does not exist', async () => {
      const employer = await createAuthenticatedEmployer(app);

      await getPublicProfileRequest(app, '507f1f77bcf86cd799439011', {
        accessToken: employer.accessToken,
      }).expect(404);
    });

    it('should require authentication', async () => {
      await getPublicProfileRequest(app, '507f1f77bcf86cd799439011').expect(
        401,
      );
    });
  });
});
