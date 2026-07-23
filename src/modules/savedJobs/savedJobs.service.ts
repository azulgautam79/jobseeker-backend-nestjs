import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SavedJob, SavedJobDocument } from './schemas/savedJob.schema';
import { Model, Types } from 'mongoose';
import { Job, JobDocument } from '../jobs/schemas/job.schema';

/**
 *! Saved Jobs Service
 */
@Injectable()
export class SavedJobsService {
  //! DI
  constructor(
    @InjectModel(SavedJob.name)
    private readonly savedJobModel: Model<SavedJobDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
  ) {}

  /**
   *! Save a job
   */
  async saveJob(jobId: string, userId: Types.ObjectId) {
    const exists = await this.savedJobModel.findOne({
      job: jobId,
      jobseeker: userId,
    });
    if (exists) throw new BadRequestException('Job already saved');

    const saved = await this.savedJobModel.create({
      job: jobId,
      jobseeker: userId,
    });
    return saved;
  }

  /**
   *! Unsave a job
   */
  async unsaveJob(jobId: string, userId: Types.ObjectId) {
    const deleted = await this.savedJobModel.findOneAndDelete({
      job: jobId,
      jobseeker: userId,
    });
    if (!deleted) throw new NotFoundException('Saved job not found');
    return { message: 'Job removed from saved list' };
  }

  //! Get saved jobs for a user
  async getMySavedJobs(userId: Types.ObjectId) {
    return this.savedJobModel.find({ jobseeker: userId }).populate({
      path: 'job',
      populate: { path: 'company', select: 'name companyName companyLogo' },
    });
  }
}
