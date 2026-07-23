import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Role } from '../../../common/enums/role';

export class RegisterResponseDto {
  @ApiProperty({
    example: '65c3f7a1b1a3f3c8b4d12345',
    description: 'User ID',
  })
  _id!: Types.ObjectId;

  @ApiProperty({
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    example: 'johndoe@gmail.com',
  })
  email!: string;

  @ApiProperty({
    example: 'avatar.png',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    enum: Role,
    example: Role.JOBSEEKER,
  })
  role!: Role;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  token!: string;

  @ApiProperty({
    example: 'Company Pvt. Ltd.',
    required: false,
  })
  companyName!: string;

  @ApiProperty({
    example: 'Company does some work',
    required: false,
  })
  companyDescription!: string;

  @ApiProperty({
    example: 'companylogo.png',
    required: false,
  })
  companyLogo!: string;

  @ApiProperty({
    example: 'http://localhost:7000/uploads/resume.png',
    required: false,
  })
  resume!: string;
}
