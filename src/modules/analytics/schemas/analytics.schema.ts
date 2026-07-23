import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../modules/users/schemas/user.schema';

export type AnalyticsDocument = Document & Analytics;

@Schema({ timestamps: true })
export class Analytics {
  @ApiProperty({ type: String, description: 'Employer User ID' })
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  employer!: Types.ObjectId;

  @ApiProperty({ example: 0 })
  @Prop({ default: 0 })
  totalJobsPosted!: number;

  @ApiProperty({ example: 0 })
  @Prop({ default: 0 })
  totalApplicationsReceived!: number;

  @ApiProperty({ example: 0 })
  @Prop({ default: 0 })
  totalHired!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export const AnalyticsSchema = SchemaFactory.createForClass(Analytics);

AnalyticsSchema.index({ employer: 1 });
AnalyticsSchema.index({ employer: 1, createdAt: -1 });
