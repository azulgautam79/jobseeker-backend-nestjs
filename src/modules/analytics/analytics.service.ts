import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { Model, Types } from 'mongoose';
import {
  Application,
  ApplicationDocument,
} from '../applications/schemas/application.schema';
import { EmployerAnalyticsResponseDto } from './dto/analytics-response.dto';
import { getTrend } from '../../common/utils/trends.util';
import { LoggerService } from '../../common/logger/logger.service';
import { trace, SpanStatusCode } from '@opentelemetry/api';

interface PopulatedApplicant {
  name: string;
  email: string;
  avatar?: string;
}
interface PopulatedJob {
  title: string;
}

/**
 *! Analytics API Controller
 */
@Injectable()
export class AnalyticsService {
  private readonly tracer = trace.getTracer('analytics-service');

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AnalyticsService.name);
  }

  /**
   *! Employer analytics
   */
  async getEmployerAnalytics(
    userId: Types.ObjectId,
    role: string,
  ): Promise<EmployerAnalyticsResponseDto> {
    return this.tracer.startActiveSpan(
      'analytics.employer.get',
      async (span) => {
        const started = Date.now();

        try {
          this.logger.info('Employer analytics started', {
            userId: userId.toString(),
            role,
          });

          span.setAttribute('analytics.user_id', userId.toString());

          span.setAttribute('analytics.role', role);

          if (role !== 'EMPLOYER') {
            this.logger.warn('Unauthorized analytics access attempt', {
              userId: userId.toString(),
              role,
            });

            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: 'Forbidden access',
            });

            throw new ForbiddenException('Access denied');
          }

          const now = new Date();

          const last7Days = new Date();
          last7Days.setDate(now.getDate() - 7);

          const prev7Days = new Date();
          prev7Days.setDate(now.getDate() - 14);

          /**
           * COUNTS
           */
          const countSpan = this.tracer.startSpan('analytics.database.counts');

          const totalActiveJobs = await this.jobModel.countDocuments({
            company: userId,
            isClosed: false,
          });

          const jobs = await this.jobModel
            .find({ company: userId })
            .select('_id')
            .lean();

          const jobIds = jobs.map((job) => job._id);

          const totalApplications = await this.applicationModel.countDocuments({
            job: { $in: jobIds },
          });

          const totalHired = await this.applicationModel.countDocuments({
            job: { $in: jobIds },
            status: 'Accepted',
          });

          countSpan.setAttribute('jobs.count', totalActiveJobs);

          countSpan.setAttribute('applications.count', totalApplications);

          countSpan.setAttribute('hired.count', totalHired);

          countSpan.end();

          this.logger.debug('Analytics counts calculated', {
            totalActiveJobs,
            totalApplications,
            totalHired,
          });

          /**
           * TRENDS
           */
          const trendSpan = this.tracer.startSpan('analytics.trends.calculate');

          const countInPeriod = async (
            model: Model<any>,
            filter: Record<string, any>,
            start: Date,
            end: Date,
          ) =>
            model.countDocuments({
              ...filter,
              createdAt: {
                $gte: start,
                $lte: end,
              },
            });

          const activeJobsLast7 = await countInPeriod(
            this.jobModel,
            { company: userId },
            last7Days,
            now,
          );

          const activeJobsPrev7 = await countInPeriod(
            this.jobModel,
            { company: userId },
            prev7Days,
            last7Days,
          );

          const applicationsLast7 = await countInPeriod(
            this.applicationModel,
            { job: { $in: jobIds } },
            last7Days,
            now,
          );

          const applicationsPrev7 = await countInPeriod(
            this.applicationModel,
            { job: { $in: jobIds } },
            prev7Days,
            last7Days,
          );

          const hiredLast7 = await countInPeriod(
            this.applicationModel,
            {
              job: { $in: jobIds },
              status: 'Accepted',
            },
            last7Days,
            now,
          );

          const hiredPrev7 = await countInPeriod(
            this.applicationModel,
            {
              job: { $in: jobIds },
              status: 'Accepted',
            },
            prev7Days,
            last7Days,
          );

          const activeJobTrend = getTrend(activeJobsLast7, activeJobsPrev7);

          const applicantTrend = getTrend(applicationsLast7, applicationsPrev7);

          const hiredTrend = getTrend(hiredLast7, hiredPrev7);

          trendSpan.setAttribute('trend.jobs_last_7_days', activeJobsLast7);

          trendSpan.setAttribute(
            'trend.applications_last_7_days',
            applicationsLast7,
          );

          trendSpan.setAttribute('trend.hired_last_7_days', hiredLast7);

          trendSpan.end();

          /**
           * RECENT DATA
           */
          const recentSpan = this.tracer.startSpan('analytics.recent.data');

          const recentJobs = await this.jobModel
            .find({ company: userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title location type createdAt isClosed')
            .lean();

          const recentApplications = (await this.applicationModel
            .find({ job: { $in: jobIds } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('applicant', 'name email avatar')
            .populate('job', 'title')
            .lean()) as unknown as Array<{
            applicant: {
              name: string;
              email: string;
              avatar?: string;
            };
            job: {
              title: string;
            };
            status: string;
            createdAt: Date;
          }>;

          const recentApplicationsDto = recentApplications.map((app) => ({
            applicant: {
              name: app.applicant.name,
              email: app.applicant.email,
              avatar: app.applicant.avatar,
            },
            job: {
              title: app.job.title,
            },
            status: app.status,
            createdAt: app.createdAt,
          }));

          recentSpan.setAttribute('recent.jobs.count', recentJobs.length);

          recentSpan.setAttribute(
            'recent.applications.count',
            recentApplications.length,
          );

          recentSpan.end();

          const duration = Date.now() - started;

          this.logger.info('Employer analytics completed', {
            durationMs: duration,
            totalActiveJobs,
            totalApplications,
            totalHired,
          });

          span.setAttribute('analytics.duration_ms', duration);

          span.setStatus({
            code: SpanStatusCode.OK,
          });

          return {
            counts: {
              totalActiveJobs,
              totalApplications,
              totalHired,
              trends: {
                activeJobs: activeJobTrend,
                totalApplicants: applicantTrend,
                totalHired: hiredTrend,
              },
            },
            data: {
              recentJobs,
              recentApplications: recentApplicationsDto,
            },
          };
        } catch (error) {
          this.logger.error('Employer analytics failed', error, {
            userId: userId.toString(),
          });

          span.recordException(error as Error);

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });

          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
