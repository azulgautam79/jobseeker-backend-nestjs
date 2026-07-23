import { Test, TestingModule } from '@nestjs/testing';
import { SavedJobsController } from './savedJobs.controller';
import { SavedJobsService } from './savedJobs.service';

describe('SavedJobsController', () => {
  let controller: SavedJobsController;
  let service: SavedJobsService;

  const mockSavedJobsService = {
    saveJob: jest.fn(),
    unsaveJob: jest.fn(),
    getMySavedJobs: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedJobsController],
      providers: [
        {
          provide: SavedJobsService,
          useValue: mockSavedJobsService,
        },
      ],
    }).compile();

    controller = module.get<SavedJobsController>(SavedJobsController);
    service = module.get<SavedJobsService>(SavedJobsService);
  });

  //! Should exist
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  //! Save a Job
  describe('saveJob', () => {
    it('should save a job', async () => {
      const req = {
        user: {
          _id: 'user-id',
        },
      };

      const response = {
        success: true,
        message: 'Job saved successfully',
      };

      mockSavedJobsService.saveJob.mockResolvedValue(response);

      const result = await controller.saveJob(req, 'job-id');

      expect(service.saveJob).toHaveBeenCalledTimes(1);

      expect(service.saveJob).toHaveBeenCalledWith('job-id', 'user-id');

      expect(result).toEqual(response);
    });
  });

  //! Unsave a job
  describe('unsaveJob', () => {
    it('should unsave a job', async () => {
      const req = {
        user: {
          _id: 'user-id',
        },
      };

      const response = {
        success: true,
        message: 'Job removed from saved jobs',
      };

      mockSavedJobsService.unsaveJob.mockResolvedValue(response);

      const result = await controller.unsaveJob(req, 'job-id');

      expect(service.unsaveJob).toHaveBeenCalledTimes(1);

      expect(service.unsaveJob).toHaveBeenCalledWith('job-id', 'user-id');

      expect(result).toEqual(response);
    });
  });

  //! Get all User's saved jobs
  describe('getMySavedJobs', () => {
    it('should return all saved jobs', async () => {
      const req = {
        user: {
          _id: 'user-id',
        },
      };

      const response = [
        {
          _id: 'saved-job-1',
          title: 'Frontend Developer',
        },
        {
          _id: 'saved-job-2',
          title: 'Backend Developer',
        },
      ];

      mockSavedJobsService.getMySavedJobs.mockResolvedValue(response);

      const result = await controller.getMySavedJobs(req);

      expect(service.getMySavedJobs).toHaveBeenCalledTimes(1);

      expect(service.getMySavedJobs).toHaveBeenCalledWith('user-id');

      expect(result).toEqual(response);
    });
  });
});
