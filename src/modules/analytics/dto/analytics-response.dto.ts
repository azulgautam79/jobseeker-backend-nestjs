import { ApiProperty } from '@nestjs/swagger';

export class TrendsDto {
  @ApiProperty({ example: 20 })
  activeJobs!: number;

  @ApiProperty({ example: 15 })
  totalApplicants!: number;

  @ApiProperty({ example: 10 })
  totalHired!: number;
}

export class CountsDto {
  @ApiProperty({ example: 5 })
  totalActiveJobs!: number;

  @ApiProperty({ example: 23 })
  totalApplications!: number;

  @ApiProperty({ example: 3 })
  totalHired!: number;

  @ApiProperty()
  trends!: TrendsDto;
}

export class RecentJobDto {
  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  isClosed!: boolean;
}

export class ApplicantInfoDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  avatar?: string;
}

export class RecentApplicationDto {
  @ApiProperty({ type: ApplicantInfoDto })
  applicant!: ApplicantInfoDto;

  @ApiProperty()
  job!: { title: string };

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class EmployerAnalyticsResponseDto {
  @ApiProperty()
  counts!: CountsDto;

  @ApiProperty()
  data!: {
    recentJobs: RecentJobDto[];
    recentApplications: RecentApplicationDto[];
  };
}
