import { INestApplication } from '@nestjs/common';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

import { createTestingApp, closeTestingApp } from './setup/app.e2e';
import { clearDatabase } from './setup/mongodb';

import { createEmployerWithJob } from './helpers/employerWithJob.helper';

import {
  createAuthenticatedEmployer,
  createAuthenticatedJobSeeker,
} from './helpers/auth.helper';

import {
  applyToJob,
  applyToJobRequest,
  getMyApplications,
  getApplicationById,
  updateApplicationStatus,
  updateApplicationStatusRequest,
  getApplicantsForJob,
  getApplicantsForJobRequest,
  getApplicationRequest,
} from './helpers/application.helper';
import { E2ETestContext } from './setup/e2e-context';

import {
  Application,
  ApplicationDocument,
} from '../../src/modules/applications/schemas/application.schema';

import { ApplicationStatus } from '../../src/common/enums/applicationStatus';

describe('Applications (e2e)', () => {
  let ctx: E2ETestContext;
  let app: INestApplication;
  let applicationModel: Model<ApplicationDocument>;

  beforeAll(async () => {
    ctx = await createTestingApp();
    app = ctx.app;

    applicationModel = app.get<Model<ApplicationDocument>>(
      getModelToken(Application.name),
    );
  });

  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });

  afterAll(async () => {
    await closeTestingApp(ctx);
  });

  describe('POST /api/v2/applications/:jobId', () => {
    it('should allow job seeker to apply', async () => {
      const { job } = await createEmployerWithJob(app);

      const seeker = await createAuthenticatedJobSeeker(app);

      const application = await applyToJob(app, seeker.accessToken, job._id);

      expect(application._id).toBeDefined();
      expect(application.job).toBe(job._id);

      const saved = await applicationModel.findById(application._id);

      expect(saved).not.toBeNull();
    });

    it('should return 401 if token missing', async () => {
      const { job } = await createEmployerWithJob(app);

      await applyToJobRequest(app, job._id).expect(401);
    });

    it('should return 403 if employer applies', async () => {
      const { employer, job } = await createEmployerWithJob(app);

      await applyToJobRequest(app, job._id, {
        accessToken: employer.accessToken,
      }).expect(403);
    });

    it('should return 404 if job does not exist', async () => {
      const seeker = await createAuthenticatedJobSeeker(app);

      await applyToJobRequest(app, '507f191e810c19729de860ea', {
        accessToken: seeker.accessToken,
      }).expect(404);
    });

    it('should not allow duplicate application', async () => {
      const { job } = await createEmployerWithJob(app);

      const seeker = await createAuthenticatedJobSeeker(app);

      await applyToJob(app, seeker.accessToken, job._id);

      await applyToJobRequest(app, job._id, {
        accessToken: seeker.accessToken,
      }).expect(400);
    });
  });

  describe('GET /applications/me', () => {
    it('should return my applications', async () => {
      const { job } = await createEmployerWithJob(app);

      const seeker = await createAuthenticatedJobSeeker(app);

      await applyToJob(app, seeker.accessToken, job._id);

      const applications = await getMyApplications(app, seeker.accessToken);

      expect(applications.length).toBe(1);
      expect(applications[0].job.title).toBe(job.title);
    });

    it('should return empty array if none', async () => {
      const seeker = await createAuthenticatedJobSeeker(app);

      const applications = await getMyApplications(app, seeker.accessToken);

      expect(applications).toEqual([]);
    });
  });

  describe('GET /applications/job/:jobId', () => {
    it('should return applicants for employer', async () => {
      const { employer, job } = await createEmployerWithJob(app);

      const seeker = await createAuthenticatedJobSeeker(app);

      await applyToJob(app, seeker.accessToken, job._id);

      const applicants = await getApplicantsForJob(
        app,
        employer.accessToken,
        job._id,
      );

      expect(applicants.length).toBe(1);
    });

    it('should return 403 for another employer', async () => {
      const { job } = await createEmployerWithJob(app);

      const anotherEmployer = await createAuthenticatedEmployer(app);

      await getApplicantsForJobRequest(app, job._id, {
        accessToken: anotherEmployer.accessToken,
      }).expect(403);
    });
  });

  describe('GET /applications/:id', () => {
    it('should return application', async () => {
      const { employer, job } = await createEmployerWithJob(app);

      const seeker = await createAuthenticatedJobSeeker(app);

      const application = await applyToJob(app, seeker.accessToken, job._id);

      const result = await getApplicationById(
        app,
        employer.accessToken,
        application._id,
      );

      expect(result._id).toBe(application._id);
    });

    it('should return 404 if application missing', async () => {
      const employer = await createAuthenticatedEmployer(app);

      await getApplicationRequest(app, '507f191e810c19729de860ea', {
        accessToken: employer.accessToken,
      }).expect(404);
    });
  });

  describe('PATCH /applications/:id/status', () => {
    it('should update status', async () => {
      const { employer, job } = await createEmployerWithJob(app);

      const seeker = await createAuthenticatedJobSeeker(app);

      const application = await applyToJob(app, seeker.accessToken, job._id);

      const response = await updateApplicationStatus(
        app,
        employer.accessToken,
        application._id,
        ApplicationStatus.ACCEPTED,
      );

      expect(response.message).toBe('Application status updated');
    });

    it('should reject unauthorized employer', async () => {
      const { job } = await createEmployerWithJob(app);

      const seeker = await createAuthenticatedJobSeeker(app);

      const application = await applyToJob(app, seeker.accessToken, job._id);

      const anotherEmployer = await createAuthenticatedEmployer(app);

      await updateApplicationStatusRequest(app, application._id, {
        accessToken: anotherEmployer.accessToken,
        status: ApplicationStatus.ACCEPTED,
      }).expect(403);
    });

    it('should not update rejected application', async () => {
      const { employer, job } = await createEmployerWithJob(app);

      const seeker = await createAuthenticatedJobSeeker(app);

      const application = await applyToJob(app, seeker.accessToken, job._id);

      await updateApplicationStatus(
        app,
        employer.accessToken,
        application._id,
        ApplicationStatus.REJECTED,
      );

      await updateApplicationStatusRequest(app, application._id, {
        accessToken: employer.accessToken,
        status: ApplicationStatus.ACCEPTED,
      }).expect(400);
    });
  });
});
