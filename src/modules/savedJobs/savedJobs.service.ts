import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SavedJob, SavedJobDocument } from './schemas/savedJob.schema';
import { Model, Types } from 'mongoose';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { ContextLogger } from '../../common/logger/context-logger';
import { LoggerFactory } from '../../common/logger/logger.factory';
import { Trace } from '../../common/telemetry/tracing/trace.decorator';
import { TraceService } from '../../common/telemetry/tracing/trace.service';

/**
 *! Saved Jobs Service
 */
@Injectable()
export class SavedJobsService {

  private readonly logger: ContextLogger;

  //! DI
  constructor(
    @InjectModel(SavedJob.name)
    private readonly savedJobModel: Model<SavedJobDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
    private readonly traceService: TraceService,
    loggerFactory: LoggerFactory
  ) {
    this.logger =
      loggerFactory.create(
        SavedJobsService.name,
      );
  }

  /**
   *! Save a job
   */
  @Trace('savedJobs.save-job')
  async saveJob(jobId: string, userId: Types.ObjectId) {

    this.logger.info('Save job requested', {
      jobId,
      userId: userId.toString(),
    });

    this.traceService.setCurrentAttributes({
      'job.id': jobId,
      'user.id': userId.toString(),
    });

    try {
      const exists = await this.savedJobModel.findOne({
        job: jobId,
        jobseeker: userId,
      });
      if (exists) {
        this.traceService.addCurrentEvent(
          'Job already exists in saved jobs',
        );

        this.logger.warn('Job already saved', {
          jobId,
          userId: userId.toString(),
        });

        throw new BadRequestException('Job already saved');
      }

      this.traceService.addCurrentEvent(
        'Duplicate saved job check completed',
      );

      const saved = await this.savedJobModel.create({
        job: jobId,
        jobseeker: userId,
      });

      this.traceService.setCurrentAttributes({
        'savedJob.id': saved.id,
      });

      this.traceService.addCurrentEvent(
        'Job saved successfully',
      );

      this.logger.info('Job saved successfully', {
        savedJobId: saved.id,
        jobId,
        userId: userId.toString(),
      });

      return saved;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to save job',
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
   *! Unsave a job
   */
  @Trace('savedJobs.unsave-job')
  async unsaveJob(jobId: string, userId: Types.ObjectId) {
    this.logger.info('Remove saved job requested', {
      jobId,
      userId: userId.toString(),
    });

    this.traceService.setCurrentAttributes({
      'job.id': jobId,
      'user.id': userId.toString()
    })

    try {
      const deleted = await this.savedJobModel.findOneAndDelete({
        job: jobId,
        jobseeker: userId,
      });

      if (!deleted) {
        this.traceService.addCurrentEvent(
          'Saved job not found',
        );

        this.logger.warn('Saved job not found', {
          jobId,
          userId: userId.toString(),
        });

        throw new NotFoundException('Saved job not found');
      }

      this.traceService.setCurrentAttributes({
        'savedJob.id': deleted.id
      });

      this.traceService.addCurrentEvent(
        'Saved job removed successfully',
      )

      this.logger.info('Saved job removed sucessfully', {
        savedJobId: deleted.id,
        jobId,
        userId: userId.toString()
      })

      return { message: 'Job removed from saved list' };

    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to remove saved job',
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
   *!Get saved jobs for a user
  */
  @Trace('savedJobs.my-saved-jobs')
  async getMySavedJobs(userId: Types.ObjectId) {

    this.logger.info('Get saved jobs requested', {
      userId: userId.toString(),
    });

    this.traceService.setCurrentAttributes({
      'user.id': userId.toString(),
    });

    try {
      const savedJobs = await this.savedJobModel
        .find({ jobseeker: userId })
        .populate({
          path: 'job',
          populate: {
            path: 'company',
            select: 'name companyName companyLogo',
          },
        });

      this.traceService.setCurrentAttribute(
        'savedJobs.count',
        savedJobs.length,
      );

      this.traceService.addCurrentEvent(
        'Saved jobs retrieved successfully',
      );

      this.logger.info('Saved jobs retrieved successfully', {
        userId: userId.toString(),
        count: savedJobs.length,
      });

      return savedJobs;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to retrieve saved jobs',
        error,
        {
          userId: userId.toString(),
        },
      );

      throw error;
    }

  }
}
