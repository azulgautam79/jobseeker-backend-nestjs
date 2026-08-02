import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Job, JobDocument } from './schemas/job.schema';
import { Model, Types } from 'mongoose';
import {
  Application,
  ApplicationDocument,
} from '../applications/schemas/application.schema';
import { JobQueryDto } from './dto/job-query.dto';
import { ApplicationStatus } from '../../common/enums/applicationStatus';
import {
  SavedJob,
  SavedJobDocument,
} from '../savedJobs/schemas/savedJob.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { calculateRecommendationScore } from '../../common/utils/calculateRecommendationScore';
import { RedisService } from '../redis/redis.service';
import { CacheKeys } from '../../common/cache/cache.keys';
import { CacheTTL } from '../../common/cache/cache.ttl';
import { JobCacheService } from './job-cache.service';
import { ConfigService } from '@nestjs/config';
import { ContextLogger } from '../../common/logger/context-logger';
import { TraceService } from '../../common/telemetry/tracing/trace.service';
import { LoggerFactory } from '../../common/logger/logger.factory';
import { Trace } from '../../common/telemetry/tracing/trace.decorator';
import { PrometheusService } from '../../common/prometheus/prometheus.service';

/**
 *! Job Service
 */
@Injectable()
export class JobsService {
  private readonly recommendationThreshold: number;
  private readonly logger: ContextLogger;

  //! DI
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private appModel: Model<ApplicationDocument>,
    @InjectModel(SavedJob.name) private savedJobModel: Model<SavedJobDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,

    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly jobCacheService: JobCacheService,
    private readonly traceService: TraceService,
    private readonly prometheusService: PrometheusService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger =
      loggerFactory.create(
        JobsService.name,
      );
    this.recommendationThreshold = Number(
      this.configService.getOrThrow('RECOMMENDATION_THRESHOLD'),
    );
  }

  //? Find All Jobs Ko Values haru
  private buildJobQuery(queryDto: JobQueryDto) {
    const { keyword, location, category, type, minSalary, maxSalary } =
      queryDto;

    const query: any = {
      isClosed: false,
    };

    if (keyword) {
      query.title = {
        $regex: keyword,
        $options: 'i',
      };
    }

    if (location) {
      query.location = {
        $regex: location,
        $options: 'i',
      };
    }

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (minSalary || maxSalary) {
      query.$and = [];

      if (minSalary) {
        query.$and.push({
          salaryMax: {
            $gte: minSalary,
          },
        });
      }

      if (maxSalary) {
        query.$and.push({
          salaryMin: {
            $lte: maxSalary,
          },
        });
      }
    }

    return query;
  }

  @Trace('jobs.get-jobs')
  private async getJobs(query: any) {

    this.traceService.setCurrentAttribute('query.hasFilters', Object.keys(query).length > 1);

    const jobs = this.jobModel
      .find(query)
      .populate('company', 'name companyName companyLogo')
      .lean();

    // this.traceService.setCurrentAttribute(
    //   'jobs.count',
    //   jobs.length,
    // );

    return jobs;
  }

  @Trace('jobs.get-user-context')
  private async getUserContext(userId?: string) {

    this.traceService.setCurrentAttribute(
      'user.id',
      userId ?? 'anonymous',
    );

    if (!userId) {
      return {
        user: null,
        savedIdSet: new Set<string>(),
        appliedMap: {},
      };
    }

    const uid = new Types.ObjectId(userId);

    const user = await this.userModel.findById(uid).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [savedJobs, applications] = await Promise.all([
      this.savedJobModel
        .find({
          jobseeker: uid,
        })
        .select('job'),

      this.appModel
        .find({
          applicant: uid,
        })
        .select('job status'),
    ]);

    const savedIdSet = new Set(savedJobs.map((job) => job.job.toString()));

    const appliedMap: Record<string, string> = {};

    applications.forEach((application) => {
      appliedMap[application.job.toString()] = application.status;
    });

    this.traceService.setCurrentAttributes({
      'savedJobs.count': savedJobs.length,
      'applications.count': applications.length,
    });

    return {
      user,
      savedIdSet,
      appliedMap,
    };
  }

  @Trace('jobs.enrich')
  private enrichJobs(
    jobs: any[],
    user: any,
    savedIdSet: Set<string>,
    appliedMap: Record<string, string>,
  ) {
    return jobs.map((job) => {
      const id = job._id.toString();

      const recommendationScore = user
        ? calculateRecommendationScore(user, job)
        : 0;

      return {
        ...job,

        isSaved: savedIdSet.has(id),

        applicationStatus: appliedMap[id] ?? null,

        recommendationScore,

        isRecommended: recommendationScore >= this.recommendationThreshold,
      };
    });
  }

  private sortJobs(jobs: any[]) {
    return jobs.sort((a, b) => {
      if (a.isRecommended !== b.isRecommended) {
        return Number(b.isRecommended) - Number(a.isRecommended);
      }

      return b.recommendationScore - a.recommendationScore;
    });
  }

  /**
   *! Create Job
   */
  @Trace('jobs.create')
  async create(createJobDto: CreateJobDto, user: any) {

    this.logger.info('Create job request received', {
      employerId: user._id,
      email: user.email,
      title: createJobDto.title,
    });

    this.traceService.setCurrentAttributes({
      'user.id': user._id.toString(),
      'user.role': user.role,
      'job.title': createJobDto.title,
      'job.category': createJobDto.category,
    });

    try {
      if (user.role !== 'EMPLOYER') {
        this.logger.warn('Non employer attempted to create job', {
          userId: user._id,
        });

        this.traceService.addCurrentEvent(
          'Job creation denied',
        );

        throw new ForbiddenException(
          'Only employers can post jobs',
        );
      }

      this.traceService.addCurrentEvent(
        'Employer authorization successful',
      );

      const job = await this.jobModel.create({
        ...createJobDto,
        company: user._id,
      });

      this.prometheusService.jobsCreated.labels(job.type.toString()).inc();

      this.traceService.setCurrentAttribute(
        'job.id',
        job._id.toString(),
      );

      this.traceService.addCurrentEvent(
        'Job created',
      );

      this.logger.info('Job created successfully', {
        employerId: user._id,
        jobId: job._id.toString(),
      });

      await this.jobCacheService.invalidateAfterMutation(
        job._id.toString(),
        user._id.toString(),
      );

      this.traceService.addCurrentEvent(
        'Related cache invalidated',
      );

      return job;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Job creation failed',
        error,
        {
          employerId: user._id,
          title: createJobDto.title,
        },
      );

      throw error;
    }
  }

  /**
   *! Get All Jobs with Queries
   */
  @Trace('jobs.findall')
  async findAll(queryDto: JobQueryDto) {
    const { page = 1, limit = 10 } = queryDto;

    this.logger.info('Job search requested', {
      page,
      limit,
      userId: queryDto.userId,
    });

    this.traceService.setCurrentAttributes({
      'jobs.page': page,
      'jobs.limit': limit,
      'user.id': queryDto.userId ?? 'anonymous',
    });

    try {
      const query = await this.traceService.withSpan(
        'jobs.build-query',
        {},
        () => this.buildJobQuery(queryDto),
      );

      this.traceService.addCurrentEvent(
        'Mongo query built',
      );

      const jobs = await this.traceService.withSpan(
        'jobs.fetch',
        {},
        () => this.getJobs(query),
      );

      this.traceService.setCurrentAttribute(
        'jobs.fetched',
        jobs.length,
      );

      const total = jobs.length;

      const { user, savedIdSet, appliedMap } =
        await this.traceService.withSpan(
          'jobs.user-context',
          {},
          () => this.getUserContext(queryDto.userId),
        );

      this.traceService.addCurrentEvent(
        'User context loaded',
      );

      const enrichedJobs = await this.traceService.withSpan(
        'jobs.enrich',
        {
          'jobs.count': jobs.length,
        },
        () =>
          this.enrichJobs(
            jobs,
            user,
            savedIdSet,
            appliedMap,
          ),
      );

      const sortedJobs = await this.traceService.withSpan(
        'jobs.sort',
        {},
        () => this.sortJobs(enrichedJobs),
      );

      this.traceService.addCurrentEvent(
        'Jobs ranked',
      );

      const startIndex = (page - 1) * limit;

      const paginatedJobs = await this.traceService.withSpan(
        'jobs.paginate',
        {},
        () => {
          const startIndex = (page - 1) * limit;
          return sortedJobs.slice(startIndex, startIndex + limit);
        },
      );

      this.traceService.setCurrentAttributes({
        'jobs.returned': paginatedJobs.length,
        'jobs.total': total,
      });

      this.logger.info('Jobs returned successfully', {
        userId: queryDto.userId,
        returned: paginatedJobs.length,
        total,
        page,
        limit,
      });

      return {
        jobs: paginatedJobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
        },
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Job search failed',
        error,
        {
          userId: queryDto.userId,
          page,
          limit,
        },
      );

      throw error;
    }
  }

  /**
   *! Get All Jobs Without Queries
   */
  @Trace('jobs.find-without-filters')
  async findJobsWithoutFilters() {
    this.logger.info('Fetching public jobs');

    this.traceService.addCurrentEvent(
      'Public jobs requested',
    );

    try {
      const jobs = await this.redisService.remember(
        CacheKeys.jobs(),
        async () => {
          this.traceService.addCurrentEvent(
            'Loading public jobs from MongoDB',
          );

          return this.jobModel
            .find({ isClosed: false })
            .populate('company', 'name companyName companyLogo')
            .lean();
        },
        CacheTTL.FIVE_MINUTES,
      );

      this.traceService.setCurrentAttribute(
        'jobs.count',
        jobs.length,
      );

      this.logger.info('Public jobs fetched successfully', {
        count: jobs.length,
      });

      return jobs;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to fetch public jobs',
        error,
      );

      throw error;
    }
  }

  /**
   *! Employer Jobs
   */
  @Trace('jobs.employer-jobs')
  async findEmployerJobs(user: any) {
    this.logger.info('Employer jobs requested', {
      employerId: user._id.toString(),
      email: user.email,
    });

    this.traceService.setCurrentAttributes({
      'user.id': user._id.toString(),
      'user.role': user.role,
    });

    try {
      if (user.role !== 'EMPLOYER') {
        this.logger.warn('Non employer attempted to fetch employer jobs', {
          userId: user._id.toString(),
        });

        this.traceService.addCurrentEvent(
          'Employer authorization failed',
        );

        throw new ForbiddenException('Access denied');
      }

      this.traceService.addCurrentEvent(
        'Employer authorization successful',
      );

      const jobs = await this.redisService.remember(
        CacheKeys.employerJobs(user._id.toString()),
        async () => {
          this.traceService.addCurrentEvent(
            'Loading employer jobs from MongoDB',
          );

          const jobs = await this.jobModel
            .find({
              company: user._id,
            })
            .populate('company', 'name companyName companyLogo')
            .lean();

          this.traceService.setCurrentAttribute(
            'jobs.count',
            jobs.length,
          );

          const jobIds = jobs.map((job) => job._id);

          this.traceService.addCurrentEvent(
            'Aggregating application counts',
          );

          const applicationCounts = await this.appModel.aggregate([
            {
              $match: {
                job: {
                  $in: jobIds,
                },
              },
            },
            {
              $group: {
                _id: '$job',
                count: {
                  $sum: 1,
                },
              },
            },
          ]);

          this.traceService.setCurrentAttribute(
            'applications.aggregated',
            applicationCounts.length,
          );

          const applicationCountMap = new Map(
            applicationCounts.map((item) => [
              item._id.toString(),
              item.count,
            ]),
          );

          this.traceService.addCurrentEvent(
            'Merging application counts',
          );

          return jobs.map((job) => ({
            ...job,
            applicationCount:
              applicationCountMap.get(job._id.toString()) ?? 0,
          }));
        },
        CacheTTL.FIVE_MINUTES,
      );

      this.logger.info('Employer jobs fetched successfully', {
        employerId: user._id.toString(),
        jobs: jobs.length,
      });

      return jobs;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to fetch employer jobs',
        error,
        {
          employerId: user._id.toString(),
        },
      );

      throw error;
    }
  }

  /**
   *! Get Job by id
   */
  @Trace('jobs.find-id')
  async findOne(id: string, userId?: string) {
    this.logger.info('Job details requested', {
      jobId: id,
      userId,
    });

    this.traceService.setCurrentAttributes({
      'job.id': id,
      'user.id': userId ?? 'anonymous',
    });

    try {
      const job = await this.redisService.remember(
        CacheKeys.job(id),
        async () => {
          this.traceService.addCurrentEvent(
            'Loading job from MongoDB',
          );

          const job = await this.jobModel
            .findById(id)
            .populate('company', 'name companyName companyLogo')
            .lean();

          if (!job) {
            this.logger.warn('Requested job not found', {
              jobId: id,
            });

            this.traceService.addCurrentEvent(
              'Job not found',
            );

            throw new NotFoundException('Job not found');
          }

          return job;
        },
        CacheTTL.FIVE_MINUTES,
      );

      let applicationStatus: ApplicationStatus | null = null;

      if (userId && Types.ObjectId.isValid(userId)) {
        this.traceService.addCurrentEvent(
          'Checking application status',
        );

        const app = await this.appModel.findOne({
          job: new Types.ObjectId(id),
          applicant: new Types.ObjectId(userId),
        });

        applicationStatus = app?.status ?? null;

        this.traceService.setCurrentAttribute(
          'application.exists',
          app !== null,
        );
      }

      this.logger.info('Job fetched successfully', {
        jobId: id,
        userId,
      });

      return {
        ...job,
        applicationStatus,
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to fetch job',
        error,
        {
          jobId: id,
          userId,
        },
      );

      throw error;
    }
  }

  /**
   *! Update a Job
   */
  @Trace('jobs.update')
  async update(id: string, dto: UpdateJobDto, user: any) {
    this.logger.info('Job update requested', {
      jobId: id,
      employerId: user._id.toString(),
    });

    this.traceService.setCurrentAttributes({
      'job.id': id,
      'user.id': user._id.toString(),
    });

    try {
      const job = await this.jobModel.findById(id);

      if (!job) {
        this.logger.warn('Job update failed - job not found', {
          jobId: id,
        });

        this.traceService.addCurrentEvent(
          'Job not found',
        );

        throw new NotFoundException('Job not found');
      }

      if (job.company.toString() !== user._id.toString()) {
        this.logger.warn(
          'Unauthorized job update attempt',
          {
            jobId: id,
            employerId: user._id.toString(),
          },
        );

        this.traceService.addCurrentEvent(
          'Authorization failed',
        );

        throw new ForbiddenException('Not authorized');
      }

      this.traceService.addCurrentEvent(
        'Authorization successful',
      );

      Object.assign(job, dto);

      await job.save();

      this.traceService.addCurrentEvent(
        'Job updated in database',
      );

      await this.jobCacheService.invalidateAfterMutation(
        job._id.toString(),
        user._id.toString(),
      );

      this.traceService.addCurrentEvent(
        'Related caches invalidated',
      );

      this.logger.info(
        'Job updated successfully',
        {
          jobId: job._id.toString(),
          employerId: user._id.toString(),
        },
      );

      return job;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to update job',
        error,
        {
          jobId: id,
          employerId: user._id.toString(),
        },
      );

      throw error;
    }
  }

  /**
   *! Delete job
   */
  @Trace('jobs.delete')
  async remove(id: string, user: any) {
    this.logger.info('Job deletion requested', {
      jobId: id,
      employerId: user._id.toString(),
    });

    this.traceService.setCurrentAttributes({
      'job.id': id,
      'user.id': user._id.toString(),
    });

    try {
      const job = await this.jobModel.findById(id);

      if (!job) {
        this.logger.warn('Job deletion failed - job not found', {
          jobId: id,
        });

        this.traceService.addCurrentEvent('Job not found');

        throw new NotFoundException('Job not found');
      }

      if (job.company.toString() !== user._id.toString()) {
        this.logger.warn('Unauthorized job deletion attempt', {
          jobId: id,
          employerId: user._id.toString(),
        });

        this.traceService.addCurrentEvent(
          'Job ownership verification failed',
        );

        throw new ForbiddenException('Not authorized');
      }

      this.traceService.addCurrentEvent(
        'Job ownership verified',
      );

      await job.deleteOne();

      this.traceService.addCurrentEvent(
        'Job deleted from database',
      );

      await this.jobCacheService.invalidateAfterMutation(
        job._id.toString(),
        user._id.toString(),
      );

      this.traceService.addCurrentEvent(
        'Related caches invalidated',
      );

      this.logger.info('Job deleted successfully', {
        jobId: id,
        employerId: user._id.toString(),
      });

      return {
        message: 'Job deleted successfully',
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to delete job',
        error,
        {
          jobId: id,
          employerId: user._id.toString(),
        },
      );

      throw error;
    }
  }

  /**
   *! Toggle Close
   */
  @Trace('jobs.close')
  async toggleClose(id: string, user: any) {
    this.logger.info('Job status toggle requested', {
      jobId: id,
      employerId: user._id.toString(),
    });

    this.traceService.setCurrentAttributes({
      'job.id': id,
      'user.id': user._id.toString(),
    });

    try {
      const job = await this.jobModel.findById(id);

      if (!job) {
        this.logger.warn('Job status update failed - job not found', {
          jobId: id,
        });

        this.traceService.addCurrentEvent(
          'Job not found',
        );

        throw new NotFoundException('Job not found');
      }

      if (job.company.toString() !== user._id.toString()) {
        this.logger.warn('Unauthorized job status update attempt', {
          jobId: id,
          employerId: user._id.toString(),
        });

        this.traceService.addCurrentEvent(
          'Job ownership verification failed',
        );

        throw new ForbiddenException('Not authorized');
      }

      this.traceService.addCurrentEvent(
        'Job ownership verified',
      );

      job.isClosed = !job.isClosed;

      this.traceService.setCurrentAttribute(
        'job.is_closed',
        job.isClosed,
      );

      await job.save();

      this.traceService.addCurrentEvent(
        'Job status updated',
      );

      await this.jobCacheService.invalidateAfterMutation(
        job._id.toString(),
        user._id.toString(),
      );

      this.traceService.addCurrentEvent(
        'Related caches invalidated',
      );

      this.logger.info('Job status updated successfully', {
        jobId: id,
        employerId: user._id.toString(),
        isClosed: job.isClosed,
      });

      return {
        message: 'Job status updated',
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to update job status',
        error,
        {
          jobId: id,
          employerId: user._id.toString(),
        },
      );

      throw error;
    }
  }

  //! Recommendation ko lagi
  async getRecommendedJobs(userId: string) {
    return this.redisService.remember(
      CacheKeys.recommendations(userId),
      async () => {
        const user = await this.userModel.findById(userId).lean();

        if (!user) {
          throw new NotFoundException('User not found');
        }

        const jobs = await this.jobModel
          .find({
            isClosed: false,
          })
          .populate('company', 'name companyName companyLogo')
          .lean();

        return jobs
          .map((job) => ({
            ...job,
            recommendationScore: calculateRecommendationScore(user, job),
          }))
          .filter((job) => job.recommendationScore >= 0.4)
          .sort((a, b) => b.recommendationScore - a.recommendationScore);
      },
      CacheTTL.RECOMMENDATIONS,
    );
  }
}
