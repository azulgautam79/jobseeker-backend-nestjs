import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Types } from 'mongoose';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    getEmployerAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  //! Should exist
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  //! Call Analytics
  it('should call analyticsService.getEmployerAnalytics()', async () => {
    const userId = new Types.ObjectId();

    const response = {
      counts: {
        totalActiveJobs: 5,
        totalApplications: 20,
        totalHired: 3,
        trends: {
          activeJobs: 10,
          totalApplicants: 15,
          totalHired: 5,
        },
      },
      data: {
        recentJobs: [],
        recentApplications: [],
      },
    };

    mockAnalyticsService.getEmployerAnalytics.mockResolvedValue(response);

    const req = {
      user: {
        _id: userId,
        role: 'EMPLOYER',
      },
    };

    const result = await controller.getEmployerAnalytics(req);

    expect(service.getEmployerAnalytics).toHaveBeenCalledTimes(1);

    expect(service.getEmployerAnalytics).toHaveBeenCalledWith(
      userId,
      'EMPLOYER',
    );

    expect(result).toEqual(response);
  });
});
