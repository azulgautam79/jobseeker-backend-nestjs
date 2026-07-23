import {
  BadRequestException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

import { ApplicationsModule } from '../../src/modules/applications/applications.module';
import { ApplicationsService } from '../../src/modules/applications/applications.service';

import { User } from '../../src/modules/users/schemas/user.schema';
import { Job } from '../../src/modules/jobs/schemas/job.schema';
import { Application } from '../../src/modules/applications/schemas/application.schema';

import { createIntegrationApp } from '../helpers/integration-app';
import { clearDatabase, closeDatabase } from '../helpers/database';
import { disconnectMongo } from '../helpers/mongodb-memory';

import {
  createEmployer,
  createJobSeeker,
} from '../helpers/factories/user.factory';

import { createJob } from '../helpers/factories/job.factory';
import { createApplication } from '../helpers/factories/application.factory';

import { ApplicationStatus } from '../../src/common/enums/applicationStatus';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Applications Integration', () => {
  let app: INestApplication;
  let module: TestingModule;

  let service: ApplicationsService;

  let connection: Connection;

  let userModel;
  let jobModel;
  let applicationModel;

  beforeAll(async () => {
    ({ app, module } = await createIntegrationApp([
      ApplicationsModule,
      UsersModule,
      // JobsModule
    ]));

    service = module.get(ApplicationsService);

    connection = module.get(getConnectionToken());

    userModel = module.get(getModelToken(User.name));
    jobModel = module.get(getModelToken(Job.name));
    applicationModel = module.get(getModelToken(Application.name));
  });

  afterEach(async () => {
    await clearDatabase(connection);
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase(connection);
    await disconnectMongo();
  });

  //! Apply to Job
  describe('applyToJob()', () => {
    //! 1. Shoudl apply to a job
    it('should apply to a job', async () => {
      const employer = await createEmployer(userModel);
      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      const result = await service.applyToJob(
        seeker,
        job._id.toString(),
        'resume.pdf',
      );

      expect(result.applicant.toString()).toBe(seeker._id.toString());

      expect(result.job.toString()).toBe(job._id.toString());
    });

    //! 2. Error for employer
    it('should throw for employer', async () => {
      const employer = await createEmployer(userModel);

      await expect(
        service.applyToJob(employer, new Types.ObjectId().toString()),
      ).rejects.toThrow(ForbiddenException);
    });

    //! 3. Job closed
    it('should throw if job is closed', async () => {
      const employer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer, {
        isClosed: true,
      });

      await expect(
        service.applyToJob(seeker, job._id.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    //! 4. Duplicate
    it('should not allow duplicate application', async () => {
      const employer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      await createApplication(applicationModel, seeker, job);

      await expect(
        service.applyToJob(seeker, job._id.toString()),
      ).rejects.toThrow(BadRequestException);
    });

    //! Not Found
    it('should throw if job not found', async () => {
      const seeker = await createJobSeeker(userModel);

      await expect(
        service.applyToJob(seeker, new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  //! My Applications
  describe('getMyApplications()', () => {
    it('should return my applications', async () => {
      const employer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      await createApplication(applicationModel, seeker, job);

      const apps = await service.getMyApplications(seeker._id);

      expect(apps).toHaveLength(1);
    });

    it('should return empty array', async () => {
      const seeker = await createJobSeeker(userModel);

      const apps = await service.getMyApplications(seeker._id);

      expect(apps).toEqual([]);
    });
  });

  //! Applicants for Job
  describe('getApplicantsForJob()', () => {
    it('should return applicants', async () => {
      const employer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      await createApplication(applicationModel, seeker, job);

      const apps = await service.getApplicantsForJob(
        job._id.toString(),
        employer._id,
      );

      expect(apps).toHaveLength(1);
    });

    it('should throw for another employer', async () => {
      const employer = await createEmployer(userModel);

      const employer2 = await createEmployer(userModel);

      const job = await createJob(jobModel, employer);

      await expect(
        service.getApplicantsForJob(job._id.toString(), employer2._id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  //! Application by Id
  describe('getApplicationById()', () => {
    it('should return application for applicant', async () => {
      const employer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      const application = await createApplication(
        applicationModel,
        seeker,
        job,
      );

      const result = await service.getApplicationById(
        application._id.toString(),
        seeker._id,
      );

      expect(result._id.toString()).toBe(application._id.toString());
    });

    it('should return application for employer', async () => {
      const employer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      const application = await createApplication(
        applicationModel,
        seeker,
        job,
      );

      const result = await service.getApplicationById(
        application._id.toString(),
        employer._id,
      );

      expect(result._id.toString()).toBe(application._id.toString());
    });

    it('should throw for unauthorized user', async () => {
      const employer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const anotherSeeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      const application = await createApplication(
        applicationModel,
        seeker,
        job,
      );

      await expect(
        service.getApplicationById(
          application._id.toString(),
          anotherSeeker._id,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if application not found', async () => {
      const seeker = await createJobSeeker(userModel);

      await expect(
        service.getApplicationById('685fc37ea26ebc75c37b9f31', seeker._id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  //! Update Status
  describe('updateStatus()', () => {
    it('should update status', async () => {
      const employer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      const app = await createApplication(applicationModel, seeker, job);

      const result = await service.updateStatus(
        app._id.toString(),
        employer._id,
        ApplicationStatus.ACCEPTED,
      );

      expect(result.status).toBe(ApplicationStatus.ACCEPTED);
    });

    it('should throw if application not found', async () => {
      const employer = await createEmployer(userModel);

      await expect(
        service.updateStatus(
          '685fc37ea26ebc75c37b9f31',
          employer._id,
          ApplicationStatus.ACCEPTED,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if another employer updates', async () => {
      const employer = await createEmployer(userModel);

      const anotherEmployer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      const application = await createApplication(
        applicationModel,
        seeker,
        job,
      );

      await expect(
        service.updateStatus(
          application._id.toString(),
          anotherEmployer._id,
          ApplicationStatus.ACCEPTED,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not update rejected application', async () => {
      const employer = await createEmployer(userModel);

      const seeker = await createJobSeeker(userModel);

      const job = await createJob(jobModel, employer);

      const application = await createApplication(
        applicationModel,
        seeker,
        job,
        {
          status: ApplicationStatus.REJECTED,
        },
      );

      await expect(
        service.updateStatus(
          application._id.toString(),
          employer._id,
          ApplicationStatus.ACCEPTED,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
