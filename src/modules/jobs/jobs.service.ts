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
import { PinoLogger } from 'nestjs-pino';

/**
 *! Job Service
 */
@Injectable()
export class JobsService {
  //! DI
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private appModel: Model<ApplicationDocument>,
    @InjectModel(SavedJob.name) private savedJobModel: Model<SavedJobDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,

    private readonly redisService: RedisService,
    private readonly jobCacheService: JobCacheService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(JobsService.name);
  }

  //! Find All Jobs Ko Values haru
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

  private async getJobs(query: any) {
    return this.jobModel
      .find(query)
      .populate('company', 'name companyName companyLogo')
      .lean();
  }

  private async getUserContext(userId?: string) {
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

    return {
      user,
      savedIdSet,
      appliedMap,
    };
  }

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

        isRecommended: recommendationScore >= 0.4,
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
  async create(createJobDto: CreateJobDto, user: any) {
    if (user.role !== 'EMPLOYER') {
      throw new ForbiddenException('Only employers can post jobs');
    }

    const job = await this.jobModel.create({
      ...createJobDto,
      company: user._id,
    });
    this.logger.info(
      {
        employerId: user._id,
        jobId: job.id,
      },
      'Job created',
    );
    await this.jobCacheService.invalidateAfterMutation(
      job._id.toString(),
      user._id.toString(),
    );
    return job;
  }

  /**
   *! Get All Jobs with Queries
   */
  async findAll(queryDto: JobQueryDto) {
    const { page = 1, limit = 10 } = queryDto;

    const query = this.buildJobQuery(queryDto);

    const jobs = await this.getJobs(query);

    const total = jobs.length;

    const { user, savedIdSet, appliedMap } = await this.getUserContext(
      queryDto.userId,
    );

    const enrichedJobs = this.enrichJobs(jobs, user, savedIdSet, appliedMap);

    const sortedJobs = this.sortJobs(enrichedJobs);

    const startIndex = (page - 1) * limit;

    const paginatedJobs = sortedJobs.slice(startIndex, startIndex + limit);

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
  }

  /**
   *! Get All Jobs Without Queries
   */
  async findJobsWithoutFilters() {
    return this.redisService.remember(
      CacheKeys.jobs(),
      async () => {
        return this.jobModel
          .find({ isClosed: false })
          .populate('company', 'name companyName companyLogo')
          .lean();
      },
      CacheTTL.FIVE_MINUTES,
    );
  }

  /**
   *! Employer Jobs
   */
  async findEmployerJobs(user: any) {
    if (user.role !== 'EMPLOYER') {
      throw new ForbiddenException('Access denied');
    }

    return this.redisService.remember(
      CacheKeys.employerJobs(user._id.toString()),
      async () => {
        const jobs = await this.jobModel
          .find({
            company: user._id,
          })
          .populate('company', 'name companyName companyLogo')
          .lean();

        const jobIds = jobs.map((job) => job._id);

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

        const applicationCountMap = new Map(
          applicationCounts.map((item) => [item._id.toString(), item.count]),
        );

        return jobs.map((job) => ({
          ...job,
          applicationCount: applicationCountMap.get(job._id.toString()) ?? 0,
        }));
      },
      CacheTTL.FIVE_MINUTES,
    );
  }

  /**
   *! Get Job by id
   */
  async findOne(id: string, userId?: string) {
    const job = await this.redisService.remember(
      CacheKeys.job(id),
      async () => {
        const job = await this.jobModel
          .findById(id)
          .populate('company', 'name companyName companyLogo')
          .lean();

        if (!job) {
          throw new NotFoundException('Job not found');
        }

        return job;
      },
      CacheTTL.FIVE_MINUTES,
    );

    let applicationStatus: ApplicationStatus | null = null;

    if (userId && Types.ObjectId.isValid(userId)) {
      const app = await this.appModel.findOne({
        job: new Types.ObjectId(id),
        applicant: new Types.ObjectId(userId),
      });

      applicationStatus = app?.status ?? null;
    }

    return {
      ...job,
      applicationStatus,
    };
  }

  /**
   *! Update a Job
   */
  async update(id: string, dto: UpdateJobDto, user: any) {
    const job = await this.jobModel.findById(id);
    if (!job) throw new NotFoundException('Job not found');

    if (job.company.toString() !== user._id.toString()) {
      throw new ForbiddenException('Not authorized');
    }

    Object.assign(job, dto);
    await job.save();

    await this.jobCacheService.invalidateAfterMutation(
      job._id.toString(),
      user._id.toString(),
    );

    return job;
  }

  /**
   *! Delete job
   */
  async remove(id: string, user: any) {
    const job = await this.jobModel.findById(id);
    if (!job) throw new NotFoundException('Job not found');

    if (job.company.toString() !== user._id.toString()) {
      throw new ForbiddenException('Not authorized');
    }

    await job.deleteOne();

    await this.jobCacheService.invalidateAfterMutation(
      job._id.toString(),
      user._id.toString(),
    );

    return { message: 'Job deleted successfully' };
  }

  /**
   *! Toggle Close
   */
  async toggleClose(id: string, user: any) {
    const job = await this.jobModel.findById(id);
    if (!job) throw new NotFoundException('Job not found');

    if (job.company.toString() !== user._id.toString()) {
      throw new ForbiddenException('Not authorized');
    }

    job.isClosed = !job.isClosed;
    await job.save();

    await this.jobCacheService.invalidateAfterMutation(
      job._id.toString(),
      user._id.toString(),
    );

    return { message: 'Job status updated' };
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
