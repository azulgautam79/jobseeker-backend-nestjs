import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('JobsService', () => {
  let service: JobsService;

  const mockJobModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  const mockApplicationModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockSavedJobModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getModelToken('Job'), useValue: mockJobModel },
        { provide: getModelToken('SavedJob'), useValue: mockSavedJobModel },
        {
          provide: getModelToken('Application'),
          useValue: mockApplicationModel,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  //! Test Job Creation (EMPLOYER)
  it('should create job if user is employer', async () => {
    const dto = { title: 'Backend Developer' };
    const user = { _id: '123', role: 'EMPLOYER' };

    mockJobModel.create.mockResolvedValue({ ...dto, company: '123' });

    const result = await service.create(dto as any, user);

    expect(mockJobModel.create).toHaveBeenCalledWith({
      ...dto,
      company: '123',
    });

    expect(result.title).toBe('Backend Developer');
  });

  //! Job Creation Error if not EMPLOYER
  it('should throw if user is not employer', async () => {
    const dto = { title: 'Backend Developer' };
    const user = { _id: '123', role: 'JOBSEEKER' };

    await expect(service.create(dto as any, user)).rejects.toThrow(
      ForbiddenException,
    );
  });

  //! 404 if no job found by id
  it('should throw if job not found', async () => {
    mockJobModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findOne('abc')).rejects.toThrow(NotFoundException);
  });

  //! Job Found with Application Status
  it('should return job with applicationStatus', async () => {
    const jobId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    const job = {
      _id: jobId,
      toObject: () => ({ _id: jobId }),
    };

    mockJobModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(job),
    });
    mockApplicationModel.findOne.mockResolvedValue({ status: 'PENDING' });

    const result = await service.findOne(jobId.toString(), userId.toString());

    expect(result.applicationStatus).toBe('PENDING');
  });

  //! Throw error if not owner
  it('should throw if user is not owner', async () => {
    const job = {
      company: new Types.ObjectId(),
    };

    mockJobModel.findById.mockResolvedValue(job);

    const user = { _id: new Types.ObjectId() };

    await expect(service.update('id', {}, user)).rejects.toThrow(
      ForbiddenException,
    );
  });

  mockJobModel.find.mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  });

  //! Find all jobs with saved and applied status
  it('should return jobs with saved and applied status', async () => {
    const jobId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    mockJobModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: jobId }]),
    });

    mockSavedJobModel.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ job: jobId }]),
    });

    mockApplicationModel.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ job: jobId, status: 'ACCEPTED' }]),
    });

    const result = await service.findAll({
      userId: userId.toString(),
    } as any);

    expect(result[0].isSaved).toBe(true);
    expect(result[0].applicationStatus).toBe('ACCEPTED');
  });

  describe('findAll', () => {
    const jobId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    //! Basic job listing (no userId)
    it('should return jobs without user-specific flags', async () => {
      const jobs = [
        {
          _id: jobId,
          title: 'NestJS Dev',
        },
      ];

      mockJobModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(jobs),
        }),
      });

      const result = await service.findAll({} as any);

      expect(mockJobModel.find).toHaveBeenCalledWith({
        isClosed: false,
      });

      expect(result[0].isSaved).toBe(false);
      expect(result[0].applicationStatus).toBeNull();
    });

    //! With filters (keyword, location, type)
    it('should apply filters correctly', async () => {
      mockJobModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.findAll({
        keyword: 'Nest',
        location: 'Kathmandu',
        category: 'IT',
        type: 'FULL_TIME',
      } as any);

      expect(mockJobModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isClosed: false,
          title: { $regex: 'Nest', $options: 'i' },
          location: { $regex: 'Kathmandu', $options: 'i' },
          category: 'IT',
          type: 'FULL_TIME',
        }),
      );
    });

    //! With salary filters
    it('should apply salary filters', async () => {
      mockJobModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      await service.findAll({
        minSalary: 1000,
        maxSalary: 5000,
      } as any);

      const callArg = mockJobModel.find.mock.calls[0][0];

      expect(callArg.$and).toBeDefined();
      expect(callArg.$and.length).toBe(2);
    });

    //! With userId (saved + applied jobs)
    it('should mark saved jobs and application status', async () => {
      const jobs = [{ _id: jobId, title: 'Dev' }];

      mockJobModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(jobs),
        }),
      });

      // saved jobs
      mockSavedJobModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([{ job: jobId }]),
      });

      // applications
      mockApplicationModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            job: jobId,
            status: 'PENDING',
          },
        ]),
      });

      const result = await service.findAll({
        userId,
      } as any);

      expect(result[0].isSaved).toBe(true);
      expect(result[0].applicationStatus).toBe('PENDING');
    });
  });

  //! Find Jobs without filters
  describe('findJobsWithoutFilters', () => {
    it('should return all open jobs', async () => {
      const jobs = [{ _id: new Types.ObjectId() }];

      mockJobModel.find.mockResolvedValue(jobs);

      const result = await service.findJobsWithoutFilters();

      expect(mockJobModel.find).toHaveBeenCalledWith({ isClosed: false });
      expect(result).toEqual(jobs);
    });
  });

  //! Find Employer Jobs
  describe('findEmployerJobs', () => {
    const employerId = new Types.ObjectId();

    it('should throw ForbiddenException if not employer', async () => {
      await expect(
        service.findEmployerJobs({ role: 'JOBSEEKER' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return employer jobs with application count', async () => {
      const jobs = [{ _id: new Types.ObjectId(), title: 'Dev' }];

      const populateMock = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      mockJobModel.find.mockReturnValue({
        populate: populateMock,
      });

      mockApplicationModel.countDocuments.mockResolvedValue(5);

      const result = await service.findEmployerJobs({
        role: 'EMPLOYER',
        _id: employerId,
      });

      expect(result[0]).toHaveProperty('applicationCount', 5);
      expect(mockApplicationModel.countDocuments).toHaveBeenCalled();
    });
  });

  //! Find Job by id
  describe('findOne', () => {
    const jobId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    it('should throw NotFoundException if job not found', async () => {
      mockJobModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(jobId)).rejects.toThrow(NotFoundException);
    });

    it('should return job without application status', async () => {
      const job = {
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ title: 'Dev' }),
      };

      mockJobModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(job),
      });

      const result = await service.findOne(jobId);

      expect(result.applicationStatus).toBeNull();
    });

    it('should include application status', async () => {
      const job = {
        _id: new Types.ObjectId(),
        toObject: jest.fn().mockReturnValue({ title: 'Dev' }),
      };

      mockJobModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(job),
      });

      mockApplicationModel.findOne.mockResolvedValue({
        status: 'PENDING',
      });

      const result = await service.findOne(jobId, userId);

      expect(result.applicationStatus).toBe('PENDING');
    });
  });

  //! Update a job
  describe('update', () => {
    const jobId = new Types.ObjectId().toString();

    it('should throw NotFoundException if job not found', async () => {
      mockJobModel.findById.mockResolvedValue(null);

      await expect(
        service.update(jobId, {}, { _id: new Types.ObjectId() }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockJobModel.findById.mockResolvedValue({
        company: new Types.ObjectId(),
      });

      await expect(
        service.update(jobId, {}, { _id: new Types.ObjectId() }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update job successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue({ title: 'Updated' });

      mockJobModel.findById.mockResolvedValue({
        company: { toString: () => '123' },
        save: saveMock,
      });

      const result = await service.update(jobId, { title: 'Updated' } as any, {
        _id: { toString: () => '123' },
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result.title).toBe('Updated');
    });
  });

  //! Remove a job
  describe('remove', () => {
    const jobId = new Types.ObjectId().toString();

    it('should throw NotFoundException if job not found', async () => {
      mockJobModel.findById.mockResolvedValue(null);

      await expect(
        service.remove(jobId, { _id: new Types.ObjectId() }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete job successfully', async () => {
      const deleteMock = jest.fn();

      mockJobModel.findById.mockResolvedValue({
        company: { toString: () => '123' },
        deleteOne: deleteMock,
      });

      const result = await service.remove(jobId, {
        _id: { toString: () => '123' },
      });

      expect(deleteMock).toHaveBeenCalled();
      expect(result.message).toBe('Job deleted successfully');
    });
  });

  //! Close a job
  describe('toggleClose', () => {
    const jobId = new Types.ObjectId().toString();

    it('should toggle job status', async () => {
      const saveMock = jest.fn();

      mockJobModel.findById.mockResolvedValue({
        isClosed: false,
        company: { toString: () => '123' },
        save: saveMock,
      });

      const result = await service.toggleClose(jobId, {
        _id: { toString: () => '123' },
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result.message).toBe('Job status updated');
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockJobModel.findById.mockResolvedValue({
        company: { toString: () => '999' },
      });

      await expect(
        service.toggleClose(jobId, {
          _id: { toString: () => '123' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
