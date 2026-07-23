import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User Name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'User email',
    example: 'johndoe@gmail.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  //! Recommendation Engine ko start
  @ApiProperty({
    example: '"React", "NestJS", "MongoDB","Docker"',
    description: 'Add list of skills',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsNumber()
  experience?: number;

  @ApiProperty({ example: 'Engineering', required: false })
  @IsOptional()
  @IsString()
  preferredCategory?: string;

  @ApiProperty({ example: 'Kathmandu, Nepal', required: false })
  @IsOptional()
  @IsString()
  preferredLocation?: string;

  //! Recommendation Engine ko end

  @ApiProperty({
    description: 'User Avatar',
    example: 'http://localhost:7000/uploads/lemon.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    description: 'User Avatar Public Wala',
    example: 'http://localhost:7000/uploads/lemon.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarPublicId?: string;

  @ApiProperty({
    description: 'User Resume',
    example: 'http://localhost:7000/uploads/lemonresume.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  resume?: string;

  @ApiProperty({
    description: 'User Resume Public Wala',
    example: 'http://localhost:7000/uploads/lemonresume.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  resumePublicId?: string;

  // employer-only fields
  @ApiProperty({
    example: 'Company Pvt. Ltd.',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({
    example: 'Company does some work',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyDescription?: string;

  @ApiProperty({
    example: 'companylogo.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyLogo?: string;

  @ApiProperty({
    example: 'companylogo.jpg',
    description: 'Provide the logo of the Company Public Wala',
  })
  @IsOptional()
  @IsString()
  companyLogoPublicId?: string;
}
