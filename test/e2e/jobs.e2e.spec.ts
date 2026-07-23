import { INestApplication } from '@nestjs/common';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

import { createTestingApp, closeTestingApp } from './setup/app.e2e';
import { clearDatabase } from './setup/mongodb';

import {
  createAuthenticatedEmployer,
  createAuthenticatedJobSeeker,
} from './helpers/auth.helper';
import { E2ETestContext } from './setup/e2e-context';
import { createJob, createJobRequest } from './helpers/jobs.helper';
import { createEmployerWithJob } from './helpers/employerWithJob.helper';

import { jobFixture } from './fixtures/job.fixture';
import {
  getJobRequest,
  updateJobRequest,
  deleteJobRequest,
  toggleCloseJobRequest,
  getJobsRequest,
  toggleCloseJob,
  getEmployerJobsRequest,
} from './helpers/jobs.helper';

import { Job, JobDocument } from '../../src/modules/jobs/schemas/job.schema';

describe('Jobs (e2e)', () => {
  let ctx: E2ETestContext;
  let app: INestApplication;
  let jobModel: Model<JobDocument>;

  beforeAll(async () => {
    ctx = await createTestingApp();
    app = ctx.app;

    jobModel = app.get<Model<JobDocument>>(getModelToken(Job.name));
  });

  beforeEach(async () => {
    await clearDatabase(ctx.connection);
  });

  afterAll(async () => {
    await closeTestingApp(ctx);
  });

  //! POST Request Cases
  describe('POST /api/v2/jobs', () => {
    it('should allow employer to create a job', async () => {
      const employer = await createAuthenticatedEmployer(app);

      const job = await createJob(app, employer.accessToken);

      expect(job).toBeDefined();
      expect(job._id).toBeDefined();
      expect(job.title).toBe(jobFixture.title);

      const created = await jobModel.findById(job._id);

      expect(created).not.toBeNull();
      expect(created!.title).toBe(jobFixture.title);
      expect(created!.company.toString()).toBe(employer.user._id);
    });

    it('should return 401 if token is missing', async () => {
      await createJobRequest(app).expect(401);
    });

    it('should return 401 if token is invalid', async () => {
      await createJobRequest(app, {
        accessToken: 'invalid-token',
      }).expect(401);
    });

    it('should return 403 if job seeker tries to create a job', async () => {
      const seeker = await createAuthenticatedJobSeeker(app);

      await createJobRequest(app, {
        accessToken: seeker.accessToken,
      }).expect(403);
    });

    it('should return 400 if title is missing', async () => {
      const employer = await createAuthenticatedEmployer(app);

      const payload = {
        ...jobFixture,
      };

      delete (payload as any).title;

      await createJobRequest(app, {
        accessToken: employer.accessToken,
        payload,
      }).expect(400);
    });

    it('should return 400 if title is empty', async () => {
      const employer = await createAuthenticatedEmployer(app);

      await createJobRequest(app, {
        accessToken: employer.accessToken,
        payload: {
          ...jobFixture,
          title: '',
        },
      }).expect(400);
    });

    it('should return 400 if salaryMax is less than salaryMin', async () => {
      const employer = await createAuthenticatedEmployer(app);

      await createJobRequest(app, {
        accessToken: employer.accessToken,
        payload: {
          ...jobFixture,
          salaryMin: 100000,
          salaryMax: 50000,
        },
      }).expect(400);
    });
  });

  //! GET /jobs
  describe('GET /api/v2/jobs', () => {
    it('should return all jobs', async () => {
      const employer = await createEmployerWithJob(app);

      const response = await getJobsRequest(app).expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe(jobFixture.title);
    });

    it('should filter jobs by keyword', async () => {
      await createEmployerWithJob(app);

      const response = await getJobsRequest(app, {
        query: {
          keyword: 'Backend',
        },
      }).expect(200);

      expect(response.body.length).toBe(1);
    });

    it('should return empty array when keyword does not match', async () => {
      await createEmployerWithJob(app);

      const response = await getJobsRequest(app, {
        query: {
          keyword: 'Flutter',
        },
      }).expect(200);

      expect(response.body).toEqual([]);
    });

    it('should filter by location', async () => {
      await createEmployerWithJob(app);

      const response = await getJobsRequest(app, {
        query: {
          location: jobFixture.location,
        },
      }).expect(200);

      expect(response.body.length).toBe(1);
    });

    it('should filter by category', async () => {
      await createEmployerWithJob(app);

      const response = await getJobsRequest(app, {
        query: {
          category: jobFixture.category,
        },
      }).expect(200);

      expect(response.body.length).toBe(1);
    });

    it('should filter by type', async () => {
      await createEmployerWithJob(app);

      const response = await getJobsRequest(app, {
        query: {
          type: jobFixture.type,
        },
      }).expect(200);

      expect(response.body.length).toBe(1);
    });

    it('should filter by salary range', async () => {
      await createEmployerWithJob(app);

      const response = await getJobsRequest(app, {
        query: {
          minSalary: 40000,
          maxSalary: 80000,
        },
      }).expect(200);

      expect(response.body.length).toBe(1);
    });

    it('should not return closed jobs', async () => {
      const employer = await createEmployerWithJob(app);

      await toggleCloseJob(
        app,
        employer.employer.accessToken,
        employer.job._id,
      );

      const response = await getJobsRequest(app).expect(200);

      expect(response.body).toEqual([]);
    });
  });

  //! GET /jobs/:id
  describe('GET /api/v2/jobs/:id', () => {
    it('should return a single job', async () => {
      const employer = await createEmployerWithJob(app);

      const response = await getJobRequest(app, employer.job._id).expect(200);

      expect(response.body._id).toBe(employer.job._id);
    });

    it('should return 404 if job does not exist', async () => {
      await getJobRequest(app, '6842d4dfb97d79dfe6c12345').expect(404);
    });

    it('should include applicationStatus as null', async () => {
      const employer = await createEmployerWithJob(app);

      const response = await getJobRequest(app, employer.job._id).expect(200);

      expect(response.body.applicationStatus).toBeNull();
    });
  });

  //! GET /jobs/get-jobs-employer
  describe('GET /api/v2/jobs/get-jobs-employer', () => {
    it('should return employer jobs', async () => {
      const employer = await createEmployerWithJob(app);

      const response = await getEmployerJobsRequest(app, {
        accessToken: employer.employer.accessToken,
      }).expect(200);

      expect(response.body.length).toBe(1);
    });

    it('should return 401 without token', async () => {
      await getEmployerJobsRequest(app).expect(401);
    });

    it('should return 403 for job seeker', async () => {
      const seeker = await createAuthenticatedJobSeeker(app);

      await getEmployerJobsRequest(app, {
        accessToken: seeker.accessToken,
      }).expect(403);
    });
  });

  //! PATCH /jobs/:id
  describe('PATCH /api/v2/jobs/:id', () => {
    it('should update a job', async () => {
      const employer = await createEmployerWithJob(app);

      const response = await updateJobRequest(app, {
        accessToken: employer.employer.accessToken,
        jobId: employer.job._id,
        payload: {
          title: 'Updated Title',
        },
      }).expect(200);

      expect(response.body.title).toBe('Updated Title');
    });

    it('should return 401 without token', async () => {
      const employer = await createEmployerWithJob(app);

      await updateJobRequest(app, {
        jobId: employer.job._id,
        payload: {
          title: 'Updated',
        },
      }).expect(401);
    });

    it('should return 403 when another employer updates the job', async () => {
      const employer1 = await createEmployerWithJob(app);

      const employer2 = await createAuthenticatedEmployer(app);

      await updateJobRequest(app, {
        accessToken: employer2.accessToken,
        jobId: employer1.job._id,
        payload: {
          title: 'Hack',
        },
      }).expect(403);
    });

    it('should return 404 for invalid job id', async () => {
      const employer = await createAuthenticatedEmployer(app);

      await updateJobRequest(app, {
        accessToken: employer.accessToken,
        jobId: '6842d4dfb97d79dfe6c12345',
        payload: {
          title: 'Updated',
        },
      }).expect(404);
    });
  });

  //! PATCH /jobs/:id/toggle-close
  describe('PATCH /api/v2/jobs/:id/toggle-close', () => {
    it('should close a job', async () => {
      const employer = await createEmployerWithJob(app);

      await toggleCloseJobRequest(app, {
        accessToken: employer.employer.accessToken,
        jobId: employer.job._id,
      }).expect(200);

      const job = await jobModel.findById(employer.job._id);

      expect(job?.isClosed).toBe(true);
    });

    it('should reopen a job', async () => {
      const employer = await createEmployerWithJob(app);

      await toggleCloseJobRequest(app, {
        accessToken: employer.employer.accessToken,
        jobId: employer.job._id,
      });

      await toggleCloseJobRequest(app, {
        accessToken: employer.employer.accessToken,
        jobId: employer.job._id,
      });

      const job = await jobModel.findById(employer.job._id);

      expect(job?.isClosed).toBe(false);
    });

    it('should return 403 for another employer', async () => {
      const employer1 = await createEmployerWithJob(app);

      const employer2 = await createAuthenticatedEmployer(app);

      await toggleCloseJobRequest(app, {
        accessToken: employer2.accessToken,
        jobId: employer1.job._id,
      }).expect(403);
    });
  });

  //! DELETE /jobs/:id
  describe('DELETE /api/v2/jobs/:id', () => {
    it('should delete a job', async () => {
      const employer = await createEmployerWithJob(app);

      await deleteJobRequest(app, {
        accessToken: employer.employer.accessToken,
        jobId: employer.job._id,
      }).expect(200);

      const job = await jobModel.findById(employer.job._id);

      expect(job).toBeNull();
    });

    it('should return 401 without token', async () => {
      const employer = await createEmployerWithJob(app);

      await deleteJobRequest(app, {
        jobId: employer.job._id,
      }).expect(401);
    });

    it('should return 403 for another employer', async () => {
      const employer1 = await createEmployerWithJob(app);

      const employer2 = await createAuthenticatedEmployer(app);

      await deleteJobRequest(app, {
        accessToken: employer2.accessToken,
        jobId: employer1.job._id,
      }).expect(403);
    });

    it('should return 404 if job does not exist', async () => {
      const employer = await createAuthenticatedEmployer(app);

      await deleteJobRequest(app, {
        accessToken: employer.accessToken,
        jobId: '6842d4dfb97d79dfe6c12345',
      }).expect(404);
    });
  });
});
