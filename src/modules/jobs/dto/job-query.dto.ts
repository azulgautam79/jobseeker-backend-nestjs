import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsMongoId,
} from 'class-validator';
import { JobType } from '../../../common/enums/jobType';

export class JobQueryDto {
  @ApiPropertyOptional({
    description: 'Search by job title',
    example: 'Frontend Developer',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Filter by job location',
    example: 'Kathmandu',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Job category',
    example: 'IT',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Job type',
    enum: JobType,
    example: JobType.FULL_TIME,
  })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptional({
    description: 'Minimum salary',
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minSalary?: number;

  @ApiPropertyOptional({
    description: 'Maximum salary',
    example: 150000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxSalary?: number;

  @ApiPropertyOptional({
    description: 'Logged-in jobseeker ID (to check saved/applied jobs)',
    example: '66b9d4e0c8c3c2f1a9b12345',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of jobs per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}
