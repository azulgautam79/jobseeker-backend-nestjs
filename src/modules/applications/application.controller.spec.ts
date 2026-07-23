import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let service: ApplicationsService;

  const mockApplicationsService = {
    applyToJob: jest.fn(),
    getMyApplications: jest.fn(),
    getApplicantsForJob: jest.fn(),
    getApplicationById: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
      ],
    }).compile();

    controller = module.get<ApplicationsController>(ApplicationsController);
    service = module.get<ApplicationsService>(ApplicationsService);
  });

  //! Should exist
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  //! Should be able to apply to job
  describe('applyToJob', () => {
    it('should apply to a job', async () => {
      const req = {
        user: {
          _id: 'user-id',
          resume: '/uploads/resume.pdf',
        },
      };

      const response = {
        success: true,
        message: 'Applied successfully',
      };

      mockApplicationsService.applyToJob.mockResolvedValue(response);

      const result = await controller.applyToJob(req, 'job-id');

      expect(service.applyToJob).toHaveBeenCalledTimes(1);

      expect(service.applyToJob).toHaveBeenCalledWith(
        req.user,
        'job-id',
        '/uploads/resume.pdf',
      );

      expect(result).toEqual(response);
    });
  });

  //! Get Job Seeker's application
  describe('getMyApplications', () => {
    it('should return logged in user applications', async () => {
      const req = {
        user: {
          _id: 'user-id',
        },
      };

      const response = [
        {
          _id: 'application-1',
        },
      ];

      mockApplicationsService.getMyApplications.mockResolvedValue(response);

      const result = await controller.getMyApplications(req);

      expect(service.getMyApplications).toHaveBeenCalledWith('user-id');

      expect(result).toEqual(response);
    });
  });

  //! Get Application for applied job
  describe('getApplicantsForJob', () => {
    it('should return applicants for a job', async () => {
      const req = {
        user: {
          _id: 'employer-id',
        },
      };

      const response = [
        {
          applicant: 'John',
        },
      ];

      mockApplicationsService.getApplicantsForJob.mockResolvedValue(response);

      const result = await controller.getApplicantsForJob(req, 'job-id');

      expect(service.getApplicantsForJob).toHaveBeenCalledWith(
        'job-id',
        'employer-id',
      );

      expect(result).toEqual(response);
    });
  });

  //! Get Applications by id
  describe('getApplicationById', () => {
    it('should return application by id', async () => {
      const req = {
        user: {
          _id: 'employer-id',
        },
      };

      const response = {
        _id: 'application-id',
      };

      mockApplicationsService.getApplicationById.mockResolvedValue(response);

      const result = await controller.getApplicationById(req, 'application-id');

      expect(service.getApplicationById).toHaveBeenCalledWith(
        'application-id',
        'employer-id',
      );

      expect(result).toEqual(response);
    });
  });

  //! Update status of the application for a job
  describe('updateStatus', () => {
    it('should update application status', async () => {
      const req = {
        user: {
          _id: 'employer-id',
        },
      };

      const dto = {
        status: 'Accepted',
      };

      const response = {
        success: true,
      };

      mockApplicationsService.updateStatus.mockResolvedValue(response);

      const result = await controller.updateStatus(
        req,
        'application-id',
        dto as any,
      );

      expect(service.updateStatus).toHaveBeenCalledWith(
        'application-id',
        'employer-id',
        'Accepted',
      );

      expect(result).toEqual(response);
    });
  });
});
