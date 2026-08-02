import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Application, ApplicationDocument } from './schemas/application.schema';
import { Model, Types } from 'mongoose';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { ApplicationStatus } from '../../common/enums/applicationStatus';
import { MailService } from '../mail/mail.service';
import { calculateRecommendationScore } from '../../common/utils/calculateRecommendationScore';
import { RedisService } from '../redis/redis.service';
import { CacheKeys } from '../../common/cache/cache.keys';
import { CacheTTL } from '../../common/cache/cache.ttl';
import { JobCacheService } from '../jobs/job-cache.service';
import { ContextLogger } from '../../common/logger/context-logger';
import { TraceService } from '../../common/telemetry/tracing/trace.service';
import { LoggerFactory } from '../../common/logger/logger.factory';
import { Trace } from '../../common/telemetry/tracing/trace.decorator';
import { PrometheusService } from '../../common/prometheus/prometheus.service';

/**
 *! Job Application Service
 */
@Injectable()
export class ApplicationsService {

  private readonly logger: ContextLogger;

  //! DI
  constructor(
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
    private readonly traceService: TraceService,
    private readonly prometheusService: PrometheusService,
    loggerFactory: LoggerFactory
  ) {
    this.logger =
      loggerFactory.create(
        ApplicationsService.name,
      );
  }

  /**
   *! Apply to Job
   */
  @Trace('applications.apply')
  async applyToJob(user: any, jobId: string, resume?: string) {

    this.logger.info('Job application requested', { userId: user._id.toString(), jobId });
    this.traceService.setCurrentAttributes({
      'user.id': user._id.toString(),
      'user.role': user.role,
      'job.id': jobId,
    });

    try {
      if (user.role !== 'JOBSEEKER') {
        this.traceService.addCurrentEvent('User not a jobseeker')
        this.logger.warn('Job application failed - invalid role', {
          userId: user._id.toString(),
          role: user.role
        });
        throw new ForbiddenException('Only jobseekers can apply');
      }

      const job = await this.jobModel.findById(jobId);

      if (!job) {
        this.traceService.addCurrentEvent(
          'Job not found',
        );

        this.logger.warn(
          'Job application failed - job not found',
          {
            userId: user._id.toString(),
            jobId,
          },
        );

        throw new NotFoundException('Job not found');
      }

      this.traceService.setCurrentAttribute(
        'company.id',
        job.company.toString(),
      );

      if (job.isClosed) {
        this.traceService.addCurrentEvent(
          'Job is closed',
        );

        this.logger.warn(
          'Job application failed - job closed',
          {
            userId: user._id.toString(),
            jobId,
          },
        );

        throw new BadRequestException(
          'Applications for this job are closed',
        );
      }

      const existing = await this.applicationModel.findOne({
        job: new Types.ObjectId(jobId),
        applicant: new Types.ObjectId(user._id),
      });

      if (existing) {
        this.traceService.addCurrentEvent(
          'Duplicate application detected',
        );

        this.logger.warn(
          'Job application failed - already applied',
          {
            userId: user._id.toString(),
            jobId,
          },
        );

        throw new BadRequestException(
          'Already applied to this job',
        );
      }

      const application = await this.applicationModel.create({
        job: new Types.ObjectId(jobId),
        applicant: new Types.ObjectId(user._id),
        resume,
      });

      this.prometheusService.applicationsSubmitted.labels(application.status.toString()).inc();
      this.traceService.setCurrentAttribute(
        'application.id',
        application.id,
      );

      this.traceService.addCurrentEvent(
        'Application created',
      );

      // Invalidate employer's cached jobs
      await this.redisService.del(
        CacheKeys.employerJobs(job.company.toString()),
      );
      await this.redisService.del(
        CacheKeys.myApplications(user._id.toString()),
      );

      this.traceService.addCurrentEvent(
        'User Application & Employer jobs cache invalidated',
      );

      this.logger.info(
        'Job application submitted successfully',
        {
          applicationId: application.id,
          jobId,
          userId: user._id.toString(),
        },
      );

      return application;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to apply to job',
        error,
        {
          userId: user._id.toString(),
          jobId,
        },
      );

      throw error;
    }
  }

  /**
   *! Get My Applications
   */
  @Trace('applications.get-my-applications')
  async getMyApplications(userId: Types.ObjectId) {
    this.logger.info('Fetching user applications', {
      userId: userId.toString(),
    });

    this.traceService.setCurrentAttributes({
      'user.id': userId.toString(),
    });

    try {
      const applications = await this.redisService.remember(
        CacheKeys.myApplications(userId.toString()),
        async () => {
          this.traceService.addCurrentEvent(
            'Loading applications from MongoDB',
          );

          return this.applicationModel
            .find({ applicant: userId })
            .populate('job', 'title company location type')
            .sort({ createdAt: -1 });
        },
        300, // 5 minutes
      );

      this.traceService.setCurrentAttribute(
        'applications.count',
        applications.length,
      );

      this.logger.info('User applications fetched successfully', {
        userId: userId.toString(),
        count: applications.length,
      });

      return applications;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to fetch user applications',
        error,
        {
          userId: userId.toString(),
        },
      );

      throw error;
    }
  }

  /**
   *! Get Applicants for Job
   */
  @Trace('applications.get-application-job')
  async getApplicantsForJob(jobId: string, userId: Types.ObjectId) {

    this.logger.info('Fetching applicants for job', {
      jobId,
      userId: userId.toString(),
    });

    this.traceService.setCurrentAttributes({
      'job.id': jobId,
      'user.id': userId.toString(),
    });

    try {
      const uid = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
      const job = await this.jobModel.findById(jobId);
      if (!job || !job.company.equals(uid)) {
        this.logger.warn(
          'Unauthorized attempt to view applicants',
          {
            jobId,
            userId: userId.toString(),
          },
        );

        this.traceService.addCurrentEvent(
          'Applicant access denied',
        );

        throw new ForbiddenException(
          'Not authorized to view applicants',
        );
      }
      this.traceService.addCurrentEvent(
        'Employer authorization successful',
      );

      const applications = await this.applicationModel
        .find({ job: new Types.ObjectId(jobId) })
        .populate('job', 'title location category type')
        .populate(
          'applicant',
          'name email avatar resume skills preferredCategory preferredLocation experience',
        );

      this.traceService.setCurrentAttribute(
        'applications.count',
        applications.length,
      );

      this.traceService.addCurrentEvent(
        'Recommendation scoring started',
      );

      const result = await this.traceService.withSpan(
        'recommendation.calculate',
        {
          'job.id': jobId,
          'applications.count': applications.length,
        },
        () => {
          const scored = applications.map((application) => {
            const applicant = application.applicant as any;

            const recommendationScore =
              calculateRecommendationScore(applicant, job);

            return {
              ...application.toObject(),
              recommendationScore,
              recommendationPercentage: Math.round(
                recommendationScore * 100,
              ),
            };
          });

          scored.sort(
            (a, b) =>
              b.recommendationScore - a.recommendationScore,
          );

          return scored;
        },
      );

      this.traceService.addCurrentEvent(
        'Recommendation scoring completed',
      );

      this.logger.info(
        'Applicants fetched successfully',
        {
          jobId,
          employerId: userId.toString(),
          applicants: result.length,
        },
      );

      return result;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to fetch applicants',
        error,
        {
          jobId,
          userId: userId.toString(),
        },
      );

      throw error;
    }
  }

  /**
   *! Get Application By Id
   */
  @Trace('applications.get-by-id')
  async getApplicationById(applicationId: string, userId: Types.ObjectId) {

    this.logger.info('Fetching application', { applicationId, userId: userId.toString() });
    this.traceService.setCurrentAttributes({
      'application.id': applicationId,
      'user.id': userId.toString()
    })

    try {
      const app = await this.applicationModel
        .findById(applicationId)
        .populate('job', 'title company')
        .populate('applicant', 'name email avatar resume');

      if (!app) {
        this.logger.warn('Application not found', { applicationId });
        this.traceService.addCurrentEvent('Application not found');
        throw new NotFoundException('Application not found');
      }
      this.traceService.addCurrentEvent('Application loaded');

      const job = app.job as unknown as {
        _id: Types.ObjectId;
        title: string;
        company: Types.ObjectId;
      };
      const applicant = app.applicant as unknown as { _id: Types.ObjectId };

      const isOwner =
        applicant._id.toString() === userId.toString() ||
        job.company.toString() === userId.toString();

      if (!isOwner) {
        this.logger.warn('Unauthorized application access', {
          applicationId,
          userId: userId.toString()
        })
        this.traceService.addCurrentEvent('Application access denied');
        throw new ForbiddenException('Not authorized to view this application');
      }
      this.traceService.addCurrentEvent('Application access granted');
      this.logger.info('Application fetched successfully', {
        applicationId,
        userId: userId.toString()
      })

      return app;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to fetch application',
        error,
        {
          applicationId,
          userId: userId.toString(),
        },
      );

      throw error;
    }
  }

  /**
   *! Update Status
   */
  @Trace('applications.update-status')
  async updateStatus(
    applicationId: string,
    userId: Types.ObjectId,
    status: ApplicationStatus,
  ) {
    this.logger.info('Updating application status', {
      applicationId,
      userId: userId.toString(),
      status,
    });

    this.traceService.setCurrentAttributes({
      'application.id': applicationId,
      'user.id': userId.toString(),
      'application.status': status,
    });

    try {
      const app = await this.applicationModel
        .findById(applicationId)
        .populate({
          path: 'job',
          select: 'title company', // select the fields from job
          populate: {
            path: 'company',
            select: 'companyName', // select only companyName from the company
          },
        })
        .populate('applicant', 'name email'); // applicant fields

      if (!app) {
        this.logger.warn('Application not found', {
          applicationId,
        });

        this.traceService.addCurrentEvent(
          'Application not found',
        );

        throw new NotFoundException('Application not found');
      }

      this.traceService.addCurrentEvent(
        'Application loaded',
      );

      if (app.status === ApplicationStatus.REJECTED) {
        this.logger.warn(
          'Rejected application cannot be updated',
          {
            applicationId,
          },
        );

        this.traceService.addCurrentEvent(
          'Rejected application update attempted',
        );

        throw new BadRequestException(
          'Cannot update rejected application',
        );
      }

      const job = app.job as any;
      const applicant = app.applicant as any;
      const companyName = job.company?.companyName || 'the company'; // fallback

      if (job.company._id.toString() !== userId.toString()) {
        this.logger.warn(
          'Unauthorized application update',
          {
            applicationId,
            userId: userId.toString(),
          },
        );

        this.traceService.addCurrentEvent(
          'Application update denied',
        );

        throw new ForbiddenException(
          'Not authorized to update this application',
        );
      }

      this.traceService.addCurrentEvent(
        'Employer authorization successful',
      );

      app.status = status;
      await app.save();

      await Promise.all([
        this.redisService.del(
          CacheKeys.myApplications(app.applicant.toString()),
        ),
        this.redisService.del(
          CacheKeys.jobApplicants(job._id.toString()),
        ),
      ]);

      this.traceService.addCurrentEvent(
        'Application status updated',
      );

      this.logger.info(
        'Application status updated',
        {
          applicationId,
          status,
        },
      );

      const companyLogo = 'https://i.imgur.com/3KcynwC.png';
      const primaryColor = '#165ffc'; // your color

      const subject = `Your application for "${job.title}" has been ${status.toLowerCase()}`;

      const message = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <!-- Header with logo -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${companyLogo}" alt="Company Logo" style="width: 120px; height: auto;" />
          </div>

          <!-- Greeting -->
          <p style="font-size: 16px;">Hi <strong>${applicant.name}</strong>,</p>

          <!-- Main message -->
          <p style="font-size: 16px;">
            Your application for the job 
            "<strong>${job.title}</strong>" at 
            "<strong>${companyName}</strong>" has been 
            <span style="color: ${primaryColor}; font-weight: bold;">${status}</span>.
          </p>

          <!-- Optional extra message -->
          <p style="font-size: 16px;">
            Thank you for using our platform. We wish you the best in your job search!
          </p>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            This email was sent by <strong>Job Seeker Pvt. Ltd.</strong>. Please do not reply directly to this email.
          </p>
        </div>
      `;

      await this.traceService.withSpan(
        'mail.send-application-status',
        {
          'mail.recipient': applicant.email,
          'application.id': applicationId,
        },
        () =>
          this.mailService.sendMail(
            applicant.email,
            subject,
            message,
            message,
          ),
      );

      this.traceService.addCurrentEvent(
        'Application status email sent',
      );

      this.logger.info(
        'Application status notification sent',
        {
          applicationId,
          email: applicant.email,
        },
      );

      return { message: 'Application status updated', status };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to update application status',
        error,
        {
          applicationId,
          userId: userId.toString(),
          status,
        },
      );

      throw error;
    }
  }
}
