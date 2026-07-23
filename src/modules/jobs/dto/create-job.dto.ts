import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsArray,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { JobType } from '../../../common/enums/jobType';

export function IsSalaryRangeValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSalaryRangeValid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: number, args: ValidationArguments) {
          const dto = args.object as any;

          if (dto.salaryMin == null || value == null) {
            return true;
          }

          return value >= dto.salaryMin;
        },
      },
    });
  };
}

export class CreateJobDto {
  @ApiProperty({ example: 'Frontend Developer' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Build UI for our web app' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsNumber()
  experienceRequired?: number;

  @ApiProperty({
    example: '"React", "NestJS", "MongoDB","Docker"',
    description: 'Add list of skills',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 'New York, USA' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  type!: JobType;

  @ApiPropertyOptional({ example: 50000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salaryMin?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @IsSalaryRangeValid({
    message: 'salaryMax must be greater than or equal to salaryMin',
  })
  salaryMax?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;
}
