import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
// import { User } from 'src/modules/users/schemas/user.schema';
import { User } from '../../../modules/users/schemas/user.schema';
import { Job } from '../../../modules/jobs/schemas/job.schema';

export type SavedJobDocument = Document & SavedJob;

@Schema({ timestamps: true })
export class SavedJob {
  @ApiProperty({ type: String, description: 'Jobseeker User ID' })
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  jobseeker!: Types.ObjectId;

  @ApiProperty({ type: String, description: 'Job ID' })
  @Prop({ type: Types.ObjectId, ref: Job.name, required: true })
  job!: Types.ObjectId;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export const SavedJobSchema = SchemaFactory.createForClass(SavedJob);

SavedJobSchema.index({ jobseeker: 1, job: 1 }, { unique: true });
SavedJobSchema.index({ jobseeker: 1, createdAt: -1 });
