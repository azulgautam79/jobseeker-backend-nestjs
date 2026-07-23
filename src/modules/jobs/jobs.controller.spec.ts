import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

describe('JobsController', () => {
  let controller: JobsController;
  let service: JobsService;

  const mockJobsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findJobsWithoutFilters: jest.fn(),
    findEmployerJobs: jest.fn(),
    toggleClose: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  //! Should exist
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  //! Should create a job
  describe('create', () => {
    it('should create a job', async () => {
      const dto = {
        title: 'Frontend Developer',
      };

      const user = {
        _id: 'user-id',
      };

      const response = {
        _id: 'job-id',
        ...dto,
      };

      mockJobsService.create.mockResolvedValue(response);

      const result = await controller.create(dto as any, user);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(dto, user);
      expect(result).toEqual(response);
    });
  });

  //! Find all jobs
  describe('findAll', () => {
    it('should return all jobs', async () => {
      const query = {
        page: 1,
        limit: 10,
      };

      const jobs = [{ title: 'Frontend' }, { title: 'Backend' }];

      mockJobsService.findAll.mockResolvedValue(jobs);

      const result = await controller.findAll(query as any);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(jobs);
    });
  });

  //! Find jobs without filter
  describe('findJobsWithoutFilters', () => {
    it('should return all jobs without filters', async () => {
      const jobs = [{ title: 'React' }, { title: 'NestJS' }];

      mockJobsService.findJobsWithoutFilters.mockResolvedValue(jobs);

      const result = await controller.findJobsWithoutFilters();

      expect(service.findJobsWithoutFilters).toHaveBeenCalledTimes(1);
      expect(result).toEqual(jobs);
    });
  });

  //! Find jobs from an employer or employer can see their jobs
  describe('findEmployerJobs', () => {
    it('should return employer jobs', async () => {
      const user = {
        _id: 'employer-id',
      };

      const jobs = [{ title: 'Frontend' }];

      mockJobsService.findEmployerJobs.mockResolvedValue(jobs);

      const result = await controller.findEmployerJobs(user);

      expect(service.findEmployerJobs).toHaveBeenCalledWith(user);
      expect(result).toEqual(jobs);
    });
  });

  //! Employer closing a job
  describe('toggleClose', () => {
    it('should toggle job status', async () => {
      const user = {
        _id: 'employer-id',
      };

      const response = {
        isClosed: true,
      };

      mockJobsService.toggleClose.mockResolvedValue(response);

      const result = await controller.toggleClose('job-id', user);

      expect(service.toggleClose).toHaveBeenCalledWith('job-id', user);

      expect(result).toEqual(response);
    });
  });

  //! Find a job
  describe('findOne', () => {
    it('should return one job', async () => {
      const job = {
        _id: 'job-id',
        title: 'React Developer',
      };

      mockJobsService.findOne.mockResolvedValue(job);

      const result = await controller.findOne('job-id', 'user-id');

      expect(service.findOne).toHaveBeenCalledWith('job-id', 'user-id');

      expect(result).toEqual(job);
    });
  });

  //! Update a job
  describe('update', () => {
    it('should update a job', async () => {
      const dto = {
        title: 'Senior React Developer',
      };

      const user = {
        _id: 'employer-id',
      };

      const response = {
        _id: 'job-id',
        title: dto.title,
      };

      mockJobsService.update.mockResolvedValue(response);

      const result = await controller.update('job-id', dto as any, user);

      expect(service.update).toHaveBeenCalledWith('job-id', dto, user);

      expect(result).toEqual(response);
    });
  });

  //! Delete a job
  describe('remove', () => {
    it('should remove a job', async () => {
      const user = {
        _id: 'employer-id',
      };

      const response = {
        success: true,
      };

      mockJobsService.remove.mockResolvedValue(response);

      const result = await controller.remove('job-id', user);

      expect(service.remove).toHaveBeenCalledWith('job-id', user);

      expect(result).toEqual(response);
    });
  });
});
