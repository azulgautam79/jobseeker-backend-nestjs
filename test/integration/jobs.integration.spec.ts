import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';

import { TestingModule } from '@nestjs/testing';

import { getConnectionToken, getModelToken } from '@nestjs/mongoose';

import { Connection } from 'mongoose';

import { JobsModule } from '../../src/modules/jobs/jobs.module';
import { JobsService } from '../../src/modules/jobs/jobs.service';

import { Job } from '../../src/modules/jobs/schemas/job.schema';
import { Application } from '../../src/modules/applications/schemas/application.schema';
// import { SavedJob } from '../../src/modules/jobs/schemas/saved-job.schema';
import { SavedJob } from '../../src/modules/savedJobs/schemas/savedJob.schema';
import { User } from '../../src/modules/users/schemas/user.schema';

import { Role } from '../../src/common/enums/role';

import { createIntegrationApp } from '../helpers/integration-app';
import { clearDatabase, closeDatabase } from '../helpers/database';
import { disconnectMongo } from '../helpers/mongodb-memory';

import {
  createEmployer,
  createJobSeeker,
} from '../helpers/factories/user.factory';

import { createJob } from '../helpers/factories/job.factory';

import { createApplication } from '../helpers/factories/application.factory';

import { createSavedJob } from '../helpers/factories/savedJob.factory';
import { UsersModule } from '../../src/modules/users/users.module';
import { JobType } from '../../src/common/enums/jobType';

describe('Jobs Integration', () => {
  let app: INestApplication;
  let module: TestingModule;

  let service: JobsService;

  let connection: Connection;

  let jobModel;
  let applicationModel;
  let savedJobModel;
  let userModel;

  beforeAll(async () => {
    ({ app, module } = await createIntegrationApp([UsersModule, JobsModule]));

    service = module.get(JobsService);

    connection = module.get(getConnectionToken());

    jobModel = module.get(getModelToken(Job.name));

    applicationModel = module.get(getModelToken(Application.name));

    savedJobModel = module.get(getModelToken(SavedJob.name));

    userModel = module.get(getModelToken(User.name));
  });

  afterEach(async () => {
    await clearDatabase(connection);
  });

  afterAll(async () => {
    await app.close();

    await closeDatabase(connection);

    await disconnectMongo();
  });

  //! Create
  describe('create()', () => {
    it('should create a job', async () => {
      const employer = await createEmployer(userModel);

      const dto = {
        title: 'Backend Developer',
        description: 'NestJS',
        location: 'Kathmandu',
        requirements: 'NestJS,MongoDB',
        category: 'IT',
        type: JobType.FULL_TIME,
        salaryMin: 50000,
        salaryMax: 100000,
      };

      const job = await service.create(dto as any, employer);

      expect(job.title).toBe(dto.title);

      const dbJob = await jobModel.findById(job._id);

      expect(dbJob).not.toBeNull();
    });

    it('should throw for jobseeker', async () => {
      const seeker = await createJobSeeker(userModel);

      await expect(service.create({} as any, seeker)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  //! Find All
  describe('findAll()', () => {
    it('should return jobs', async () => {
      const employer = await createEmployer(userModel);

      await createJob(jobModel, employer);

      const jobs = await service.findAll({});

      expect(jobs).toHaveLength(1);
    });

    it('should filter by keyword', async () => {
      const employer = await createEmployer(userModel);

      await createJob(jobModel, employer, {
        title: 'NestJS Developer',
      });

      await createJob(jobModel, employer, {
        title: 'React Developer',
      });

      const jobs = await service.findAll({
        keyword: 'Nest',
      });

      expect(jobs).toHaveLength(1);
    });
  });

  //! Jobs without filter
  describe('findJobsWithoutFilters()', () => {
    it('should return open jobs only', async () => {
      const employer = await createEmployer(userModel);

      await createJob(jobModel, employer);

      await createJob(jobModel, employer, {
        isClosed: true,
      });

      const jobs = await service.findJobsWithoutFilters();

      expect(jobs).toHaveLength(1);
    });
  });

  //! Find Employer Jobs
  describe('findEmployerJobs()', () => {
    it('should return employer jobs', async () => {
      const employer = await createEmployer(userModel);

      await createJob(jobModel, employer);

      const jobs = await service.findEmployerJobs(employer);

      expect(jobs).toHaveLength(1);
    });

    it('should throw for jobseeker', async () => {
      const seeker = await createJobSeeker(userModel);

      await expect(service.findEmployerJobs(seeker)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  //! Find One
  describe('findOne()', () => {
    it('should return job', async () => {
      const employer = await createEmployer(userModel);

      const job = await createJob(jobModel, employer);

      const result = await service.findOne(job._id.toString());

      expect(result.title).toBe(job.title);
    });

    it('should throw if job not found', async () => {
      await expect(service.findOne('685fc37ea26ebc75c37b9f31')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  //! Update
  describe('update()', () => {
    it('should update job', async () => {
      const employer = await createEmployer(userModel);

      const job = await createJob(jobModel, employer);

      const updated = await service.update(
        job._id.toString(),
        {
          title: 'Updated',
        },
        employer,
      );

      expect(updated.title).toBe('Updated');
    });

    it('should throw if another employer updates', async () => {
      const employer1 = await createEmployer(userModel);

      const employer2 = await createEmployer(userModel);

      const job = await createJob(jobModel, employer1);

      await expect(
        service.update(job._id.toString(), {}, employer2),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  //! Remove
  describe('remove()', () => {
    it('should delete job', async () => {
      const employer = await createEmployer(userModel);

      const job = await createJob(jobModel, employer);

      const result = await service.remove(job._id.toString(), employer);

      expect(result.message).toBe('Job deleted successfully');
    });
  });

  //! Toggle Close
  describe('toggleClose()', () => {
    it('should close job', async () => {
      const employer = await createEmployer(userModel);

      const job = await createJob(jobModel, employer);

      await service.toggleClose(job._id.toString(), employer);

      const updated = await jobModel.findById(job._id);

      expect(updated.isClosed).toBe(true);
    });

    it('should reopen job', async () => {
      const employer = await createEmployer(userModel);

      const job = await createJob(jobModel, employer, {
        isClosed: true,
      });

      await service.toggleClose(job._id.toString(), employer);

      const updated = await jobModel.findById(job._id);

      expect(updated.isClosed).toBe(false);
    });
  });
});
