import { JobType } from '../../../common/enums/jobType';

export class ResponseCreateJobDto {
  _id!: string;
  title!: string;
  description!: string;
  requirements!: string;
  location?: string;
  category?: string;
  type!: JobType;
  company!: string;
  salaryMin?: number;
  salaryMax?: number;
  isClosed?: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
