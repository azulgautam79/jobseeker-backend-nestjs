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

/**
 *! Job Application Service
 */
@Injectable()
export class ApplicationsService {
  //! DI
  constructor(
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private readonly mailService: MailService,
  ) {}

  /**
   *! Apply to Job
   */
  async applyToJob(user: any, jobId: string, resume?: string) {
    if (user.role !== 'JOBSEEKER') {
      throw new ForbiddenException('Only jobseekers can apply');
    }

    const job = await this.jobModel.findById(jobId);

    if (!job) throw new NotFoundException('Job not found');

    if (job.isClosed) {
      throw new BadRequestException('Applications for this job are closed');
    }

    const existing = await this.applicationModel.findOne({
      job: new Types.ObjectId(jobId),
      applicant: new Types.ObjectId(user._id),
    });

    if (existing) throw new BadRequestException('Already applied to this job');

    const application = await this.applicationModel.create({
      job: new Types.ObjectId(jobId),
      applicant: new Types.ObjectId(user._id),
      resume,
    });

    return application;
  }

  /**
   *! Get My Applications
   */
  async getMyApplications(userId: Types.ObjectId) {
    return this.applicationModel
      .find({ applicant: userId })
      .populate('job', 'title company location type')
      .sort({ createdAt: -1 });
  }

  /**
   *! Get Applicants for Job
   */
  async getApplicantsForJob(jobId: string, userId: Types.ObjectId) {
    const uid =
      typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const job = await this.jobModel.findById(jobId);
    if (!job || !job.company.equals(uid)) {
      throw new ForbiddenException('Not authorized to view applicants');
    }

    const applications = await this.applicationModel
      .find({ job: new Types.ObjectId(jobId) })
      .populate('job', 'title location category type')
      .populate(
        'applicant',
        'name email avatar resume skills preferredCategory preferredLocation experience',
      );

    const result = applications.map((application) => {
      const applicant = application.applicant as any;

      const recommendationScore = calculateRecommendationScore(applicant, job);

      return {
        ...application.toObject(),
        recommendationScore,
        recommendationPercentage: Math.round(recommendationScore * 100),
      };
    });

    result.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return result;
  }

  /**
   *! Get Application By Id
   */
  async getApplicationById(applicationId: string, userId: Types.ObjectId) {
    const app = await this.applicationModel
      .findById(applicationId)
      .populate('job', 'title company')
      .populate('applicant', 'name email avatar resume');

    if (!app) throw new NotFoundException('Application not found');

    const job = app.job as unknown as {
      _id: Types.ObjectId;
      title: string;
      company: Types.ObjectId;
    };
    const applicant = app.applicant as unknown as { _id: Types.ObjectId };

    const isOwner =
      applicant._id.toString() === userId.toString() ||
      job.company.toString() === userId.toString();

    if (!isOwner)
      throw new ForbiddenException('Not authorized to view this application');

    return app;
  }

  /**
   *! Update Status
   */
  async updateStatus(
    applicationId: string,
    userId: Types.ObjectId,
    status: ApplicationStatus,
  ) {
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

    if (!app) throw new NotFoundException('Application not found');

    if (app.status === ApplicationStatus.REJECTED) {
      throw new BadRequestException('Cannot update rejected application');
    }

    // Tell TypeScript the shape of populated job

    const job = app.job as any;
    const applicant = app.applicant as any;
    const companyName = job.company?.companyName || 'the company'; // fallback

    if (job.company._id.toString() !== userId.toString()) {
      throw new ForbiddenException('Not authorized to update this application');
    }

    app.status = status;
    await app.save();

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

    await this.mailService.sendMail(applicant.email, subject, message, message);

    return { message: 'Application status updated', status };
  }
}
