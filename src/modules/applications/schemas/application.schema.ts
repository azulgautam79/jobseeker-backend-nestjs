import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '../../../common/enums/applicationStatus';
import { Job } from '../../../modules/jobs/schemas/job.schema';
import { User } from '../../../modules/users/schemas/user.schema';

export type ApplicationDocument = Document & Application;

@Schema({ timestamps: true })
export class Application {
  @ApiProperty({ type: String, description: 'Job ID' })
  @Prop({ type: Types.ObjectId, ref: Job.name, required: true })
  job!: Types.ObjectId;

  @ApiProperty({ type: String, description: 'Applicant User ID' })
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  applicant!: Types.ObjectId;

  @ApiProperty({
    example: 'uploads/resume.pdf',
    description: 'Uploaded resume URL or file path',
    required: false,
  })
  @Prop()
  resume?: string;

  @ApiProperty({ enum: ApplicationStatus, default: ApplicationStatus.APPLIED })
  @Prop({
    enum: ApplicationStatus,
    default: ApplicationStatus.APPLIED,
    type: String,
  })
  status!: ApplicationStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

// prevent duplicate job applications
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// get applications of a user
ApplicationSchema.index({ applicant: 1, createdAt: -1 });

// get applicants for a job
ApplicationSchema.index({ job: 1, createdAt: -1 });

// optional: filter applications by status
ApplicationSchema.index({ job: 1, status: 1 });

ApplicationSchema.index({ job: 1 });
