import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { ApplicationsService } from './applications.service';
import { Application } from './schemas/application.schema';
import { ApplicationStatus } from '../../common/enums/applicationStatus';
import { Job } from '../jobs/schemas/job.schema';
import { MailService } from '../mail/mail.service';

describe('ApplicationService', () => {
  let service: ApplicationsService;

  const mockApplicationModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  const mockJobModel = {
    findById: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getModelToken(Application.name),
          useValue: mockApplicationModel,
        },
        {
          provide: getModelToken(Job.name),
          useValue: mockJobModel,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  //! Apply to a Job
  describe('applyToJob', () => {
    const user = {
      _id: new Types.ObjectId().toString(),
      role: 'JOBSEEKER',
    };

    const jobId = new Types.ObjectId().toString();
    const resume = 'resume.pdf';

    //! NotFound if job doesn't exist
    it('should throw NotFoundException if the job does not exist', async () => {
      mockJobModel.findById.mockResolvedValue(null);

      await expect(service.applyToJob(user, jobId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockApplicationModel.findOne).not.toHaveBeenCalled();
      expect(mockApplicationModel.create).not.toHaveBeenCalled();
    });

    //! Cannot apply to a closed job
    it('should throw BadRequestException if the job is closed', async () => {
      mockJobModel.findById.mockResolvedValue({
        _id: jobId,
        isClosed: true,
      });

      await expect(service.applyToJob(user, jobId, resume)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockApplicationModel.findOne).not.toHaveBeenCalled();
      expect(mockApplicationModel.create).not.toHaveBeenCalled();
    });

    //! Forbidden if user not JOBSEEKER
    it('should throw ForbiddenException if user is not a JOBSEEKER', async () => {
      const recruiter = {
        _id: new Types.ObjectId().toString(),
        role: 'EMPLOYER',
      };

      await expect(
        service.applyToJob(recruiter, jobId, resume),
      ).rejects.toThrow(ForbiddenException);

      expect(mockJobModel.findById).not.toHaveBeenCalled();
      expect(mockApplicationModel.findOne).not.toHaveBeenCalled();
      expect(mockApplicationModel.create).not.toHaveBeenCalled();
    });

    //! Cannot apply if already applied
    it('should throw BadRequestException if user already applied', async () => {
      mockJobModel.findById.mockResolvedValue({
        _id: jobId,
        isClosed: false,
      });

      mockApplicationModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      await expect(service.applyToJob(user, jobId, resume)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockApplicationModel.create).not.toHaveBeenCalled();
    });

    //! Should create application without resume
    it('should create application without resume', async () => {
      const createdApplication = {
        _id: new Types.ObjectId(),
        applicant: user._id,
        job: jobId,
      };

      mockJobModel.findById.mockResolvedValue({
        _id: jobId,
        isClosed: false,
      });

      mockApplicationModel.findOne.mockResolvedValue(null);
      mockApplicationModel.create.mockResolvedValue(createdApplication);

      const result = await service.applyToJob(user, jobId);

      expect(mockApplicationModel.create).toHaveBeenCalledWith({
        job: expect.any(Types.ObjectId),
        applicant: expect.any(Types.ObjectId),
        resume: undefined,
      });

      expect(result).toEqual(createdApplication);
    });

    //* Successfully apply to Job
    it('should apply successfully', async () => {
      const createdApplication = {
        _id: new Types.ObjectId(),
        applicant: user._id,
        job: jobId,
        resume,
      };

      mockJobModel.findById.mockResolvedValue({
        _id: jobId,
        isClosed: false,
      });

      mockApplicationModel.findOne.mockResolvedValue(null);
      mockApplicationModel.create.mockResolvedValue(createdApplication);

      const result = await service.applyToJob(user, jobId, resume);

      expect(mockApplicationModel.findOne).toHaveBeenCalledWith({
        job: expect.any(Types.ObjectId),
        applicant: expect.any(Types.ObjectId),
      });

      expect(mockApplicationModel.create).toHaveBeenCalledWith({
        job: expect.any(Types.ObjectId),
        applicant: expect.any(Types.ObjectId),
        resume,
      });

      expect(result).toEqual(createdApplication);
    });
  });

  //! Get Users Application
  describe('getMyApplications', () => {
    it('should return all applications for the current user', async () => {
      const userId = new Types.ObjectId();

      const applications = [
        { _id: new Types.ObjectId() },
        { _id: new Types.ObjectId() },
      ];

      const sortMock = jest.fn().mockResolvedValue(applications);
      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      mockApplicationModel.find.mockReturnValue({
        populate: populateMock,
      });

      const result = await service.getMyApplications(userId);

      expect(mockApplicationModel.find).toHaveBeenCalledWith({
        applicant: userId,
      });

      expect(populateMock).toHaveBeenCalledWith(
        'job',
        'title company location type',
      );

      expect(sortMock).toHaveBeenCalledWith({
        createdAt: -1,
      });

      expect(result).toEqual(applications);
    });
  });

  //! Get Applicants for Job
  describe('getApplicantsForJob', () => {
    const companyId = new Types.ObjectId();
    const jobId = new Types.ObjectId().toString();

    //! Unauthorized
    it('should throw ForbiddenException when user does not own the job', async () => {
      mockJobModel.findById.mockResolvedValue({
        _id: jobId,
        company: new Types.ObjectId(),
      });

      await expect(
        service.getApplicantsForJob(jobId, companyId),
      ).rejects.toThrow(ForbiddenException);

      expect(mockApplicationModel.find).not.toHaveBeenCalled();
    });

    //! Job not found
    it('should throw ForbiddenException when job does not exist', async () => {
      mockJobModel.findById.mockResolvedValue(null);

      await expect(
        service.getApplicantsForJob(jobId, companyId),
      ).rejects.toThrow(ForbiddenException);

      expect(mockApplicationModel.find).not.toHaveBeenCalled();
    });

    //! Success
    it('should return applicants for a job', async () => {
      const applicants = [
        { _id: new Types.ObjectId() },
        { _id: new Types.ObjectId() },
      ];

      mockJobModel.findById.mockResolvedValue({
        _id: jobId,
        company: {
          equals: jest.fn().mockReturnValue(true),
        },
      });

      const populateApplicantMock = jest.fn().mockResolvedValue(applicants);

      const populateJobMock = jest.fn().mockReturnValue({
        populate: populateApplicantMock,
      });

      mockApplicationModel.find.mockReturnValue({
        populate: populateJobMock,
      });

      const result = await service.getApplicantsForJob(jobId, companyId);

      expect(mockJobModel.findById).toHaveBeenCalledWith(jobId);

      expect(mockApplicationModel.find).toHaveBeenCalledWith({
        job: expect.any(Types.ObjectId),
      });

      expect(populateJobMock).toHaveBeenCalledWith(
        'job',
        'title location category type',
      );

      expect(populateApplicantMock).toHaveBeenCalledWith(
        'applicant',
        'name email avatar resume',
      );

      expect(result).toEqual(applicants);
    });

    //! Accept string userId
    it('should accept a string userId', async () => {
      const stringUserId = companyId.toString();

      mockJobModel.findById.mockResolvedValue({
        company: {
          equals: jest.fn().mockReturnValue(true),
        },
      });

      const populateApplicantMock = jest.fn().mockResolvedValue([]);

      const populateJobMock = jest.fn().mockReturnValue({
        populate: populateApplicantMock,
      });

      mockApplicationModel.find.mockReturnValue({
        populate: populateJobMock,
      });

      await service.getApplicantsForJob(jobId, stringUserId as any);

      expect(mockJobModel.findById).toHaveBeenCalledWith(jobId);
      expect(mockApplicationModel.find).toHaveBeenCalled();
    });
  });

  //! Get Application by Id
  describe('getApplicationById', () => {
    const applicationId = new Types.ObjectId().toString();
    const applicantId = new Types.ObjectId();
    const companyId = new Types.ObjectId();
    const otherUserId = new Types.ObjectId();

    //! Application not found
    it('should throw NotFoundException if application does not exist', async () => {
      mockApplicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.getApplicationById(applicationId, applicantId),
      ).rejects.toThrow(NotFoundException);
    });

    //! Applicant can view application
    it('should return application when requested by applicant', async () => {
      const application = {
        _id: applicationId,
        applicant: {
          _id: applicantId,
        },
        job: {
          company: companyId,
        },
      };

      mockApplicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(application),
        }),
      });

      const result = await service.getApplicationById(
        applicationId,
        applicantId,
      );

      expect(mockApplicationModel.findById).toHaveBeenCalledWith(applicationId);
      expect(result).toEqual(application);
    });

    //! Company owner can view application
    it('should return application when requested by company owner', async () => {
      const application = {
        _id: applicationId,
        applicant: {
          _id: applicantId,
        },
        job: {
          company: companyId,
        },
      };

      mockApplicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(application),
        }),
      });

      const result = await service.getApplicationById(applicationId, companyId);

      expect(result).toEqual(application);
    });

    //! Unauthorized user
    it('should throw ForbiddenException if user is not the applicant or company owner', async () => {
      const application = {
        _id: applicationId,
        applicant: {
          _id: applicantId,
        },
        job: {
          company: companyId,
        },
      };

      mockApplicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(application),
        }),
      });

      await expect(
        service.getApplicationById(applicationId, otherUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  //! Update Status
  describe('updateStatus', () => {
    const applicationId = new Types.ObjectId().toString();
    const companyId = new Types.ObjectId();
    const otherUserId = new Types.ObjectId();

    //! Application not found
    it('should throw NotFoundException if application does not exist', async () => {
      mockApplicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.updateStatus(
          applicationId,
          companyId,
          ApplicationStatus.ACCEPTED,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    //! Cannot update rejected application
    it('should throw BadRequestException if application is already rejected', async () => {
      const app = {
        status: ApplicationStatus.REJECTED,
      };

      mockApplicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(app),
        }),
      });

      await expect(
        service.updateStatus(
          applicationId,
          companyId,
          ApplicationStatus.ACCEPTED,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    //! Unauthorized user
    it('should throw ForbiddenException if user is not the company owner', async () => {
      const app = {
        status: ApplicationStatus.IN_REVIEW,
        job: {
          title: 'Backend Developer',
          company: {
            _id: companyId,
            companyName: 'Acme Ltd',
          },
        },
        applicant: {
          name: 'John',
          email: 'john@test.com',
        },
        save: jest.fn(),
      };

      mockApplicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(app),
        }),
      });

      await expect(
        service.updateStatus(
          applicationId,
          otherUserId,
          ApplicationStatus.ACCEPTED,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(app.save).not.toHaveBeenCalled();
      expect(mockMailService.sendMail).not.toHaveBeenCalled();
    });

    //! Successfully update application status
    it('should update application status and send email', async () => {
      const app = {
        status: ApplicationStatus.IN_REVIEW,
        job: {
          title: 'Backend Developer',
          company: {
            _id: companyId,
            companyName: 'Acme Ltd',
          },
        },
        applicant: {
          name: 'John',
          email: 'john@test.com',
        },
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockApplicationModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(app),
        }),
      });

      mockMailService.sendMail.mockResolvedValue(undefined);

      const result = await service.updateStatus(
        applicationId,
        companyId,
        ApplicationStatus.ACCEPTED,
      );

      expect(app.status).toBe(ApplicationStatus.ACCEPTED);
      expect(app.save).toHaveBeenCalled();

      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);

      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        'john@test.com',
        expect.stringContaining('Backend Developer'),
        expect.any(String),
        expect.any(String),
      );

      expect(result).toEqual({
        message: 'Application status updated',
        status: ApplicationStatus.ACCEPTED,
      });
    });
  });
});
