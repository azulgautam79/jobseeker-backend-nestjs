import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { SavedJobsService } from './savedJobs.service';
import { SavedJob } from './schemas/savedJob.schema';
import { Job } from '../jobs/schemas/job.schema';

describe('SavedJobsService', () => {
  let service: SavedJobsService;

  const mockSavedJobModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndDelete: jest.fn(),
    find: jest.fn(),
  };

  const mockJobModel = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedJobsService,
        {
          provide: getModelToken(SavedJob.name),
          useValue: mockSavedJobModel,
        },
        {
          provide: getModelToken(Job.name),
          useValue: mockJobModel,
        },
      ],
    }).compile();

    service = module.get<SavedJobsService>(SavedJobsService);
  });

  describe('saveJob', () => {
    const userId = new Types.ObjectId();
    const jobId = new Types.ObjectId().toString();

    //! Job already saved
    it('should throw BadRequestException if job is already saved', async () => {
      mockSavedJobModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      await expect(service.saveJob(jobId, userId)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockSavedJobModel.create).not.toHaveBeenCalled();
    });

    //! Save job successfully
    it('should save a job', async () => {
      const savedJob = {
        _id: new Types.ObjectId(),
        job: jobId,
        jobseeker: userId,
      };

      mockSavedJobModel.findOne.mockResolvedValue(null);
      mockSavedJobModel.create.mockResolvedValue(savedJob);

      const result = await service.saveJob(jobId, userId);

      expect(mockSavedJobModel.findOne).toHaveBeenCalledWith({
        job: jobId,
        jobseeker: userId,
      });

      expect(mockSavedJobModel.create).toHaveBeenCalledWith({
        job: jobId,
        jobseeker: userId,
      });

      expect(result).toEqual(savedJob);
    });
  });

  describe('unsaveJob', () => {
    const userId = new Types.ObjectId();
    const jobId = new Types.ObjectId().toString();

    //! Saved job not found
    it('should throw NotFoundException if saved job does not exist', async () => {
      mockSavedJobModel.findOneAndDelete.mockResolvedValue(null);

      await expect(service.unsaveJob(jobId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    //! Remove saved job
    it('should remove a saved job', async () => {
      mockSavedJobModel.findOneAndDelete.mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      const result = await service.unsaveJob(jobId, userId);

      expect(mockSavedJobModel.findOneAndDelete).toHaveBeenCalledWith({
        job: jobId,
        jobseeker: userId,
      });

      expect(result).toEqual({
        message: 'Job removed from saved list',
      });
    });
  });

  describe('getMySavedJobs', () => {
    const userId = new Types.ObjectId();

    //! Get saved jobs
    it('should return saved jobs for the user', async () => {
      const savedJobs = [
        { _id: new Types.ObjectId() },
        { _id: new Types.ObjectId() },
      ];

      const populateMock = jest.fn().mockResolvedValue(savedJobs);

      mockSavedJobModel.find.mockReturnValue({
        populate: populateMock,
      });

      const result = await service.getMySavedJobs(userId);

      expect(mockSavedJobModel.find).toHaveBeenCalledWith({
        jobseeker: userId,
      });

      expect(populateMock).toHaveBeenCalledWith({
        path: 'job',
        populate: {
          path: 'company',
          select: 'name companyName companyLogo',
        },
      });

      expect(result).toEqual(savedJobs);
    });
  });
});
