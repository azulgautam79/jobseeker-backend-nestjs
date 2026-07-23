import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';

import { AnalyticsService } from './analytics.service';
import { Job } from '../jobs/schemas/job.schema';
import { Application } from '../applications/schemas/application.schema';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockJobModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  const mockApplicationModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getModelToken(Job.name),
          useValue: mockJobModel,
        },
        {
          provide: getModelToken(Application.name),
          useValue: mockApplicationModel,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  //! Should exist
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //! Throw Forbidden if not EMPLOYER
  it('should throw ForbiddenException if role is not EMPLOYER', async () => {
    await expect(
      service.getEmployerAnalytics(new Types.ObjectId(), 'JOB_SEEKER'),
    ).rejects.toThrow(ForbiddenException);
  });

  //!

  mockJobModel.find.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  });

  mockJobModel.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  });

  mockApplicationModel.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  });

  mockJobModel.countDocuments.mockResolvedValue(5);

  mockApplicationModel.countDocuments
    .mockResolvedValueOnce(20)
    .mockResolvedValueOnce(3)
    .mockResolvedValueOnce(5)
    .mockResolvedValueOnce(10)
    .mockResolvedValueOnce(2)
    .mockResolvedValueOnce(1);

  // mockJobModel.findById.mockResolvedValue(job);
});
