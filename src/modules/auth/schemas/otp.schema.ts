import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true })
  otp!: string; // hashed OTP

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['VERIFY_EMAIL', 'FORGOT_PASSWORD'],
    required: true,
  })
  type!: string;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
