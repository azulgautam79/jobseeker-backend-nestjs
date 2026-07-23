import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  _id!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;

  @ApiProperty({
    example: 'John Doe',
    description: 'Provide Username',
    required: true,
  })
  @Prop({ type: String, required: true })
  name!: string;

  //! Recommendation Engine ko start
  @ApiProperty({
    example: '"React", "NestJS", "MongoDB","Docker"',
    description: 'Add list of skills',
    required: false,
  })
  @Prop({ type: [String], default: [] })
  skills?: string[];

  @ApiProperty({ example: 3 })
  @Prop({ required: false })
  experience?: number;

  @ApiProperty({ example: 'Engineering', required: false })
  @Prop({ required: false })
  preferredCategory?: string;

  @ApiProperty({ example: 'Kathmandu, Nepal' })
  @Prop({ required: false })
  preferredLocation?: string;

  //! Recommendation Engine ko end

  @ApiProperty({
    example: 'johndoe@gmail.com',
    description: 'Provide the email of the User',
    required: true,
  })
  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  @ApiProperty({
    example: '******',
    description: 'Provide the password of the User',
    required: true,
  })
  @Prop({
    required: true,
  })
  password!: string;

  @ApiProperty({
    example: 'JOBSEEKER|EMPLOYER',
    description: 'Provide the role of the User',
    required: true,
  })
  @Prop({
    type: String,
    required: true,
    enum: Role,
    default: Role.JOBSEEKER,
  })
  role!: Role;

  @ApiProperty({
    description: 'Refresh token',
    required: false,
  })
  @Prop()
  refreshToken?: string;

  @Prop()
  refreshTokenExpiresAt!: Date;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  // @Prop()
  // emailOtp?: string;

  // @Prop()
  // emailOtpExpiresAt?: Date;

  @ApiProperty({
    example: 'janedone.jpg',
    description: 'Provide the avatar of the User',
  })
  @Prop()
  avatar?: string;

  @Prop()
  avatarPublicId?: string;

  @ApiProperty({
    example: 'janedone.jpg',
    description: 'Provide the resume of the User',
  })
  @Prop()
  resume?: string;

  @Prop()
  resumePublicId?: string;

  @ApiProperty({
    example: 'Company Name Pvt. Ltd',
    description: 'Provide the name of the company',
  })
  @Prop()
  companyName?: string;

  @ApiProperty({
    example: 'Company Description',
    description: 'Provide the Description of the company',
  })
  @Prop()
  companyDescription?: string;

  @ApiProperty({
    example: 'companylogo.jpg',
    description: 'Provide the logo of the Company',
  })
  @Prop()
  companyLogo?: string;

  @Prop()
  companyLogoPublicId?: string;

  matchPassword!: (enteredPassword: string) => Promise<boolean>;
}

export const UserSchema = SchemaFactory.createForClass(User);

//! Indexes
// role filtering
UserSchema.index({ role: 1 });

// refresh token lookup
UserSchema.index({ refreshToken: 1 });

// role + email verification queries
UserSchema.index({ role: 1, isEmailVerified: 1 });

// optional: latest users
UserSchema.index({ createdAt: -1 });
